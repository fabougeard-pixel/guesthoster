# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Les règles Laravel Boost (conventions PHP, Inertia v3, Wayfinder, Pint, Pest, skills à activer) sont dans `AGENTS.md` et s'appliquent intégralement ici. Ce fichier ne les répète pas.

## Contexte du projet

**GUESTHOSTER** est une plateforme de location de logements type Airbnb, avec trois rôles : **admin** (back-office), **host** (gère ses logements et les réservations reçues) et **client** (recherche, réserve, suit ses réservations, discute avec l'hôte).

Cette application est une **refonte complète** d'une ancienne version (Laravel 12, SPA Vue 3, API REST avec Sanctum, Filament, Cashier, Pusher). L'ancienne version n'est pas dans ce dépôt ; ses défauts à ne pas reproduire sont listés plus bas. Stack actuelle : Laravel 13, PHP 8.5, Inertia v3 + React 19 + TypeScript, Tailwind v4, Wayfinder, Pest, Larastan niveau 7. Le README décrit l'installation et l'état d'avancement.

La nouvelle version remplace la SPA Vue + API JSON par des **pages Inertia React rendues côté serveur** (contrôleurs `Inertia::render`, Form Requests, Policies, routes Wayfinder). Ajouter un package (Filament, Cashier, Reverb, Fortify…) est un changement de dépendances, donc il faut l'accord de l'utilisateur au préalable (cf. AGENTS.md).

## Commandes

```bash
composer setup            # install complète : composer, .env, key, migrate, npm install, build
composer dev              # php artisan dev (serveur + vite + queue + logs)
npm run dev / npm run build

php artisan test --compact                         # tests Pest
php artisan test --compact tests/Feature/FooTest.php
php artisan test --compact --filter="nom du test"

vendor/bin/pint --dirty --format agent             # format PHP (obligatoire après modif PHP)
composer types:check                               # phpstan (larastan niveau 7) : app, config, database, routes
npm run check          # vite-plus : lint (oxlint typeAware, warnings = erreurs) + format
npm run check:fix
npm run types:check    # tsc --noEmit

composer test          # config:clear + pint --test + phpstan + tests
composer ci:check      # npm check + tsc + composer test (= pipeline GitHub Actions)
```

- La CI (`.github/workflows/tests.yml`) exécute `composer setup` puis `composer ci:check` sous PHP 8.5 / Node 22 : pint, phpstan, oxlint et tsc doivent tous passer.
- Les tests utilisent SQLite `:memory:` (`phpunit.xml`), et `RefreshDatabase` est appliqué automatiquement aux tests `Feature` (`tests/Pest.php`). En local, la base est MySQL (`guesthoster`).
- `vite` est un alias vers `@voidzero-dev/vite-plus-core` : la config lint et format se trouve dans `vite.config.ts` (blocs `lint` / `fmt`), pas dans un fichier eslint ou prettier.

## Architecture (nouvelle app)

- **Routing/middleware** : `bootstrap/app.php` (pas de Kernel). `HandleInertiaRequests` partage `name` et `auth.user`. Les requêtes `api/*` ou `expectsJson` reçoivent les exceptions au format JSON.
- **Pages** : `resources/js/pages/*.tsx`, résolues automatiquement par le plugin `@inertiajs/vite` (`app.tsx` n'a pas de `resolve`). Une route simple s'écrit `Route::inertia('/', 'home')`.
- **Wayfinder** : `resources/js/actions/`, `resources/js/routes/` et `resources/js/wayfinder/` sont **générés** par le plugin Vite (`formVariants: true`). Ne pas les éditer à la main ; les importer pour les URLs et les formulaires.
- **React Compiler** activé via babel (`reactCompilerPreset`) : éviter la mémoïsation manuelle inutile.
- Helper `cn()` dans `resources/js/lib/utils.ts` (clsx + tailwind-merge). Les composants `resources/js/components/ui/*` sont exclus du lint et du format (convention shadcn).
- Le répertoire `.ai/rules` n'existe pas pour l'instant.
- **Layouts** : choisis dans `createInertiaApp({ layout })` (`app.tsx`) d'après le préfixe du nom de page : `auth/*` → `AuthLayout`, `settings/*` → `[PublicLayout, SettingsLayout]`, `host/*` → `[PublicLayout, HostLayout]`, `admin/*` → `[PublicLayout, AdminLayout]`, sinon `PublicLayout`. `HostLayout` et `AdminLayout` reposent sur `SectionLayout` (`components/section-nav.tsx`).
- **Composants maison** dans `resources/js/components/*.tsx` (pas dans `ui/`, qui est exclu du lint) : `Button` / `buttonClasses()` (à réutiliser sur un `<Link>`), `Input`, `Textarea`, `Label`, `InputError`, `Card`, `Container`, `Badge`, `Modal` (`<dialog>` natif), `Toaster`, `AppLogo`, et dans `form.tsx` : `Field` (libellé + contrôle + erreur), `Checkbox`, `Alert`. Pour les écrans : `AuthCard`, `SectionCard`, `UserMenu`.
- **Notifications** : côté serveur, `Inertia::flash('toast', ['type' => 'success|error|info', 'message' => '…'])` ; le `Toaster` du layout les affiche. Le typage se trouve dans `types/flash.ts` et `types/global.d.ts`.
- **Pages d'erreur** : quand `app.debug` vaut false, `AppServiceProvider::configureErrorPages()` rend les erreurs 403, 404, 419, 429, 500 et 503 avec la page Inertia `error`.
- **Données partagées** : `auth.user` n'expose qu'une liste blanche d'attributs (`HandleInertiaRequests`). Il faut l'étendre explicitement si besoin.
- **Langue** : l'app est en français (`APP_LOCALE=fr`) ; les traductions sont dans `lang/fr/*.php`. Pour un nouveau champ de formulaire, ajouter son libellé dans `validation.attributes`.
- **Thème** : les tokens `primary-*` (orange, 500 = `#F35B04`) et `secondary-*` (violet, 800 = `#3A0CA3`) sont dans `app.css`. Pour du texte blanc sur fond orange, utiliser `primary-600` ou plus foncé (contraste AA). Le mode sombre suit la préférence système (variante `dark:` par défaut).

## Authentification et rôles

- **Fortify** (`config/fortify.php`) n'active que `registration`, `resetPasswords` et `emailVerification` ; `home` vaut `/`. Toutes les vues sont rendues en Inertia dans `FortifyServiceProvider::configureViews()` (pages `auth/*`). Les passkeys et la 2FA sont désactivées et leurs migrations ont été retirées. Pour les réactiver, publier `fortify-migrations`, et prévoir une dépendance npm pour les passkeys.
- Le profil et le mot de passe **n'utilisent pas** les actions Fortify : ils passent par `Settings\ProfileController` et `Settings\PasswordController`, avec Form Requests, dans `routes/settings.php`. Les routes du mot de passe s'appellent `user-password.*`, car `password.update` est déjà pris par la réinitialisation Fortify.
- **Rôles** : enum `App\Enums\UserRole` (`Client`, `Host`, `Admin`) dans la colonne `users.role`. `role` **n'est pas fillable** : utiliser `forceFill` ou `promoteToHost()`. À l'inscription, seuls `UserRole::registrable()` (client, host) sont acceptés. Middleware `role:host,admin` (`EnsureUserHasRole`). Factory : états `host()`, `admin()`, `unverified()`.
- `User` implémente `MustVerifyEmail` : protéger avec `verified` les actions qui l'exigent (ex. devenir hôte). Les e-mails d'auth sont traduits via `lang/fr.json`.
- Seeder : comptes de démo `admin@`, `hote@` et `voyageur@guesthoster.test` (mot de passe `password`).

## Modèle de données (nouvelle app)

- Tables : `countries` → `cities` → `properties` (host = `user_id`, relation `owner` ; le pays se déduit de la ville ; type = `property_type_id`, relation `propertyType`). Autour du logement : `property_types` (référentiel géré par l'admin, voir Administration), `property_images` (triées par `position`, `coverImage`), `amenities` (pivot `amenity_property`, catégories `AmenityCategory`), `blocked_periods` et `bookings` (client = `user_id`, relation `guest`).
- **Montants en centimes** (entiers) : `price_per_night`, `cleaning_fee`, `service_fee`, `total_price`. Les prix d'une réservation sont figés à sa création. La mise en forme (€) se fait à l'affichage.
- **Périodes semi-ouvertes `[début, fin)`** : `check_out` et `ends_on` sont exclusifs. Utiliser les scopes `overlapping($in, $out)` de `Booking` et `BlockedPeriod`, et `Property::isAvailableBetween()`. Ces colonnes utilisent le cast `App\Casts\DateOnly`, qui stocke `Y-m-d` quel que soit le driver. Ne pas le remplacer par `date` : sous SQLite, ce cast stocke `Y-m-d H:i:s` et fausse les comparaisons.
- **Enums avec transitions** (`allowedTransitions()` / `canTransitionTo()`) :
  - `PropertyStatus` : draft → pending → published | rejected, puis archived. Seul `published` est visible au catalogue (scope `published()`).
  - `BookingStatus` : en mode `request`, pending → awaiting_payment → confirmed ; en mode `instant`, on démarre directement à awaiting_payment. Les statuts declined, cancelled, expired et completed sont finaux. `BookingStatus::blocking()` liste les statuts qui bloquent les dates. Changer de statut via `$booking->transitionTo()`, qui lève `InvalidStatusTransition`.
  - `BookingMode` (instant ou request) est choisi par le host pour chaque logement et recopié sur la réservation.
  - Les enums exposent `label()` (en français) et `options()` (`HasOptions`, au format `{value, label}`) pour le front.
- Clés de route : `Property` par `slug` (généré à la création, puis stable), `Booking` par `reference` (`GH-XXXXXXXX`).
- Champs non fillable, à poser via `forceFill` dans les actions : `status`, `user_id`, `slug` et les dates de modération pour `Property` ; les prix, le statut et le mode pour `Booking`.
- `Model::shouldBeStrict()` est actif hors production : pas de lazy loading, donc toujours faire `with()` / `load()`.
- `PropertyImage::$path` est un chemin sur le disque `public` ; l'accesseur `url` gère aussi les URL absolues de démo (picsum).
- Seeders : `CountryCitySeeder`, `AmenitySeeder` et `PropertyTypeSeeder` (Appartement, Maison, Gîte, Studio, Chambre, Villa ; `firstOrCreate`, donc un type renommé par l'admin n'est pas écrasé) sont des données de référence idempotentes. `DemoSeeder` (hors production) crée des hosts, des logements avec photos et équipements, des réservations et des blocages. Le `DatabaseSeeder` garde les événements de modèle actifs (slug, référence).

## Catalogue public

- Routes : `/` (`HomeController`), `/logements` (`properties.index`), `/logements/{slug}` (`properties.show`), `/sitemap.xml`.
- **Recherche** : `PropertySearchRequest` valide les filtres de l'URL (`destination`, `check_in`/`check_out`, `guests`, `price_min`/`price_max` **en euros**, `types[]`, `amenities[]` par slug, `instant`, `sort`). `filters()` les normalise et `App\Queries\PropertySearch` construit la requête. En cas d'erreur de validation, l'utilisateur est redirigé vers le catalogue sans filtres plutôt que vers « back », car revenir à la même URL ferait une boucle.
- Les résultats utilisent `Inertia::scroll` (12 par page) avec `<InfiniteScroll onlyNext itemsElement={ref}>`. Pour changer de filtres côté front, appeler `router.get(index.url(), cleanQuery(...), { preserveState: true, reset: ['properties'] })` : `cleanQuery()` (dans `search-bar.tsx`) retire les valeurs vides et la valeur par défaut. Les listes d'options utilisent `Inertia::once`.
- **Fiche logement** : `PropertyPolicy::view` (publié, sinon visible seulement par le host propriétaire ou un admin) avec `abort_unless(..., 404)`. Ne jamais renvoyer 403, pour ne pas révéler qu'un brouillon existe. `PropertyDetailResource` **n'expose pas l'adresse** : seulement une position arrondie à environ 1 km (carte OSM en iframe). `unavailableRanges` regroupe les réservations bloquantes et les périodes bloquées à venir.
- Ces ressources exigent la relation `propertyType` chargée. Les ressources (`PropertyCardResource`, `PropertyDetailResource`) se passent avec `->resolve()` pour les props simples, ou telles quelles dans `Inertia::scroll`. Les relations attendues sont indiquées dans leur docblock.
- **Front** :
  - `lib/format.ts` : `formatPrice(centimes)`, `plural()` (règle française : 0 et 1 au singulier), et des dates « AAAA-MM-JJ » calculées en UTC (`parseDate`, `addDays`, `diffInDays`, `formatDate`), pour éviter les décalages entre SSR et navigateur.
  - Composants : `SearchBar`, `PropertyCard` / `PropertyCardSkeleton` (note et cœur favori), `RatingSummary` / `Stars` / `StarInput` (`star-rating.tsx`), `ReviewCard`, et `AvailabilityCalendar` (sélection arrivée/départ, nuits occupées désactivées, durée min/max ; il sera réutilisé pour la réservation).
  - Types dans `types/catalog.ts`.
- **SEO** : balises `<Head>` avec `head-key` (description, canonical, og:*). Le SSR passe par `@inertiajs/vite`, qui réutilise `app.tsx` : `npm run build:ssr`, puis `php artisan inertia:start-ssr`. Les composants ne doivent pas accéder à `window` pendant le rendu.

## Espace hôte

- Routes dans `routes/host.php` : préfixe `/hote`, noms `host.*`, middlewares `auth`, `verified` et `role:host,admin`. Les routes d'un logement passent par `can:update,property` (propriétaire ou admin) et `scopeBindings()` : `{image}` et `{blockedPeriod}` doivent appartenir au logement, sinon 404.
- **Formulaire par étapes** (`PropertyFormStep` : details, location, capacity, amenities, pricing, photos) :
  - `store` crée un brouillon à partir de la seule étape details ; `city_id` et `address` restent nullable tant que le logement est en brouillon.
  - Chaque étape est enregistrée par `PATCH /hote/logements/{slug}/{step}`. `UpdatePropertyRequest` choisit ses règles d'après le paramètre `step` de la route, et `propertyAttributes()` convertit en centimes les prix saisis en euros.
  - La page est `host/properties/edit` ; les champs sont dans `components/host/property-fields.tsx`.
- **Statut côté hôte** (`PropertyStatusController`) : envoyer en validation (`submit`), retirer, archiver, restaurer, tous via `Property::transitionTo()`. `submit` exige `missingRequirements() === []` (ville et adresse, prix, au moins `Property::MIN_PHOTOS` photos traitées) ; sinon il renvoie vers la première étape incomplète. La publication et le refus relèvent de l'admin (voir Administration). Un logement publié reste modifiable sans repasser en validation.
- **Suppression** : `PropertyPolicy::delete` n'autorise que les logements jamais réservés. Les autres doivent être archivés.
- **Photos** :
  - L'original est stocké sur le disque `local` (`property-uploads/`) et le job en file d'attente `ProcessPropertyImage` (Intervention Image **v4**, driver GD) produit `properties/{id}/{uuid}.webp` (1600 px) et `-thumb.webp` (640 px) sur le disque `public`. Il supprime l'original et renseigne `processed_at`. En cas d'échec, la photo est supprimée.
  - Le catalogue n'affiche que les photos traitées (`processed()` ; `coverImage` filtre aussi) ; les cartes utilisent `thumbnail_url`.
  - Supprimer une `PropertyImage` supprime ses fichiers (événement `deleted`), et supprimer un `Property` supprime ses photos une par une.
  - Côté front, `PhotoManager` lance `usePoll` tant qu'une photo est en traitement.
  - En local, il faut un worker (`composer dev` lance la queue) et `php artisan storage:link`.
- **Calendrier** (`host/properties/calendar`) : on bloque des dates en sélectionnant une plage dans `AvailabilityCalendar`. `StoreBlockedPeriodRequest` refuse le passé, ainsi que tout chevauchement avec une réservation bloquante ou un blocage existant.

## Réservations

- **Parcours voyageur** :
  - La fiche logement mène à `GET /logements/{slug}/reserver` (`bookings.create`, sous `auth` et `verified` : la redirection vers la connexion garde l'URL « intended ») avec `?check_in&check_out&guests`.
  - Cette page affiche le devis calculé par le serveur.
  - Puis `POST` (`bookings.store`, limité à 10 par minute) mène à `/reservations/{reference}` (`bookings.show`). La liste des séjours est sur `/voyages` (`bookings.index`).
  - `StoreBookingRequest` sert au GET comme au POST ; en cas d'erreur, il redirige vers la fiche logement.
- **Parcours hôte** : `/hote/reservations?filtre=demandes|a-venir|historique` (`Inertia::scroll`) ; `host.bookings.approve` et `host.bookings.decline`.
- **Logique métier dans `App\Actions\Bookings`** : `CreateBooking`, `ApproveBooking`, `DeclineBooking` et `CancelBooking`. Ne pas la dupliquer dans les contrôleurs.
  - `CreateBooking` verrouille la ligne du logement (`lockForUpdate`) dans une transaction, puis contrôle : logement publié, réservation de son propre logement interdite, capacité, nuits min/max, disponibilité. Les erreurs remontent en `ValidationException` sur `check_in`, `check_out` ou `guests`.
  - SQLite ignore `lockForUpdate` : seul MySQL protège réellement contre la concurrence.
- **Prix** : `App\Pricing\PricingCalculator` est la seule source de vérité. Il calcule nuits × prix + ménage, puis les frais de service (`config('booking.service_fee_rate')`, injectés via `#[Config]`). Il renvoie un `BookingQuote`, en centimes. La fiche logement reçoit `serviceFeeRate` pour l'estimation affichée côté client.
- **Délais** (`config/booking.php`, variables `BOOKING_*`) : une demande expire après `host_response_hours` ; un paiement après `instant_payment_minutes` (réservation instantanée) ou `approved_payment_hours` (demande acceptée). Ces délais ne dépassent jamais le jour d'arrivée (`CreateBooking::deadline`).
- **Commandes planifiées** (`routes/console.php`) : `bookings:expire` (toutes les 5 min) expire les réservations `pending` ou `awaiting_payment` échues ; `bookings:complete` (toutes les heures) passe en `completed` les séjours confirmés dont le départ est passé. En production, il faut le cron `schedule:run`.
- **`BookingPolicy`** :
  - `view` : le voyageur, le host du logement ou un admin.
  - `respond` : le host ou un admin, sur une demande `pending`.
  - `cancel` : toute partie, tant que l'annulation est permise et que `check_in` est dans le futur.
- **`BookingResource`** :
  - adapte la vue à l'utilisateur (`viewer` : guest ou host) et expose `can.respond` et `can.cancel` ;
  - ne donne l'adresse exacte au voyageur qu'une fois le séjour `confirmed` ou `completed`.
- **Notifications** (`app/Notifications/Booking*`) : envoyées par e-mail, en file d'attente, avec `afterCommit()` :
  - `BookingRequested` → host ;
  - `BookingAwaitingPayment`, `BookingDeclined` et `BookingExpired` → voyageur ;
  - `BookingCancelled` → les parties qui n'ont pas annulé.
- Composants front : `PriceBreakdown`, `BookingSummary`, `BookingStatusBadge`, `BookingResponse` (accepter, ou refuser avec un motif). Types dans `types/booking.ts`.

## Paiement (Stripe)

- Seul le SDK `stripe/stripe-php` (v22) est utilisé, sans Cashier, via l'interface `App\Payments\PaymentGateway` (`createCheckout`, `findPaidCheckout`, `refund`), liée à `StripePaymentGateway` dans `AppServiceProvider`. Configuration dans `config/services.php` (`stripe.*`, variables `STRIPE_*`). Sans `STRIPE_SECRET`, la passerelle lève `PaymentUnavailable`, que les contrôleurs transforment en toast d'erreur.
- **Parcours** :
  1. `POST /reservations/{ref}/paiement` (`bookings.payment.store`, policy `pay` : le voyageur, statut `awaiting_payment`, avant l'échéance) crée une session Stripe Checkout hébergée, puis renvoie `Inertia::location($url)`.
  2. Au retour, `GET …/paiement/retour?session_id=` relit la session pour confirmer sans attendre le webhook.
  3. Le webhook `POST /stripe/webhook` (exclu du CSRF dans `bootstrap/app.php`) vérifie la signature avec `Webhook::constructEvent`. Chaque événement n'est traité qu'une fois, grâce à la table `stripe_events`.
- **`ConfirmBookingPayment`** est appelé par le retour et par le webhook ; il est idempotent sur `stripe_payment_intent_id`. Il verrouille la réservation et la passe en `confirmed`, puis envoie `BookingConfirmed` au voyageur et au host. Un paiement qui arrive alors que la réservation n'est plus `awaiting_payment` (expirée, annulée), ou dont le montant diffère, est **remboursé intégralement** et donne lieu à `BookingPaymentRefunded`.
- **Remboursements** : `App\Payments\RefundPolicy` (`config/booking.php` : `full_refund_days`, `late_refund_rate`).
  - Annulation par le host ou un admin : remboursement intégral. Annulation par le voyageur : intégral jusqu'à J-7, sinon 50 %.
  - `CancelBooking` rembourse **avant** de changer le statut. Si Stripe échoue, la réservation reste intacte.
  - Champs de suivi : `refunded_amount`, `stripe_refund_id`, `refunded_at`.
  - `BookingResource` expose `refund_if_cancelled` (montant pour l'utilisateur courant), `refund_policy` et `can.pay`.
- Front : `PayButton` et `PaymentPoller` dans `pages/bookings/show.tsx`. `usePoll` tourne tant que la réservation est `awaiting_payment`.
- **Tests** : `fakePayments()` (dans `tests/Pest.php`) remplace la passerelle par `Tests\Fakes\FakePaymentGateway`. `postStripeWebhook()` et `checkoutCompletedEvent()` envoient de vrais événements signés.
- **En local** : `stripe listen --forward-to <url>/stripe/webhook` fournit le `STRIPE_WEBHOOK_SECRET`. Le reversement aux hosts (Stripe Connect) n'est pas implémenté.

## Messagerie temps réel

- Une conversation par réservation (table `messages` : `booking_id`, `user_id` = expéditeur, `body`, `read_at`), réservée au voyageur et au host (`BookingPolicy::message` ; les admins n'y participent pas). Routes : `/messages` (boîte de réception), `/messages/{reference}` (GET : affiche la conversation et marque les messages reçus comme lus ; POST : envoie, limité à 30 par minute).
- **Reverb** (`install:broadcasting --reverb`) :
  - Canaux privés dans `routes/channels.php` : `bookings.{booking}` (liaison par `reference`, réservé aux parties de la réservation) et `App.Models.User.{id}`.
  - Événements `MessageSent` (`.message.sent`, diffusé sur la conversation et sur le canal du destinataire) et `MessagesRead` (`.messages.read`, accusé de lecture). Tous deux sont `ShouldBroadcast` (en file d'attente) et `ShouldDispatchAfterCommit`.
  - `MessagesRead` n'est émis que si des messages ont réellement été marqués, ce qui évite une boucle de rechargements.
- **Front** :
  - `configureEcho` n'est appelé que si `VITE_REVERB_APP_KEY` est défini (`lib/realtime.ts`). Sinon, la conversation se rafraîchit avec `usePoll` toutes les 10 s.
  - À la réception d'un événement, on recharge les props (`router.reload({ only: ['messages', 'unreadMessages'] })`) au lieu de modifier l'état local.
  - Le compteur partagé `unreadMessages` (`HandleInertiaRequests`, scope `Message::unreadBy`) est affiché par `MessagesLink` dans l'en-tête et mis à jour en direct via le canal utilisateur.
- **E-mail `NewMessage`** : différé de 10 minutes ; `shouldSend()` l'annule si le message a été lu ou si un message plus récent du même expéditeur existe (un seul e-mail par rafale).
- **Développement** :
  - `php artisan dev` lance aussi `reverb:start`, qui enregistre lui-même sa commande.
  - Dans `.env` local, Reverb écoute sur **8081** (`REVERB_PORT` et `REVERB_SERVER_PORT`), car le port 8080 est occupé sur cette machine. Après un changement des variables `VITE_REVERB_*`, il faut recompiler.
  - Dans les tests, `BROADCAST_CONNECTION=null`. Pour tester `/broadcasting/auth`, basculer la config sur reverb **puis** recharger `routes/channels.php`.

## Administration

- Routes dans `routes/admin.php` (inclus depuis `web.php`) : préfixe `/admin`, noms `admin.*`, middlewares `auth`, `verified` et `role:admin`. Les Form Requests `Admin\*` renvoient `authorize() === true`, car l'accès est déjà filtré par la route.
- **Tableau de bord** : compteurs, séjours payés sur 6 mois (volume et frais de service, à la date `paid_at`, statuts confirmed ou completed uniquement), meilleurs hôtes sur 12 mois, file de modération.
- **Modération** (`Admin\PropertyController`) : `publish` (pending → published) et `reject` avec un motif obligatoire, qui sert aussi à retirer un logement publié (published → rejected). Le motif est stocké dans `rejection_reason`, affiché dans l'espace hôte et envoyé par e-mail (`PropertyPublished`, `PropertyRejected`). L'aperçu d'un logement non publié passe par la fiche publique (`PropertyPolicy::view` l'autorise aux admins).
- **Utilisateurs** :
  - changement de rôle (`User::changeRole`) : un admin ne peut pas modifier son propre rôle, et un compte qui possède des logements ne peut pas redevenir voyageur ;
  - suspension (`users.suspended_at`, `suspend()` / `reinstate()`) : `EnsureAccountIsActive` (groupe `web`) déconnecte un compte suspendu à sa requête suivante, et `Fortify::authenticateUsing` refuse sa connexion ;
  - les logements d'un hôte suspendu sortent du catalogue : le scope `published()` filtre sur le propriétaire, et `Property::isListed()` est utilisé pour la fiche publique et la réservation. Les réservations en cours ne sont pas annulées automatiquement.
- **Réservations** : liste filtrable (statut, référence, voyageur, logement). Le détail et l'annulation passent par la page partagée `bookings.show` (l'admin y a la vue hôte, et son annulation rembourse intégralement).
- **Référentiels** (pays, villes, équipements, types de logement) : création et modification en modale. La suppression est refusée si l'élément est utilisé (villes d'un pays, logements d'une ville ou d'un équipement) : il faut alors le désactiver. Le slug d'un équipement ou d'un type est fixé à la création, car les URL de recherche l'utilisent (`types[]` = slugs de `property_types`). Un type désactivé (`is_active`) n'est plus proposé aux hôtes ni dans les filtres, mais reste sur les annonces qui l'utilisent : `PropertyType::options($keepTypeId)` et `UpdatePropertyRequest::detailsRules($currentTypeId)` l'acceptent pour l'annonce qui le porte déjà. Les cases à cocher non envoyées valent `false` (`prepareForValidation`).
- Front : `components/admin/filters.tsx` (`applyFilters`, `FilterBar`, `StatusTabs`, `DataTable`), `components/pagination.tsx` (paginateur Laravel sérialisé, type `Paginated<T>`), `components/admin/record-actions.tsx`. Les types sont dans `types/admin.ts`.

## Avis, favoris et notifications

- **Avis** (table `reviews`, un par réservation grâce à `booking_id` unique) :
  - `BookingPolicy::review` : seul le voyageur, sur un séjour `completed`, une seule fois, jusqu'à `Booking::reviewDeadline()` (départ + `booking.review_window_days`, 30 jours par défaut).
  - `App\Actions\Reviews\PublishReview` crée l'avis, puis appelle `Property::refreshRating()`, qui met à jour les colonnes dénormalisées `rating_average` et `reviews_count` (utilisées par les cartes et par le tri `PropertySort::TopRated`, où les logements sans note passent en dernier). L'hôte est prévenu par `ReviewReceived`.
  - L'hôte répond une seule fois, publiquement (`replyToReview`, `host_reply` et `replied_at`).
  - `bookings:complete` envoie `ReviewRequested` au voyageur.
  - Publiquement, l'auteur n'apparaît que par son prénom (`Review::toPublicArray()`). La fiche affiche les 6 avis les plus récents.
  - Les politiques interrogent `review()->exists()` au lieu de lire la relation, ce qui évite le lazy loading dans les listes. Le séjour est testé comme `completed` en premier, pour éviter la requête dans les autres cas.
- **Favoris** :
  - pivot `favorites` (`user_id`, `property_id`, `created_at`), relation `User::favorites()` ;
  - routes `/favoris` (GET, POST et DELETE `{slug}`) ;
  - la prop partagée `favoriteIds` alimente `FavoriteButton` (mise à jour optimiste, `only: ['favoriteIds']`, variantes `overlay` et `plain`) ;
  - la page `/favoris` n'affiche que les logements encore publiés.
- **Notifications dans l'application** :
  - table `notifications` (canal `database`) ;
  - les notifications qui utilisent le trait `App\Notifications\Concerns\SentInApp` partent par e-mail, sont stockées et sont diffusées sur `App.Models.User.{id}` (type `app.notification`) ;
  - chacune implémente `inApp()`, qui renvoie `{title, body, url}` ;
  - `NewMessage` n'utilise pas ce trait, car la messagerie a son propre compteur.
- **Centre de notifications** :
  - routes `/notifications` (liste), `/notifications/{id}` (marque comme lue puis redirige vers le **chemin** de `url`, jamais vers un autre hôte) et `POST /notifications/tout-lire` ;
  - prop partagée `unreadNotifications` ;
  - `NotificationsLink` (la cloche) recharge la liste via `useEchoNotification`.

## Exploitation et déploiement

- **robots.txt** est servi par `RobotsController` (pas de fichier statique) : en production, il interdit les espaces privés et déclare `/sitemap.xml` ; dans tout autre environnement (staging compris), `Disallow: /`.
- **Seeder** : en production, seulement les référentiels. Hors production, comptes hôte et voyageur de démo, plus les logements de démo. Le compte `admin@guesthoster.test` n'existe qu'en `local` et `testing`. Sur un serveur, l'admin se crée avec `php artisan users:create-admin <email>` (mot de passe saisi de façon masquée).
- **Planificateur** : en plus des commandes de réservation, `notifications:prune` (03:30) supprime les notifications **lues** depuis plus de 90 jours.
- **SSR** : le port du serveur Node est figé au build par `INERTIA_SSR_PORT` (lu dans `vite.config.ts` via `loadEnv`). Il doit correspondre à `INERTIA_SSR_URL`. `npm run build:ssr` produit le client et le bundle SSR.
- **VPS Hostinger** (partagé avec d'autres sites en production : ne jamais redémarrer `php8.5-fpm`, seulement `reload` ; ne pas toucher aux vhosts, pools, services ni aux ports 13714/13715 des voisins ; toute action sur le serveur se confirme d'abord avec l'utilisateur) : `deploy/provision.sh <domaine> [email]` (en root, avec `DEPLOY_PUBKEY`) est additif et idempotent. Il crée :
  - un utilisateur `guesthoster`, un pool PHP-FPM dédié et une base MySQL ;
  - le dépôt bare `~/guesthoster.git`, dont le hook `post-receive` déploie à chaque `git push prod main` ;
  - les services systemd `guesthoster-queue`, `guesthoster-ssr` (port 13716) et `guesthoster-reverb` (127.0.0.1:8095, relayé par NGINX sur `/app` et `/apps`) ;
  - `/etc/cron.d/guesthoster`, le vhost NGINX et le certificat certbot (si le DNS pointe déjà sur le VPS).
- Le `.env` du serveur est généré une seule fois. `APP_ENV=staging` par défaut : démo non indexée, avec dépendances de dev installées pour Faker. Laravel publie vers Reverb en local (`REVERB_HOST=127.0.0.1`) ; le navigateur passe par le domaine (`VITE_REVERB_*` : port 443, https).

## Leçons de l'ancienne version

Défauts connus de l'ancienne version, **à ne pas reproduire** :

- La détection de chevauchement utilise `whereBetween` (bornes incluses), ce qui bloque deux séjours consécutifs (le check-out de l'un tombe le jour du check-in de l'autre). Elle n'est pas non plus protégée contre les réservations concurrentes (pas de transaction ni de verrou). La condition correcte est `check_in < :out AND check_out > :in`.
- La route `GET /bookings/host` est déclarée après `apiResource('bookings')`, donc elle est masquée par `bookings/{booking}`.
- La validation est faite en ligne dans les contrôleurs (pas de Form Requests) et la logique métier (prix, disponibilités) est dupliquée entre `BookingController` et `AvailabilityController`.
- `PaymentController::createPaymentIntent` crée en réalité un SetupIntent.
- Les statuts et les rôles sont des chaînes « magiques » plutôt que des enums.
- Il n'y a pas de workflow de modération : `is_active` est le seul indicateur, alors que la roadmap prévoyait un statut « en attente de validation admin ».
- `ApiCacheMiddleware` met en cache des réponses HTTP entières selon l'URL.
- Des identifiants (Pusher) y étaient commités en clair : ne jamais versionner de secret ni de `.env`.

## Identité visuelle

- Couleurs : primaire `#F35B04`, secondaire `#3A0CA3` (tokens déjà déclarés dans `app.css`).
- Logos SVG dans `public/images/logos/` (`logo`, `logo-light` pour fond sombre, `logo-icon`, `logo-icon-light`). Favicons générés depuis `logo-icon.svg`.

===

<laravel-boost-guidelines>
=== foundation rules ===

# Laravel Boost Guidelines

## Foundational Context

This application is a Laravel application running on PHP 8.5. Always use the APIs that match the installed major version of each package — do not assume a version.

Before relying on a package's API, confirm its installed version:
- PHP packages: run `composer show --direct` to list direct dependencies with versions, or `composer show <vendor/package>` for a single package.
- JS packages: check `package.json` for the installed versions.

## Skills Activation

This project has domain-specific skills available in `**/skills/**`. You MUST activate the relevant skill whenever you work in that domain—don't wait until you're stuck.

## Conventions

- You must follow all existing code conventions used in this application. When creating or editing a file, check sibling files for the correct structure, approach, and naming.
- Use descriptive names for variables and methods. For example, `isRegisteredForDiscounts`, not `discount()`.
- Check for existing components to reuse before writing a new one.

## Verification Scripts

- Do not create verification scripts or tinker when tests cover that functionality and prove they work. Unit and feature tests are more important.

## Application Structure & Architecture

- Stick to existing directory structure; don't create new base folders without approval.
- Do not change the application's dependencies without approval.

## Frontend Bundling

- If a frontend change doesn't show in the UI or you get a "Unable to locate file in Vite manifest" error, run `npm run build` or ask the user to run `npm run dev` or `composer run dev`.

## Documentation Files

- You must only create documentation files if explicitly requested by the user.

=== boost rules ===

# Laravel Boost

## Tools

- Laravel Boost is an MCP server with tools designed specifically for this application. Prefer Boost tools over manual alternatives like shell commands or file reads.
- Use `database-query` to run read-only queries against the database instead of writing raw SQL in tinker.
- Use `database-schema` to inspect table structure before writing migrations or models.
- Use `get-absolute-url` to resolve the correct scheme, domain, and port for project URLs. Always use this before sharing a URL with the user.
- Use `browser-logs` to read browser logs, errors, and exceptions. Only recent logs are useful, ignore old entries.

## Searching Documentation (IMPORTANT)

- Use `search-docs` before changes that depend on Laravel ecosystem APIs, behavior, configuration, or version-specific syntax. Skip it for copy-only edits and other changes where package documentation is irrelevant. Reuse sufficient results already in context instead of searching again.
- Pass a `packages` array to scope results when you know which packages are relevant.
- Use multiple broad, topic-based queries: `['rate limiting', 'routing rate limiting', 'routing']`. Expect the most relevant results first.
- Do not add package names to queries because package info is already shared. Use `test resource table`, not `filament 4 test resource table`.

### Search Syntax

1. Use words for auto-stemmed AND logic: `rate limit` matches both "rate" AND "limit".
2. Use `"quoted phrases"` for exact position matching: `"infinite scroll"` requires adjacent words in order.
3. Combine words and phrases for mixed queries: `middleware "rate limit"`.
4. Use multiple queries for OR logic: `queries=["authentication", "middleware"]`.

## Project Rules

- This project contains committed, area-grouped rules in `.ai/rules` when that directory exists, including path-scoped framework guidelines under `.ai/rules/boost`. Before you enter plan mode or create/edit any file, you MUST first: open @.ai/rules/index.md (it maps file globs to rule files), read every rule file whose globs cover the path(s) in scope, and run `grep -rin 'keyword' .ai/rules` to catch what a path match alone misses. Do not write code until you have read and are following every matching rule. If `.ai/rules` does not exist, continue without it.

## Artisan

- Run Artisan commands directly via the command line (e.g., `php artisan route:list`). Use `php artisan list` to discover available commands and `php artisan [command] --help` to check parameters.
- Inspect routes with `php artisan route:list`. Filter with: `--method=GET`, `--name=users`, `--path=api`, `--except-vendor`, `--only-vendor`.
- Read configuration values using dot notation: `php artisan config:show app.name`, `php artisan config:show database.default`. Or read config files directly from the `config/` directory.

## Tinker

- Execute PHP in app context for debugging and testing code. Do not create models without user approval, prefer tests with factories instead. Prefer existing Artisan commands over custom tinker code.
- Always use single quotes to prevent shell expansion: `php artisan tinker --execute 'Your::code();'`
  - Double quotes for PHP strings inside: `php artisan tinker --execute 'User::where("active", true)->count();'`

=== php rules ===

# PHP

- Always use curly braces for control structures, even for single-line bodies.
- Use PHP 8 constructor property promotion: `public function __construct(public GitHub $github) { }`. Do not leave empty zero-parameter `__construct()` methods unless the constructor is private.
- Use explicit return type declarations and type hints for all method parameters: `function isAccessible(User $user, ?string $path = null): bool`
- Use TitleCase for Enum keys: `FavoritePerson`, `BestLake`, `Monthly`.
- Prefer PHPDoc blocks over inline comments. Only add inline comments for exceptionally complex logic.
- Use array shape type definitions in PHPDoc blocks.

=== deployments rules ===

# Deployment

- Laravel can be deployed using [Laravel Cloud](https://cloud.laravel.com/), which is the fastest way to deploy and scale production Laravel applications.
- Activate the `deploying-to-cloud` skill whenever deploying to Laravel Cloud, configuring Cloud environments or resources, using the Cloud CLI, or troubleshooting Cloud deployments.

=== tests rules ===

# Test Enforcement

- Add or update tests for behavior and logic changes when a test provides meaningful regression coverage.
- Pure copy, styling, and layout-only changes do not require new or updated tests.
- When test coverage applies, run the affected tests and ensure they pass.
- Test the changed behavior and its important failure modes, but do not add tests beyond them.
- Read the `testing-best-practices` skill before writing tests.

=== inertia-laravel/core rules ===

# Inertia

- Inertia creates fully client-side rendered SPAs without modern SPA complexity, leveraging existing server-side patterns.
- Components live in `resources/js/pages` (unless specified in `vite.config.js`). Use `Inertia::render()` for server-side routing instead of Blade views.
- ALWAYS use `search-docs` tool for version-specific Inertia documentation and updated code examples.
- IMPORTANT: Activate `inertia-react-development` when working with Inertia client-side patterns.

# Inertia v3

- Use all Inertia features from v1, v2, and v3. Check the documentation before making changes to ensure the correct approach.
- New v3 features: standalone HTTP requests (`useHttp` hook), optimistic updates with automatic rollback, layout props (`useLayoutProps` hook), instant visits, simplified SSR via `@inertiajs/vite` plugin, custom exception handling for error pages.
- Carried over from v2: deferred props, infinite scroll, merging props, polling, prefetching, once props, flash data.
- When using deferred props, add an empty state with a pulsing or animated skeleton.
- Axios has been removed. Use the built-in XHR client with interceptors, or install Axios separately if needed.
- `Inertia::lazy()` / `LazyProp` has been removed. Use `Inertia::optional()` instead.
- Prop types (`Inertia::optional()`, `Inertia::defer()`, `Inertia::merge()`) work inside nested arrays with dot-notation paths.
- SSR works automatically in Vite dev mode with `@inertiajs/vite` - no separate Node.js server needed during development.
- Event renames: `invalid` is now `httpException`, `exception` is now `networkError`.
- `router.cancel()` replaced by `router.cancelAll()`.
- The `future` configuration namespace has been removed - all v2 future options are now always enabled.

=== laravel/core rules ===

# Do Things the Laravel Way

- Use `php artisan make:` commands to create new files (i.e. migrations, controllers, models, etc.). You can list available Artisan commands using `php artisan list` and check their parameters with `php artisan [command] --help`.
- If you're creating a generic PHP class, use `php artisan make:class`.
- Pass `--no-interaction` to all Artisan commands to ensure they work without user input. You should also pass the correct `--options` to ensure correct behavior.

### Model Creation

- When creating new models, create useful factories and seeders for them too. Ask the user if they need any other things, using `php artisan make:model --help` to check the available options.

## APIs & Eloquent Resources

- For APIs, default to using Eloquent API Resources and API versioning unless existing API routes do not, then you should follow existing application convention.

## URL Generation

- When generating links to other pages, prefer named routes and the `route()` function.

## Testing

- When creating models for tests, use the factories for the models. Check if the factory has custom states that can be used before manually setting up the model.
- Faker: Use methods such as `$this->faker->word()` or `fake()->randomDigit()`. Follow existing conventions whether to use `$this->faker` or `fake()`.
- When creating tests, make use of `php artisan make:test [options] {name}` to create a feature test, and pass `--unit` to create a unit test. Most tests should be feature tests.

=== wayfinder/core rules ===

# Laravel Wayfinder

Use Wayfinder to generate TypeScript functions for Laravel routes. Import from `@/actions/` (controllers) or `@/routes/` (named routes).

=== pint/core rules ===

# Laravel Pint Code Formatter

- If you have modified any PHP files, you must run `vendor/bin/pint --dirty --format agent` before finalizing changes to ensure your code matches the project's expected style.
- Do not run `vendor/bin/pint --test --format agent`, simply run `vendor/bin/pint --format agent` to fix any formatting issues.

=== pest/core rules ===

# Pest

- This project uses Pest. Create tests with `php artisan make:test --pest {name}`.
- Do not include the test suite directory in `{name}`. Use `SomeFeatureTest`, not `Feature/SomeFeatureTest`.
- Read the `testing-best-practices` skill for guidance on coverage, naming, structure, dependency isolation, and review.
- Do not delete tests or test files without approval. They are part of the application.

## Running Tests

- Run the narrowest set of tests that covers the change. Pass a file path or `--filter=testName` to `php artisan test --compact`.
- Rerun a test after each change to it.
- Run `vendor/bin/pest` to call the test runner directly. It accepts the same file path and `--filter=testName` arguments.

=== inertia-react/core rules ===

# Inertia + React

- IMPORTANT: Activate `inertia-react-development` when working with Inertia React client-side patterns.

</laravel-boost-guidelines>
