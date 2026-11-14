import Link from 'next/link';
import { FavoriteButton } from '@/components/favorite-button';
import { RatingSummary } from '@/components/star-rating';
import { formatLeaseDuration } from '@/lib/domain/platform-settings';
import { formatPrice, plural } from '@/lib/format';
import type { PropertyCard as PropertyCardData } from '@/types';

export function PropertyCard({
    property,
    query,
}: {
    property: PropertyCardData;
    query?: Record<string, string>;
}) {
    const qs = query ? new URLSearchParams(query).toString() : '';
    const href = qs
        ? `/logements/${property.slug}?${qs}`
        : `/logements/${property.slug}`;

    const isLongTerm = property.rental_duration === 'long_term';

    return (
        <article className="group relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border border-zinc-200/90 bg-white p-3.5 sm:p-4 shadow-sm transition-all duration-300 hover:border-zinc-300 hover:shadow-xl dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700">
            {/* 1. Zone Image avec badges en superposition */}
            <div className="relative aspect-4/3 w-full overflow-hidden rounded-2xl bg-zinc-100 dark:bg-zinc-800">
                {property.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={property.cover_url}
                        alt=""
                        loading="lazy"
                        className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                ) : (
                    <div className="flex size-full items-center justify-center text-sm text-zinc-400">
                        Pas encore de photo
                    </div>
                )}

                {/* Badges en haut à gauche (style capture de référence) */}
                <div className="pointer-events-none absolute top-3 left-3 flex flex-col items-start gap-1.5">
                    {isLongTerm ? (
                        <>
                            {/* Pillule Location standard */}
                            <div className="flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-secondary-900 shadow-md backdrop-blur-xs dark:bg-zinc-900/95 dark:text-zinc-100">
                                <svg
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                    className="size-3.5 text-secondary-700 dark:text-secondary-400"
                                    aria-hidden="true"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="m9.69 18.933.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 0 0 .281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 1 0 3 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 0 0 2.273 1.765 11.742 11.742 0 0 0 1.04 5.73l.018.008.006.003ZM10 11.25a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                                <span>Location standard</span>
                            </div>

                            {/* Pillule Bail min. 1 an */}
                            <div className="flex items-center gap-1.5 rounded-full border border-amber-200/80 bg-amber-50/95 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800 shadow-sm backdrop-blur-xs dark:border-amber-800 dark:bg-amber-950/80 dark:text-amber-200">
                                <svg
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                    className="size-3.5 text-amber-600 dark:text-amber-400"
                                    aria-hidden="true"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-13a.75.75 0 0 0-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 0 0 0-1.5h-3.25V5Z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                                <span>
                                    Bail min. {formatLeaseDuration(property.min_lease_months)}
                                </span>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Pillule Location saisonnière */}
                            <div className="flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-zinc-900 shadow-md backdrop-blur-xs dark:bg-zinc-900/95 dark:text-zinc-100">
                                <svg
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                    className="size-3.5 text-primary-600 dark:text-primary-400"
                                    aria-hidden="true"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M5.75 2a.75.75 0 0 1 .75.75V4h7V2.75a.75.75 0 0 1 1.5 0V4h.25A2.75 2.75 0 0 1 18 6.75v8.5A2.75 2.75 0 0 1 15.25 18H4.75A2.75 2.75 0 0 1 2 15.25v-8.5A2.75 2.75 0 0 1 4.75 4H5V2.75A.75.75 0 0 1 5.75 2Zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75Z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                                <span>Location saisonnière</span>
                            </div>

                            {property.is_instant && (
                                <div className="flex items-center gap-1 rounded-full bg-primary-500/95 px-2.5 py-0.5 text-[11px] font-semibold text-white shadow-md backdrop-blur-xs">
                                    <span>⚡ Instantané</span>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Type de bien affiché en bas à gauche de la photo */}
                <div className="pointer-events-none absolute bottom-2.5 left-2.5">
                    <span className="inline-flex items-center rounded-lg bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-xs">
                        {property.type}
                    </span>
                </div>

                {/* Bouton Favoris en haut à droite */}
                <FavoriteButton
                    propertyId={property.id}
                    slug={property.slug}
                    title={property.title}
                    className="absolute top-2.5 right-2.5 z-10 shadow-md"
                />
            </div>

            {/* 2. Corps de la carte */}
            <div className="flex flex-1 flex-col justify-between gap-3 pt-3">
                <div className="flex flex-col gap-1.5">
                    {/* Ville & Avis */}
                    <div className="flex items-center justify-between gap-2">
                        <p className="flex items-center gap-1 text-xs font-medium text-zinc-500 truncate dark:text-zinc-400">
                            <svg
                                viewBox="0 0 20 20"
                                fill="currentColor"
                                className="size-3.5 shrink-0 text-zinc-400 dark:text-zinc-500"
                                aria-hidden="true"
                            >
                                <path
                                    fillRule="evenodd"
                                    d="m9.69 18.933.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 0 0 .281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 1 0 3 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 0 0 2.273 1.765 11.742 11.742 0 0 0 1.04 5.73l.018.008.006.003ZM10 11.25a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z"
                                    clipRule="evenodd"
                                />
                            </svg>
                            <span className="truncate">
                                {property.city}, {property.country}
                            </span>
                        </p>
                        <RatingSummary
                            average={property.rating_average}
                            count={property.reviews_count}
                            className="shrink-0 text-xs"
                        />
                    </div>

                    {/* Titre cliquable (l'élément after:absolute couvre la carte) */}
                    <h3 className="line-clamp-2 text-base font-bold leading-snug text-zinc-900 transition group-hover:text-primary-600 dark:text-zinc-100 dark:group-hover:text-primary-400">
                        <Link
                            href={href}
                            className="after:absolute after:inset-0 focus-visible:outline-none after:focus-visible:rounded-3xl after:focus-visible:outline-2 after:focus-visible:outline-primary-500"
                        >
                            {property.title}
                        </Link>
                    </h3>
                </div>

                {/* 3. Encadré financier et bouton d'action selon la formule */}
                {isLongTerm ? (
                    <div className="flex flex-col gap-2.5">
                        {/* Encadré financier Location standard (style capture) */}
                        <div className="flex flex-col gap-2 rounded-2xl border border-zinc-200/80 bg-zinc-50/70 p-3.5 dark:border-zinc-800 dark:bg-zinc-850/50">
                            <div className="flex items-baseline justify-between gap-2">
                                <p className="flex items-baseline gap-1">
                                    <span className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">
                                        {formatPrice(property.monthly_rent)}
                                    </span>
                                    <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                                        / mois
                                    </span>
                                </p>
                                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200/70 bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300">
                                    <svg
                                        viewBox="0 0 20 20"
                                        fill="currentColor"
                                        className="size-3.5 shrink-0"
                                        aria-hidden="true"
                                    >
                                        <path d="M11.983 1.907a.75.75 0 0 0-1.292-.657l-8.5 9.5A.75.75 0 0 0 2.75 12h6.572l-1.305 6.093a.75.75 0 0 0 1.292.657l8.5-9.5A.75.75 0 0 0 17.25 8h-6.572l1.305-6.093Z" />
                                    </svg>
                                    {property.charges_included
                                        ? 'Charges comprises'
                                        : `+${formatPrice(property.monthly_charges)} charges`}
                                </span>
                            </div>
                            <div className="border-t border-zinc-200/70 pt-2 text-xs font-medium text-zinc-600 dark:border-zinc-800/70 dark:text-zinc-400">
                                Caution :{' '}
                                <strong className="font-bold text-zinc-900 dark:text-zinc-100">
                                    {formatPrice(property.security_deposit)}
                                </strong>
                            </div>
                        </div>

                        {/* Bouton Prendre rendez-vous avec icône calendrier et flèche */}
                        <div className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary-500 py-3 px-4 text-sm font-semibold text-white shadow-md transition-all group-hover:bg-primary-600 group-hover:shadow-lg dark:bg-primary-600 dark:group-hover:bg-primary-500">
                            <svg
                                viewBox="0 0 20 20"
                                fill="currentColor"
                                className="size-4 shrink-0"
                                aria-hidden="true"
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M5.75 2a.75.75 0 0 1 .75.75V4h7V2.75a.75.75 0 0 1 1.5 0V4h.25A2.75 2.75 0 0 1 18 6.75v8.5A2.75 2.75 0 0 1 15.25 18H4.75A2.75 2.75 0 0 1 2 15.25v-8.5A2.75 2.75 0 0 1 4.75 4H5V2.75A.75.75 0 0 1 5.75 2Zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75Z"
                                    clipRule="evenodd"
                                />
                            </svg>
                            <span>Prendre rendez-vous</span>
                            <svg
                                viewBox="0 0 20 20"
                                fill="currentColor"
                                className="size-4 shrink-0 transition-transform duration-200 group-hover:translate-x-1"
                                aria-hidden="true"
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-2.5">
                        {/* Encadré financier Location saisonnière */}
                        <div className="flex flex-col gap-2 rounded-2xl border border-zinc-200/80 bg-zinc-50/70 p-3.5 dark:border-zinc-800 dark:bg-zinc-850/50">
                            <div className="flex items-baseline justify-between gap-2">
                                <p className="flex items-baseline gap-1">
                                    <span className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">
                                        {formatPrice(property.price_per_night)}
                                    </span>
                                    <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                                        / nuit
                                    </span>
                                </p>
                                {property.cleaning_fee > 0 ? (
                                    <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                                        Ménage : {formatPrice(property.cleaning_fee)}
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center rounded-full border border-emerald-200/70 bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300">
                                        Ménage inclus
                                    </span>
                                )}
                            </div>
                            <div className="border-t border-zinc-200/70 pt-2 flex items-center justify-between text-xs text-zinc-500 dark:border-zinc-800/70 dark:text-zinc-400">
                                <span>
                                    {plural(property.max_guests, 'voyageur')} ·{' '}
                                    {property.bedrooms > 0
                                        ? plural(property.bedrooms, 'chambre')
                                        : 'Studio'}
                                    {property.beds > 0
                                        ? ` · ${plural(property.beds, 'lit')}`
                                        : ''}
                                </span>
                            </div>
                        </div>

                        {/* Bouton Réserver ce logement demandé par l'utilisateur */}
                        <div className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary-500 py-3 px-4 text-sm font-semibold text-white shadow-md transition-all group-hover:bg-primary-600 group-hover:shadow-lg dark:bg-primary-600 dark:group-hover:bg-primary-500">
                            <svg
                                viewBox="0 0 20 20"
                                fill="currentColor"
                                className="size-4 shrink-0"
                                aria-hidden="true"
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M6 2a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7.414A2 2 0 0 0 15.414 6L12 2.586A2 2 0 0 0 10.586 2H6Zm2 10a1 1 0 1 0 0 2h4a1 1 0 1 0 0-2H8Zm0-3a1 1 0 1 0 0 2h4a1 1 0 1 0 0-2H8Z"
                                    clipRule="evenodd"
                                />
                            </svg>
                            <span>Réserver ce logement</span>
                            <svg
                                viewBox="0 0 20 20"
                                fill="currentColor"
                                className="size-4 shrink-0 transition-transform duration-200 group-hover:translate-x-1"
                                aria-hidden="true"
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        </div>
                    </div>
                )}
            </div>
        </article>
    );
}

export function PropertyCardSkeleton() {
    return (
        <div
            className="flex h-full flex-col justify-between gap-3.5 rounded-3xl border border-zinc-200/80 bg-white p-3.5 sm:p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 animate-pulse"
            aria-hidden="true"
        >
            <div className="aspect-4/3 w-full rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
            <div className="flex flex-col gap-2 pt-1">
                <div className="h-3.5 w-1/3 rounded-md bg-zinc-200 dark:bg-zinc-800" />
                <div className="h-5 w-3/4 rounded-md bg-zinc-200 dark:bg-zinc-800" />
            </div>
            <div className="h-20 w-full rounded-2xl bg-zinc-100 dark:bg-zinc-850" />
            <div className="h-11 w-full rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
        </div>
    );
}
