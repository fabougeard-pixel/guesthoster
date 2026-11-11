import { Link, router, usePage } from '@inertiajs/react';
import { login } from '@/routes';
import { destroy, store } from '@/routes/favorites';
import { cn } from '@/lib/utils';

type Variant = 'overlay' | 'plain';

function Heart({ filled, variant }: { filled: boolean; variant: Variant }) {
    return (
        <svg
            viewBox="0 0 24 24"
            strokeWidth={2}
            aria-hidden="true"
            className={cn(
                'size-5',
                filled && 'fill-primary-600 stroke-primary-600',
                !filled &&
                    (variant === 'overlay'
                        ? 'fill-zinc-900/30 stroke-white'
                        : 'fill-none stroke-zinc-700 dark:stroke-zinc-200'),
            )}
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"
            />
        </svg>
    );
}

/**
 * Cœur « enregistrer dans mes favoris ». Mise à jour optimiste de la liste partagée `favoriteIds`.
 * `overlay` se pose sur une photo, `plain` sur un fond clair.
 */
export function FavoriteButton({
    propertyId,
    slug,
    title,
    variant = 'overlay',
    className,
}: {
    propertyId: number;
    slug: string;
    title: string;
    variant?: Variant;
    className?: string;
}) {
    const { auth, favoriteIds } = usePage().props;
    const isFavorite = favoriteIds.includes(propertyId);
    const classes = cn(
        'relative z-10 flex size-9 items-center justify-center rounded-full transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-primary-500',
        className,
    );
    const label = isFavorite
        ? `Retirer « ${title} » des favoris`
        : `Ajouter « ${title} » aux favoris`;

    if (!auth.user) {
        return (
            <Link href={login()} className={classes} aria-label={label}>
                <Heart filled={false} variant={variant} />
            </Link>
        );
    }

    const toggle = () => {
        const route = isFavorite ? destroy(slug) : store(slug);

        router.visit(route.url, {
            method: route.method,
            preserveScroll: true,
            preserveState: true,
            only: ['favoriteIds'],
            optimistic: (props) => ({
                favoriteIds: isFavorite
                    ? props.favoriteIds.filter((id) => id !== propertyId)
                    : [...props.favoriteIds, propertyId],
            }),
        });
    };

    return (
        <button
            type="button"
            onClick={toggle}
            aria-pressed={isFavorite}
            aria-label={label}
            className={classes}
        >
            <Heart filled={isFavorite} variant={variant} />
        </button>
    );
}
