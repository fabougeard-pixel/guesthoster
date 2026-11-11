import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn(
                'rounded-2xl border border-zinc-200 bg-white shadow-xs dark:border-zinc-800 dark:bg-zinc-900',
                className,
            )}
            {...props}
        />
    );
}

export function Container({
    className,
    ...props
}: HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn(
                'mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8',
                className,
            )}
            {...props}
        />
    );
}

export type BadgeTone =
    | 'neutral'
    | 'primary'
    | 'secondary'
    | 'success'
    | 'warning'
    | 'danger';

const toneClasses: Record<BadgeTone, string> = {
    neutral: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
    primary:
        'bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300',
    secondary:
        'bg-secondary-50 text-secondary-800 dark:bg-secondary-950 dark:text-secondary-300',
    success:
        'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    warning: 'bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
    danger: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',
};

export function Badge({
    tone = 'neutral',
    className,
    ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
                toneClasses[tone],
                className,
            )}
            {...props}
        />
    );
}

