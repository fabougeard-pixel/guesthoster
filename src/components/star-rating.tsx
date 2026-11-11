'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

const STARS = [1, 2, 3, 4, 5];

function Star({ filled, className }: { filled: boolean; className?: string }) {
    return (
        <svg
            viewBox="0 0 20 20"
            aria-hidden="true"
            className={cn(
                filled
                    ? 'fill-primary-500'
                    : 'fill-zinc-200 dark:fill-zinc-700',
                className,
            )}
        >
            <path d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401Z" />
        </svg>
    );
}

export function Stars({
    rating,
    className,
}: {
    rating: number;
    className?: string;
}) {
    return (
        <span
            className={cn('inline-flex gap-0.5', className)}
            role="img"
            aria-label={`${rating} sur 5`}
        >
            {STARS.map((star) => (
                <Star
                    key={star}
                    filled={star <= Math.round(rating)}
                    className="size-4"
                />
            ))}
        </span>
    );
}

export function RatingSummary({
    average,
    count,
    className,
}: {
    average: number | null;
    count: number;
    className?: string;
}) {
    if (average === null || count === 0) {
        return (
            <span className={cn('text-sm font-medium', className)}>
                Nouveau
            </span>
        );
    }

    return (
        <span
            className={cn(
                'inline-flex items-center gap-1 text-sm font-medium',
                className,
            )}
        >
            <Star filled className="size-4" />
            {average.toLocaleString('fr-FR', {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
            })}
            <span className="font-normal text-zinc-500 dark:text-zinc-400">
                ({count} avis)
            </span>
        </span>
    );
}

export function StarInput({
    name,
    defaultValue = 0,
}: {
    name: string;
    defaultValue?: number;
}) {
    const [value, setValue] = useState(defaultValue);
    const [hovered, setHovered] = useState(0);
    const shown = hovered || value;

    return (
        <fieldset className="flex gap-1" onMouseLeave={() => setHovered(0)}>
            <legend className="sr-only">Note sur 5</legend>
            {STARS.map((star) => (
                <label
                    key={star}
                    className="cursor-pointer rounded p-0.5 has-focus-visible:outline-2 has-focus-visible:outline-primary-500"
                    onMouseEnter={() => setHovered(star)}
                >
                    <input
                        type="radio"
                        name={name}
                        value={star}
                        checked={value === star}
                        onChange={() => setValue(star)}
                        className="sr-only"
                    />
                    <Star filled={star <= shown} className="size-8" />
                    <span className="sr-only">
                        {star} étoile{star > 1 ? 's' : ''}
                    </span>
                </label>
            ))}
        </fieldset>
    );
}

