import Link from 'next/link';
import { Badge } from '@/components/card';
import { FavoriteButton } from '@/components/favorite-button';
import { RatingSummary } from '@/components/star-rating';
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

    return (
        <article className="group relative flex flex-col gap-3">
            <div className="relative aspect-4/3 overflow-hidden rounded-2xl bg-zinc-100 dark:bg-zinc-800">
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

                {/* Badges en superposition */}
                <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 pointer-events-none">
                    {property.rental_duration === 'long_term' ? (
                        <Badge
                            tone="secondary"
                            className="bg-white/95 text-secondary-900 shadow-md backdrop-blur-xs font-semibold dark:bg-zinc-900/95 dark:text-zinc-100"
                        >
                            Location standard · Bail 1 an
                        </Badge>
                    ) : (
                        <Badge
                            tone="neutral"
                            className="bg-white/90 text-zinc-800 shadow-sm backdrop-blur-xs dark:bg-zinc-900/90 dark:text-zinc-200"
                        >
                            Location saisonnière
                        </Badge>
                    )}
                    {property.is_instant && (
                        <Badge
                            tone="primary"
                            className="bg-primary-500/95 text-white shadow-md backdrop-blur-xs font-medium"
                        >
                            ⚡ Instantané
                        </Badge>
                    )}
                </div>

                {/* Type de bien affiché en bas de photo */}
                <div className="absolute bottom-2.5 left-2.5 pointer-events-none">
                    <span className="inline-flex items-center rounded-lg bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-xs">
                        {property.type}
                    </span>
                </div>

                <FavoriteButton
                    propertyId={property.id}
                    slug={property.slug}
                    title={property.title}
                    className="absolute top-2.5 right-2.5 shadow-md"
                />
            </div>

            <div className="flex flex-col gap-1">
                {/* Ville & Avis */}
                <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium text-zinc-500 truncate dark:text-zinc-400">
                        {property.city}, {property.country}
                    </p>
                    <RatingSummary
                        average={property.rating_average}
                        count={property.reviews_count}
                        className="shrink-0 text-xs"
                    />
                </div>

                {/* Titre */}
                <h3 className="line-clamp-1 text-sm font-semibold text-zinc-900 transition group-hover:text-primary-600 dark:text-zinc-100 dark:group-hover:text-primary-400">
                    <Link
                        href={href}
                        className="after:absolute after:inset-0 focus-visible:outline-none after:focus-visible:rounded-2xl after:focus-visible:outline-2 after:focus-visible:outline-primary-500"
                    >
                        {property.title}
                    </Link>
                </h3>

                {/* Configuration : Caractéristiques adaptées au type de location */}
                {property.rental_duration === 'long_term' ? (
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                        <span className="font-medium text-zinc-700 dark:text-zinc-300">
                            {property.bedrooms > 0
                                ? plural(property.bedrooms, 'chambre')
                                : 'Studio'}
                        </span>
                        {property.beds > 0 && (
                            <>
                                <span aria-hidden="true">·</span>
                                <span>{plural(property.beds, 'lit')}</span>
                            </>
                        )}
                        {property.bathrooms > 0 && (
                            <>
                                <span aria-hidden="true">·</span>
                                <span>{plural(property.bathrooms, 'sdb')}</span>
                            </>
                        )}
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center rounded-sm bg-primary-50 px-1.5 py-0.2 text-[10px] font-semibold text-primary-700 dark:bg-primary-950/60 dark:text-primary-300">
                            Bail 1 an renouvelable
                        </span>
                    </div>
                ) : (
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                        <span>{plural(property.max_guests, 'voyageur')}</span>
                        <span aria-hidden="true">·</span>
                        <span>
                            {property.bedrooms > 0
                                ? plural(property.bedrooms, 'chambre')
                                : 'Studio'}
                        </span>
                        {property.beds > 0 && (
                            <>
                                <span aria-hidden="true">·</span>
                                <span>{plural(property.beds, 'lit')}</span>
                            </>
                        )}
                        {property.bathrooms > 0 && (
                            <>
                                <span aria-hidden="true">·</span>
                                <span>{plural(property.bathrooms, 'sdb')}</span>
                            </>
                        )}
                    </div>
                )}

                {/* Tarifs et conditions financières */}
                {property.rental_duration === 'long_term' ? (
                    <div className="mt-1 flex flex-col gap-1.5 rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-2.5 dark:border-zinc-800 dark:bg-zinc-850/50">
                        <div className="flex items-baseline justify-between gap-2">
                            <p className="text-sm">
                                <span className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                                    {formatPrice(property.monthly_rent)}
                                </span>{' '}
                                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                    / mois
                                </span>
                            </p>
                            <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                                {property.charges_included
                                    ? 'Charges comprises'
                                    : `+${formatPrice(property.monthly_charges)} charges`}
                            </span>
                        </div>
                        <div className="flex items-center justify-between border-t border-zinc-200/60 pt-1 text-[11px] text-zinc-500 dark:border-zinc-800/60 dark:text-zinc-400">
                            <span>
                                Caution : <strong className="font-semibold text-zinc-700 dark:text-zinc-300">{formatPrice(property.security_deposit)}</strong>
                            </span>
                            <span>
                                {property.visit_fee > 0 ? (
                                    <span className="font-medium text-amber-700 dark:text-amber-400">
                                        RDV visite : {formatPrice(property.visit_fee)}
                                    </span>
                                ) : (
                                    <span className="font-medium text-primary-600 dark:text-primary-400">
                                        Visite sur RDV
                                    </span>
                                )}
                            </span>
                        </div>
                    </div>
                ) : (
                    <div className="mt-1 flex items-baseline justify-between gap-2 border-t border-zinc-100 pt-1.5 dark:border-zinc-800">
                        <p className="text-sm">
                            <span className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                                {formatPrice(property.price_per_night)}
                            </span>{' '}
                            <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                / nuit
                            </span>
                        </p>
                        {property.cleaning_fee > 0 ? (
                            <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                                Ménage : {formatPrice(property.cleaning_fee)}
                            </span>
                        ) : (
                            <span className="text-[11px] text-emerald-700 dark:text-emerald-400">
                                Ménage inclus
                            </span>
                        )}
                    </div>
                )}
            </div>
        </article>
    );
}

export function PropertyCardSkeleton() {
    return (
        <div className="flex animate-pulse flex-col gap-3" aria-hidden="true">
            <div className="aspect-4/3 rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-3 w-1/2 rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-4 w-3/4 rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-3 w-1/3 rounded bg-zinc-200 dark:bg-zinc-800" />
        </div>
    );
}

