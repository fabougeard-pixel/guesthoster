#!/usr/bin/env bash
#
# ============================================================================
#  GuestHoster — ajout du site sur le VPS Hostinger
# ============================================================================
#
#  Usage (depuis le poste de dev) :
#
#    ssh-keygen -t ed25519 -f ~/.ssh/guesthoster_vps -C guesthoster@vps   # une fois
#    scp deploy/provision.sh <hote-ssh-admin>:/tmp/
#    ssh <hote-ssh-admin> "sudo DEPLOY_PUBKEY='$(cat ~/.ssh/guesthoster_vps.pub)' \
#        bash /tmp/provision.sh guesthoster.example.com contact@example.com"
#    git remote add prod guesthoster@<ip-du-vps>:guesthoster.git
#    git push prod main                      # premier déploiement
#    ssh guesthoster@<ip-du-vps> "cd /var/www/guesthoster && php artisan users:create-admin moi@example.com"
#
#  Le script est ADDITIF et IDEMPOTENT. Le VPS héberge déjà d'autres sites
#  en production : la pile globale (Ubuntu 26.04, NGINX, PHP 8.5-FPM,
#  MySQL 8.4, Node 22, Certbot) est supposée en place, rien n'est installé
#  globalement et aucun voisin n'est modifié :
#    • utilisateur système, pool PHP-FPM et socket dédiés ;
#    • php8.5-fpm est RECHARGÉ (SIGUSR2), jamais redémarré ;
#    • ports locaux propres : 13716 (rendu serveur), 8095 (Reverb) — les
#      voisins tiennent 13714 et 13715.
#
#  Déploiement : `git push prod main` déclenche le hook post-receive écrit
#  plus bas (maintenance, composer, build client + SSR, migrations, caches,
#  redémarrage des trois services).
#
#  APP_ENV vaut `staging` par défaut : démo non indexée (robots.txt interdit
#  tout), logements et comptes hôte/voyageur de démo. AUCUN admin de démo :
#  le créer avec `users:create-admin`. Pour ouvrir : APP_ENV=production dans
#  le .env, puis `php artisan config:cache` (les dépendances de dev, utiles au
#  seul seeder de démo, disparaissent au déploiement suivant).
#
set -euo pipefail

DOMAIN="${1:?Usage : provision.sh <domaine> [e-mail Lets Encrypt]}"
LETSENCRYPT_EMAIL="${2:-}"
DEPLOY_PUBKEY="${DEPLOY_PUBKEY:?DEPLOY_PUBKEY doit contenir la clé publique SSH de déploiement}"
APP_ENV_VALUE="${APP_ENV_VALUE:-staging}"

SITE_SLUG="guesthoster"
DEPLOY_USER="guesthoster"
APP_DB_NAME="guesthoster"
APP_DB_USER="guesthoster"
PHP_VERSION="8.5"
TIMEZONE="Europe/Paris"
WORKTREE="/var/www/${SITE_SLUG}"
DEPLOY_BRANCH="main"
SSR_PORT="13716"
REVERB_PORT="8095"

REPO="/home/${DEPLOY_USER}/${SITE_SLUG}.git"
PHP_BIN="/usr/bin/php${PHP_VERSION}"
FPM_SERVICE="php${PHP_VERSION}-fpm"
POOL_SOCK="/run/php/${SITE_SLUG}.sock"
QUEUE_SERVICE="${SITE_SLUG}-queue.service"
SSR_SERVICE="${SITE_SLUG}-ssr.service"
REVERB_SERVICE="${SITE_SLUG}-reverb.service"

export DEBIAN_FRONTEND=noninteractive

log()  { printf '\n\033[1;36m▶ %s\033[0m\n' "$*"; }
ok()   { printf '  \033[1;32m✓\033[0m %s\n' "$*"; }
warn() { printf '  \033[1;33m! %s\033[0m\n' "$*"; }
die()  { printf '\n\033[1;31m✗ %s\033[0m\n' "$*" >&2; exit 1; }
random_alnum() { openssl rand -base64 48 | tr -dc 'A-Za-z0-9' | head -c "$1"; }

