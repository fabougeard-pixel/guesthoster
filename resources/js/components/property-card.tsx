import { Link } from '@inertiajs/react';
import { Badge } from '@/components/card';
import { FavoriteButton } from '@/components/favorite-button';
import { RatingSummary } from '@/components/star-rating';
import { formatPrice, plural } from '@/lib/format';
import { show } from '@/routes/properties';
import type { PropertyCard as PropertyCardData } from '@/types';

export function PropertyCard({
    property,
    query,
}: {
    property: PropertyCardData;
    query?: Record<string, string>;
}) {
    return (
        <article className="group relative flex flex-col gap-3">
            <div className="relative aspect-4/3 overflow-hidden rounded-2xl bg-zinc-100 dark:bg-zinc-800">
                {property.cover_url ? (
                    <img
                        src={property.cover_url}
                        alt=""
                        loading="lazy"
                        className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                ) : (
                    <div className="flex size-full items-center justify-center text-sm text-zinc-400">
                        Pas encore de photo
                    </div>
                )}
                {property.is_instant && (
                    <Badge
                        tone="primary"
                        className="absolute top-3 left-3 bg-white/95 shadow-sm dark:bg-zinc-900/95"
                    >
                        Réservation instantanée
                    </Badge>
                )}
                <FavoriteButton
                    propertyId={property.id}
                    slug={property.slug}
                    title={property.title}
                    className="absolute top-2 right-2"
                />
            </div>
            <div className="flex flex-col gap-0.5">
                <div className="flex items-start justify-between gap-2">
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        {property.type} · {property.city}, {property.country}
                    </p>
                    <RatingSummary
                        average={property.rating_average}
                        count={property.reviews_count}
                        className="shrink-0"
                    />
                </div>
                <h3 className="line-clamp-1 font-medium">
                    <Link
                        href={show(property.slug, { query })}
                        className="after:absolute after:inset-0 focus-visible:outline-none after:focus-visible:rounded-2xl after:focus-visible:outline-2 after:focus-visible:outline-primary-500"
                    >
                        {property.title}
                    </Link>
                </h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {plural(property.max_guests, 'voyageur')}
                    {property.bedrooms > 0 &&
                        ` · ${plural(property.bedrooms, 'chambre')}`}
                </p>
                <p className="mt-1 text-sm">
                    <span className="font-semibold">
                        {formatPrice(property.price_per_night)}
                    </span>{' '}
                    <span className="text-zinc-500 dark:text-zinc-400">
                        / nuit
                    </span>
                </p>
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
