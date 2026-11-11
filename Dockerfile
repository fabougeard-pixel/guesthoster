FROM dunglas/frankenphp:php8.5-bookworm

ENV DEBIAN_FRONTEND=noninteractive \
    COMPOSER_ALLOW_SUPERUSER=1 \
    XDG_DATA_HOME=/tmp/caddy-data \
    XDG_CONFIG_HOME=/tmp/caddy-config

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl git unzip gnupg \
    && install-php-extensions pdo_pgsql pgsql pdo_mysql gd intl bcmath pcntl zip opcache \
    && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app

COPY composer.json composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist --no-interaction

COPY . .

RUN composer dump-autoload --optimize --no-interaction \
    && php artisan package:discover --ansi \
    && NODE_ENV=development npm ci --no-audit --no-fund \
    && APP_ENV=local APP_KEY=base64:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA= DB_CONNECTION=sqlite DB_DATABASE=:memory: SESSION_DRIVER=array CACHE_STORE=array npm run build \
    && rm -rf node_modules

RUN sed -i 's/\r$//' /app/deploy/docker-entrypoint.sh \
    && chmod +x /app/deploy/docker-entrypoint.sh \
    && chmod -R 775 /app/storage /app/bootstrap/cache

ENV APP_ENV=production \
    LOG_CHANNEL=stderr \
    VIEW_COMPILED_PATH=/tmp/storage/framework/views \
    SERVER_NAME=:80

EXPOSE 80

ENTRYPOINT ["/app/deploy/docker-entrypoint.sh"]
CMD ["frankenphp", "run", "--config", "/app/Caddyfile", "--adapter", "caddyfile"]