# Remplace les marqueurs __XXX__ des gabarits écrits avec des heredocs quotés.
render() {
  sed -i \
    -e "s|__DOMAIN__|${DOMAIN}|g" \
    -e "s|__WORKTREE__|${WORKTREE}|g" \
    -e "s|__USER__|${DEPLOY_USER}|g" \
    -e "s|__PHP__|${PHP_BIN}|g" \
    -e "s|__FPM__|${FPM_SERVICE}|g" \
    -e "s|__POOLSOCK__|${POOL_SOCK}|g" \
    -e "s|__REPO__|${REPO}|g" \
    -e "s|__BRANCH__|${DEPLOY_BRANCH}|g" \
    -e "s|__SLUG__|${SITE_SLUG}|g" \
    -e "s|__QUEUE__|${QUEUE_SERVICE}|g" \
    -e "s|__SSR__|${SSR_SERVICE}|g" \
    -e "s|__REVERB__|${REVERB_SERVICE}|g" \
    -e "s|__SSRPORT__|${SSR_PORT}|g" \
    -e "s|__REVERBPORT__|${REVERB_PORT}|g" \
    "$1"
}

# ── Pré-vérifications ───────────────────────────────────────────────────────
log "Pré-vérifications"
[ "$(id -u)" -eq 0 ] || die "Ce script doit être lancé en root (sudo)."
case "$DOMAIN" in *[!a-z0-9.-]*|"") die "Domaine invalide : ${DOMAIN}" ;; esac
case "$APP_ENV_VALUE" in staging|production) ;; *) die "APP_ENV_VALUE doit valoir staging ou production." ;; esac
command -v "$PHP_BIN" >/dev/null || die "${PHP_BIN} introuvable."
for bin in composer node npm mysql nginx git openssl; do
  command -v "$bin" >/dev/null || die "${bin} introuvable : pile globale incomplète."
done
"$PHP_BIN" -r 'exit(function_exists("imagewebp") ? 0 : 1);' || die "GD sans WebP : les photos ne pourraient pas être traitées."
for ext in pdo_mysql intl bcmath pcntl zip; do
  "$PHP_BIN" -m | grep -qi "^${ext}$" || die "Extension PHP manquante : ${ext}"
done
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
[ "$NODE_MAJOR" -ge 22 ] || die "Node ${NODE_MAJOR} trop ancien (22 requis)."

for pair in "${SSR_PORT}:${SSR_SERVICE}" "${REVERB_PORT}:${REVERB_SERVICE}"; do
  port="${pair%%:*}"; unit="${pair#*:}"
  if systemctl is-active --quiet "$unit" 2>/dev/null; then
    ok "Port ${port} tenu par ${unit} (réexécution)"
  elif ss -ltn | grep -q ":${port} "; then
    die "Le port ${port} est déjà pris par un autre service."
  else
    ok "Port ${port} libre"
  fi
done

# ── MySQL ───────────────────────────────────────────────────────────────────
log "MySQL — base et utilisateur ${APP_DB_NAME}"
if [ -f "$WORKTREE/.env" ] && grep -q '^DB_PASSWORD=' "$WORKTREE/.env"; then
  APP_DB_PASSWORD="$(grep '^DB_PASSWORD=' "$WORKTREE/.env" | head -1 | cut -d= -f2-)"
  ok "Mot de passe repris du .env existant"
else
  APP_DB_PASSWORD="$(random_alnum 24)"
  ok "Mot de passe généré"
