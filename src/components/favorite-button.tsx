'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAppState } from '@/components/providers';
import { toggleFavoriteAction } from '@/lib/actions/bookings';
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

export function FavoriteButton({
    propertyId,
    title,
    variant = 'overlay',
    className,
}: {
    propertyId: number;
    slug?: string;
    title: string;
    variant?: Variant;
    className?: string;
}) {
    const { user, favoriteIds, setFavoriteIds, pushToast } = useAppState();
    const router = useRouter();
    const [pending, setPending] = useState(false);

    const isFavorite = favoriteIds.includes(propertyId);
    const classes = cn(
        'relative z-10 flex size-9 items-center justify-center rounded-full transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-primary-500',
        className,
    );
    const label = isFavorite
        ? `Retirer « ${title} » des favoris`
        : `Ajouter « ${title} » aux favoris`;

    if (!user) {
        return (
            <Link href="/login" className={classes} aria-label={label}>
                <Heart filled={false} variant={variant} />
            </Link>
        );
    }

    async function toggle() {
        if (pending) {
            return;
        }
        setPending(true);
        const wasFavorite = isFavorite;
        setFavoriteIds((prev) =>
            wasFavorite
                ? prev.filter((id) => id !== propertyId)
                : [...prev, propertyId],
        );

        try {
            const res = await toggleFavoriteAction(propertyId);
            if (!res.ok) {
                setFavoriteIds((prev) =>
                    wasFavorite
                        ? [...prev, propertyId]
                        : prev.filter((id) => id !== propertyId),
                );
                if (res.error) {
                    pushToast({ type: 'error', message: res.error });
                }
            } else {
                if (res.toast) {
                    pushToast(res.toast);
                }
                router.refresh();
            }
        } finally {
            setPending(false);
        }
    }

    return (
        <button
            type="button"
            onClick={() => void toggle()}
            disabled={pending}
            aria-pressed={isFavorite}
            aria-label={label}
            className={classes}
        >
            <Heart filled={isFavorite} variant={variant} />
        </button>
    );
}