fi
mysql --protocol=socket -uroot <<SQL
CREATE DATABASE IF NOT EXISTS \`${APP_DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${APP_DB_USER}'@'127.0.0.1' IDENTIFIED BY '${APP_DB_PASSWORD}';
ALTER USER '${APP_DB_USER}'@'127.0.0.1' IDENTIFIED BY '${APP_DB_PASSWORD}';
CREATE USER IF NOT EXISTS '${APP_DB_USER}'@'localhost' IDENTIFIED BY '${APP_DB_PASSWORD}';
ALTER USER '${APP_DB_USER}'@'localhost' IDENTIFIED BY '${APP_DB_PASSWORD}';
GRANT ALL PRIVILEGES ON \`${APP_DB_NAME}\`.* TO '${APP_DB_USER}'@'127.0.0.1';
GRANT ALL PRIVILEGES ON \`${APP_DB_NAME}\`.* TO '${APP_DB_USER}'@'localhost';
FLUSH PRIVILEGES;
SQL
ok "Base prête"

# ── Utilisateur de déploiement ──────────────────────────────────────────────
log "Utilisateur ${DEPLOY_USER}"
id -u "$DEPLOY_USER" >/dev/null 2>&1 || adduser --disabled-password --gecos "" "$DEPLOY_USER"
install -d -o "$DEPLOY_USER" -g "$DEPLOY_USER" -m 700 "/home/${DEPLOY_USER}/.ssh"
AUTH="/home/${DEPLOY_USER}/.ssh/authorized_keys"
touch "$AUTH"
grep -qF "$DEPLOY_PUBKEY" "$AUTH" || echo "$DEPLOY_PUBKEY" >> "$AUTH"
chown "$DEPLOY_USER:$DEPLOY_USER" "$AUTH"; chmod 600 "$AUTH"

# Le hook ne peut agir que sur SES services et recharger FPM, rien d'autre.
SUDOERS="/etc/sudoers.d/${SITE_SLUG}-deploy"
cat > "${SUDOERS}.tmp" <<EOF
${DEPLOY_USER} ALL=(root) NOPASSWD: /usr/bin/systemctl reload ${FPM_SERVICE}, /usr/bin/systemctl restart ${QUEUE_SERVICE}, /usr/bin/systemctl restart ${SSR_SERVICE}, /usr/bin/systemctl restart ${REVERB_SERVICE}
EOF
visudo -cf "${SUDOERS}.tmp" >/dev/null || die "Règle sudoers invalide."
install -m 0440 "${SUDOERS}.tmp" "$SUDOERS"; rm -f "${SUDOERS}.tmp"
ok "Utilisateur, clé SSH et sudoers restreint en place"

# ── PHP-FPM ─────────────────────────────────────────────────────────────────
log "Pool PHP-FPM ${POOL_SOCK}"
cat > "/etc/php/${PHP_VERSION}/fpm/pool.d/${SITE_SLUG}.conf" <<'EOF'
[__SLUG__]
user = __USER__
group = __USER__
listen = __POOLSOCK__
listen.owner = www-data
listen.group = www-data
listen.mode = 0660
pm = dynamic
pm.max_children = 8
pm.start_servers = 2
pm.min_spare_servers = 1
pm.max_spare_servers = 3
pm.max_requests = 500
php_admin_value[memory_limit] = 256M
; Photos de logements : jusqu'à 10 Mo par fichier (règle de validation),
; plusieurs par envoi. Posé ici pour ne pas toucher au php.ini partagé.
php_admin_value[upload_max_filesize] = 12M
php_admin_value[post_max_size] = 64M
catch_workers_output = yes
EOF
render "/etc/php/${PHP_VERSION}/fpm/pool.d/${SITE_SLUG}.conf"
"/usr/sbin/php-fpm${PHP_VERSION}" -t >/dev/null 2>&1 || die "Configuration PHP-FPM invalide."
systemctl reload "$FPM_SERVICE"
ok "Pool chargé (voisins intacts)"

# ── Dépôt bare + hook ───────────────────────────────────────────────────────
log "Dépôt ${REPO} et hook post-receive"
[ -d "$REPO" ] || git init --bare -b "$DEPLOY_BRANCH" "$REPO" >/dev/null
cat > "$REPO/hooks/post-receive" <<'HOOK'
#!/usr/bin/env bash
#
# Déploiement de GuestHoster, déclenché par `git push prod main`.
# Écrit par deploy/provision.sh — ne pas éditer à la main sur le serveur.
#
set -euo pipefail
export PATH="/usr/local/bin:/usr/bin:/bin"

BRANCH="__BRANCH__"
WORKTREE="__WORKTREE__"
GITDIR="__REPO__"
PHP="__PHP__"
unset GIT_DIR

while read -r _oldrev newrev ref; do
  if [ "$ref" != "refs/heads/${BRANCH}" ]; then
    echo "→ ${ref} ignorée (seule ${BRANCH} est déployée)."
    continue
  fi
  echo "→ Déploiement de ${BRANCH} @ ${newrev:0:8}"
  cd "$WORKTREE"

  # Maintenance AVANT le checkout, avec la version en place : entre le
  # checkout et la fin de composer, index.php chargerait un vendor périmé.
  trap '"$PHP" artisan up >/dev/null 2>&1 || true' ERR
  if [ -f artisan ] && [ -f vendor/autoload.php ]; then
    "$PHP" artisan down --retry=15 >/dev/null 2>&1 || true
  fi

  git --git-dir="$GITDIR" --work-tree="$WORKTREE" checkout -f "$BRANCH"

  # En staging, le seeder de démo a besoin de Faker (dépendance de dev).
  if grep -q '^APP_ENV=production' .env; then
    composer install --no-dev --optimize-autoloader --no-interaction
  else
    composer install --optimize-autoloader --no-interaction
  fi
  "$PHP" artisan down --retry=15 --render="errors::503" >/dev/null 2>&1 || true

  # Build client ET bundle SSR (dont le port est lu dans INERTIA_SSR_PORT).
  # Les variables VITE_REVERB_* du .env sont figées dans le bundle client.
  npm ci --include=dev --no-audit --no-fund
  npm run build:ssr

  "$PHP" artisan storage:link --force >/dev/null 2>&1 || true
  "$PHP" artisan migrate --force --no-interaction

  # Référentiels (et démo hors production) UNIQUEMENT sur une base vierge.
  COUNTRIES="$("$PHP" artisan tinker --execute 'echo (int) \App\Models\Country::query()->count();' 2>/dev/null | tr -dc '0-9')"
  if [ "$COUNTRIES" = "0" ]; then
    echo "→ Base vierge : amorçage…"
    "$PHP" artisan db:seed --force --no-interaction
  fi

  # optimize:clear après les migrations : le cache est en base.
  "$PHP" artisan optimize:clear
  "$PHP" artisan optimize

  sudo /usr/bin/systemctl reload __FPM__ || true
  # Les trois processus longs gardent l'ancien code en mémoire.
  sudo /usr/bin/systemctl restart __QUEUE__ || true
  sudo /usr/bin/systemctl restart __SSR__ || true
  sudo /usr/bin/systemctl restart __REVERB__ || true

  "$PHP" artisan up >/dev/null 2>&1 || true
  trap - ERR
  echo "✅ Déploiement terminé : ${newrev:0:8}"
done
HOOK
render "$REPO/hooks/post-receive"
chmod +x "$REPO/hooks/post-receive"
chown -R "$DEPLOY_USER:$DEPLOY_USER" "$REPO"
ok "Hook en place"

# ── Arbre de travail + .env ─────────────────────────────────────────────────
log "Arbre de travail ${WORKTREE} et .env"
install -d -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$WORKTREE"
if [ ! -f "$WORKTREE/.env" ]; then
  cat > "$WORKTREE/.env" <<EOF
APP_NAME=GuestHoster
# staging = démo non indexée (robots.txt « Disallow: / »). Ouverture :
# APP_ENV=production puis php artisan config:cache.
APP_ENV=${APP_ENV_VALUE}
APP_KEY=base64:$(openssl rand -base64 32)
APP_DEBUG=false
APP_TIMEZONE=${TIMEZONE}
APP_URL=https://${DOMAIN}
APP_LOCALE=fr
APP_FALLBACK_LOCALE=en
APP_FAKER_LOCALE=fr_FR
APP_MAINTENANCE_DRIVER=file
BCRYPT_ROUNDS=12

LOG_CHANNEL=daily
LOG_LEVEL=warning

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=${APP_DB_NAME}
DB_USERNAME=${APP_DB_USER}
DB_PASSWORD=${APP_DB_PASSWORD}

SESSION_DRIVER=database
SESSION_LIFETIME=120
SESSION_ENCRYPT=false
SESSION_PATH=/
SESSION_DOMAIN=null
SESSION_SECURE_COOKIE=true
CACHE_STORE=database
QUEUE_CONNECTION=database
FILESYSTEM_DISK=local

# ── Rendu serveur (service ${SSR_SERVICE}) ──
INERTIA_SSR_ENABLED=true
INERTIA_SSR_PORT=${SSR_PORT}
INERTIA_SSR_URL=http://127.0.0.1:${SSR_PORT}

# ── Temps réel (service ${REVERB_SERVICE}) ──
# Reverb n'écoute qu'en local ; NGINX lui relaie /app et /apps en wss.
# Laravel publie directement en local, le navigateur passe par le domaine.
BROADCAST_CONNECTION=reverb
REVERB_APP_ID=$(shuf -i 100000-999999 -n 1)
REVERB_APP_KEY=$(random_alnum 20 | tr 'A-Z' 'a-z')
REVERB_APP_SECRET=$(random_alnum 32)
REVERB_HOST=127.0.0.1
REVERB_PORT=${REVERB_PORT}
REVERB_SCHEME=http
REVERB_SERVER_HOST=127.0.0.1
REVERB_SERVER_PORT=${REVERB_PORT}
VITE_REVERB_APP_KEY="\${REVERB_APP_KEY}"
VITE_REVERB_HOST=${DOMAIN}
VITE_REVERB_PORT=443
VITE_REVERB_SCHEME=https
VITE_APP_NAME="\${APP_NAME}"

# ── Courriel ── 'log' : écrit dans storage/logs. SMTP Hostinger plus tard :
# MAIL_MAILER=smtp MAIL_SCHEME=smtps MAIL_HOST=smtp.hostinger.com MAIL_PORT=465
# MAIL_USERNAME=… MAIL_PASSWORD=…  puis php artisan config:cache
MAIL_MAILER=log
MAIL_FROM_ADDRESS=noreply@${DOMAIN}
MAIL_FROM_NAME="\${APP_NAME}"

# ── Paiement ── sans clé, le bouton « Payer » affiche une erreur propre.
STRIPE_KEY=
STRIPE_SECRET=
STRIPE_WEBHOOK_SECRET=
STRIPE_CURRENCY=eur

BOOKING_SERVICE_FEE_RATE=0.10
BOOKING_HOST_RESPONSE_HOURS=48
BOOKING_INSTANT_PAYMENT_MINUTES=60
BOOKING_APPROVED_PAYMENT_HOURS=24
BOOKING_FULL_REFUND_DAYS=7
BOOKING_LATE_REFUND_RATE=0.5
BOOKING_REVIEW_WINDOW_DAYS=30
EOF
  chown "$DEPLOY_USER:$DEPLOY_USER" "$WORKTREE/.env"
  chmod 600 "$WORKTREE/.env"
  ok ".env généré (APP_KEY et secrets Reverb frais)"
else
  warn ".env déjà présent : laissé intact"
fi

# ── NGINX ───────────────────────────────────────────────────────────────────
log "NGINX ${DOMAIN}"
VHOST="/etc/nginx/sites-available/${SITE_SLUG}"
if [ -f "$VHOST" ] && grep -qE '^\s*listen\s+443' "$VHOST" && [ "${FORCE_VHOST:-0}" != "1" ]; then
  warn "Vhost déjà certifié : laissé intact (FORCE_VHOST=1 pour le réécrire)"
else
  [ -f "$VHOST" ] && cp -a "$VHOST" "${VHOST}.avant-$(date +%Y%m%d%H%M%S)"
  cat > "$VHOST" <<'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name __DOMAIN__;
    root __WORKTREE__/public;
    index index.php;
    charset utf-8;

    # Aligné sur post_max_size du pool (envoi de plusieurs photos).
    client_max_body_size 64M;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    # Court tant que le renouvellement Certbot n'a pas fait ses preuves.
    add_header Strict-Transport-Security "max-age=86400" always;

    gzip on;
    gzip_comp_level 5;
    gzip_types text/plain text/css application/javascript application/json image/svg+xml application/xml;

    location ^~ /build/   { expires 365d; access_log off; }
    location ^~ /storage/ { expires 30d;  access_log off; }
    location = /favicon.ico { access_log off; log_not_found off; }

    # Engendrés par l'application (APP_URL, environnement, catalogue).
    location = /robots.txt  { access_log off; try_files $uri /index.php?$query_string; }
    location = /sitemap.xml { try_files $uri /index.php?$query_string; }

    # WebSocket Reverb (navigateur) et API HTTP de Reverb.
    location ~ ^/apps?/ {
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_read_timeout 120s;
        proxy_pass http://127.0.0.1:__REVERBPORT__;
    }

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        try_files $uri =404;
        fastcgi_split_path_info ^(.+\.php)(/.+)$;
        fastcgi_pass unix:__POOLSOCK__;
        fastcgi_index index.php;
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        fastcgi_param DOCUMENT_ROOT $realpath_root;
        fastcgi_param HTTPS $https if_not_empty;
        fastcgi_hide_header X-Powered-By;
        fastcgi_read_timeout 60s;
    }

    location ~ /\.(?!well-known).* { deny all; }

    error_log  /var/log/nginx/__SLUG__.error.log;
    access_log /var/log/nginx/__SLUG__.access.log;
}
EOF
  render "$VHOST"
  ln -sf "$VHOST" "/etc/nginx/sites-enabled/${SITE_SLUG}"
  nginx -t
  systemctl reload nginx
  ok "Vhost actif (voisins intacts)"
fi

# ── Services systemd ────────────────────────────────────────────────────────
log "Services systemd"
cat > "/etc/systemd/system/${QUEUE_SERVICE}" <<'EOF'
[Unit]
Description=GuestHoster — worker de file d'attente (e-mails, notifications, photos)
After=network.target mysql.service
StartLimitIntervalSec=0

[Service]
User=__USER__
Group=__USER__
WorkingDirectory=__WORKTREE__
ExecStart=__PHP__ artisan queue:work --sleep=3 --tries=3 --max-time=3600 --backoff=10 --memory=256
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF
cat > "/etc/systemd/system/${SSR_SERVICE}" <<'EOF'
[Unit]
Description=GuestHoster — rendu serveur Inertia (port __SSRPORT__)
After=network.target
StartLimitIntervalSec=0

[Service]
User=__USER__
Group=__USER__
WorkingDirectory=__WORKTREE__
ExecStart=__PHP__ artisan inertia:start-ssr
Restart=always
RestartSec=3
MemoryMax=768M

[Install]
WantedBy=multi-user.target
EOF
cat > "/etc/systemd/system/${REVERB_SERVICE}" <<'EOF'
[Unit]
Description=GuestHoster — serveur WebSocket Reverb (127.0.0.1:__REVERBPORT__)
After=network.target
StartLimitIntervalSec=0

[Service]
User=__USER__
Group=__USER__
WorkingDirectory=__WORKTREE__
ExecStart=__PHP__ artisan reverb:start
Restart=always
RestartSec=3
LimitNOFILE=10000

[Install]
WantedBy=multi-user.target
EOF
for unit in "$QUEUE_SERVICE" "$SSR_SERVICE" "$REVERB_SERVICE"; do
  render "/etc/systemd/system/${unit}"
done
systemctl daemon-reload
# Activés au démarrage, mais lancés seulement une fois le code présent.
systemctl enable "$QUEUE_SERVICE" "$SSR_SERVICE" "$REVERB_SERVICE" >/dev/null 2>&1
if [ -f "$WORKTREE/vendor/autoload.php" ]; then
  systemctl restart "$QUEUE_SERVICE" "$SSR_SERVICE" "$REVERB_SERVICE"
  ok "Services redémarrés"
else
  ok "Services activés (ils démarreront au premier git push)"
fi

# ── Planificateur ───────────────────────────────────────────────────────────
log "Cron du planificateur"
cat > "/etc/cron.d/${SITE_SLUG}" <<EOF
# Planificateur Laravel de GuestHoster : expiration des demandes et des
# paiements (5 min), fin des séjours + demande d'avis (horaire), purge des
# notifications lues (quotidienne). Sans cette ligne, les dates restent bloquées.
* * * * * ${DEPLOY_USER} cd ${WORKTREE} && ${PHP_BIN} artisan schedule:run >> ${WORKTREE}/storage/logs/scheduler.log 2>&1
EOF
chmod 644 "/etc/cron.d/${SITE_SLUG}"
ok "Cron posé"

# ── TLS ─────────────────────────────────────────────────────────────────────
log "Certificat TLS"
SERVER_IP="$(curl -4 -s --max-time 5 https://api.ipify.org || true)"
DOMAIN_IP="$(getent ahostsv4 "$DOMAIN" | awk 'NR==1{print $1}')"
if grep -qE '^\s*listen\s+443' "$VHOST"; then
  ok "Déjà en HTTPS"
elif [ -n "$SERVER_IP" ] && [ "$SERVER_IP" = "$DOMAIN_IP" ]; then
  if [ -n "$LETSENCRYPT_EMAIL" ]; then
    certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$LETSENCRYPT_EMAIL" --redirect
  else
    certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email --redirect
  fi
  ok "HTTPS actif"
else
  warn "${DOMAIN} pointe vers '${DOMAIN_IP:-rien}', pas vers ce serveur (${SERVER_IP:-?})."
  warn "Relancer ce script une fois le DNS propagé pour obtenir le certificat."
fi

log "Terminé"
echo "  Prochaines étapes (poste de dev) :"
echo "    git remote add prod ${DEPLOY_USER}@<ip>:${SITE_SLUG}.git && git push prod ${DEPLOY_BRANCH}"
echo "    ssh ${DEPLOY_USER}@<ip> 'cd ${WORKTREE} && php artisan users:create-admin <e-mail>'"
