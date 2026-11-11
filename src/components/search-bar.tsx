'use client';

import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';
import { useId } from 'react';
import { Button } from '@/components/button';
import { Input, Label } from '@/components/form';
import { addDays, plural, todayIso } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { SearchFilters } from '@/types';

type SearchValues = Pick<
    SearchFilters,
    'destination' | 'check_in' | 'check_out' | 'guests'
>;

export function buildQueryString(query: Record<string, unknown>): string {
    const sp = new URLSearchParams();
    for (const [key, value] of Object.entries(cleanQuery(query))) {
        if (Array.isArray(value)) {
            const arrayKey = key.endsWith('[]') ? key : `${key}[]`;
            for (const item of value) {
                sp.append(arrayKey, item);
            }
        } else {
            sp.set(key, String(value));
        }
    }
    return sp.toString();
}

export function cleanQuery(
    query: Record<string, unknown>,
): Record<string, string | number | string[]> {
    const cleaned: Record<string, string | number | string[]> = {};

    for (const [key, value] of Object.entries(query)) {
        if (
            value === undefined ||
            value === null ||
            value === '' ||
            value === false ||
            (Array.isArray(value) && value.length === 0) ||
            (key === 'sort' && value === 'newest')
        ) {
            continue;
        }

        cleaned[key] =
            value === true ? '1' : (value as string | number | string[]);
    }

    return cleaned;
}

export function SearchBar({
    destinations,
    initial,
    keep = {},
    variant = 'card',
    className,
}: {
    destinations: string[];
    initial?: Partial<SearchValues>;
    keep?: Record<string, unknown>;
    variant?: 'card' | 'pill';
    className?: string;
}) {
    const router = useRouter();
    const id = useId();
    const today = todayIso();

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const query: Record<string, unknown> = { ...keep };

        for (const key of ['destination', 'check_in', 'check_out', 'guests']) {
            const raw = data.get(key);
            const value = typeof raw === 'string' ? raw.trim() : '';
            query[key] = value === '' ? undefined : value;
        }

        const qs = buildQueryString(query);
        router.push(qs ? `/logements?${qs}` : '/logements');
    }

    if (variant === 'pill') {
        return (
            <form
                role="search"
                onSubmit={submit}
                className={cn(
                    'grid gap-2 rounded-3xl bg-white p-2 text-zinc-900 shadow-2xl ring-1 ring-black/5 lg:grid-cols-[1.35fr_2fr_0.95fr_auto] lg:items-center lg:gap-0 lg:rounded-full dark:bg-zinc-900 dark:text-zinc-100 dark:ring-white/10',
                    className,
                )}
            >
                <div className="flex items-center gap-2.5 px-4 py-2 lg:py-1.5">
                    <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.8}
                        className="size-5 shrink-0 text-secondary-800 dark:text-primary-400"
                        aria-hidden="true"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                        />
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
                        />
                    </svg>
                    <input
                        id={`${id}-destination`}
                        name="destination"
                        list={`${id}-destinations`}
                        placeholder="Où voulez-vous aller ?"
                        aria-label="Destination"
                        defaultValue={initial?.destination ?? ''}
                        autoComplete="off"
                        className="w-full min-w-0 bg-transparent text-sm font-medium text-zinc-900 placeholder:text-zinc-500 focus:outline-none dark:text-zinc-100 dark:placeholder:text-zinc-400"
                    />
                    <datalist id={`${id}-destinations`}>
                        {destinations.map((destination) => (
                            <option key={destination} value={destination} />
                        ))}
                    </datalist>
                </div>

                <div className="flex items-center gap-2 border-t border-zinc-200 px-4 py-2 lg:border-t-0 lg:border-l lg:py-1.5 dark:border-zinc-800">
                    <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.8}
                        className="size-5 shrink-0 text-secondary-800 dark:text-primary-400"
                        aria-hidden="true"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
                        />
                    </svg>
                    <div className="flex min-w-0 flex-1 items-center gap-1.5">
                        <input
                            id={`${id}-check-in`}
                            name="check_in"
                            type="date"
                            min={today}
                            aria-label="Date d’arrivée"
                            title="Arrivée"
                            defaultValue={initial?.check_in ?? ''}
                            className="min-w-0 flex-1 bg-transparent text-xs font-medium text-zinc-700 focus:outline-none sm:text-sm dark:text-zinc-200"
                        />
                        <span
                            className="shrink-0 text-xs text-zinc-400"
                            aria-hidden="true"
                        >
                            →
                        </span>
                        <input
                            id={`${id}-check-out`}
                            name="check_out"
                            type="date"
                            min={addDays(today, 1)}
                            aria-label="Date de départ"
                            title="Départ"
                            defaultValue={initial?.check_out ?? ''}
                            className="min-w-0 flex-1 bg-transparent text-xs font-medium text-zinc-700 focus:outline-none sm:text-sm dark:text-zinc-200"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2 border-t border-zinc-200 px-4 py-2 lg:border-t-0 lg:border-l lg:py-1.5 dark:border-zinc-800">
                    <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.8}
                        className="size-5 shrink-0 text-secondary-800 dark:text-primary-400"
                        aria-hidden="true"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
                        />
                    </svg>
                    <select
                        id={`${id}-guests`}
                        name="guests"
                        aria-label="Voyageurs ou occupants"
                        defaultValue={
                            initial?.guests ? String(initial.guests) : ''
                        }
                        className="w-full cursor-pointer bg-transparent text-sm font-medium text-zinc-800 focus:outline-none dark:text-zinc-100"
                    >
                        <option value="">Voyageurs</option>
                        {Array.from({ length: 12 }, (_, idx) => (
                            <option key={idx + 1} value={idx + 1}>
                                {plural(idx + 1, 'voyageur')}
                            </option>
                        ))}
                    </select>
                </div>

                <Button
                    type="submit"
                    size="lg"
                    className="w-full rounded-2xl! bg-primary-500 px-6 hover:bg-primary-600 lg:w-auto lg:rounded-full!"
                >
                    <svg
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="size-4"
                        aria-hidden="true"
                    >
                        <path
                            fillRule="evenodd"
                            d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z"
                            clipRule="evenodd"
                        />
                    </svg>
                    Rechercher
                </Button>
            </form>
        );
    }

    return (
        <form
            role="search"
            onSubmit={submit}
            className={cn(
                'grid gap-3 rounded-2xl bg-white p-3 text-zinc-900 shadow-lg ring-1 ring-zinc-200 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_auto] lg:items-end dark:bg-zinc-900 dark:text-zinc-100 dark:ring-zinc-800',
                className,
            )}
        >
            <div className="flex flex-col gap-1 sm:col-span-2 lg:col-span-1">
                <Label htmlFor={`${id}-destination`}>Destination</Label>
                <Input
                    id={`${id}-destination`}
                    name="destination"
                    list={`${id}-destinations`}
                    placeholder="Ville ou pays"
                    defaultValue={initial?.destination ?? ''}
                    autoComplete="off"
                />
                <datalist id={`${id}-destinations`}>
                    {destinations.map((destination) => (
                        <option key={destination} value={destination} />
                    ))}
                </datalist>
            </div>
            <div className="flex flex-col gap-1">
                <Label htmlFor={`${id}-check-in`}>Arrivée</Label>
                <Input
                    id={`${id}-check-in`}
                    name="check_in"
                    type="date"
                    min={today}
                    defaultValue={initial?.check_in ?? ''}
                />
            </div>
            <div className="flex flex-col gap-1">
                <Label htmlFor={`${id}-check-out`}>Départ</Label>
                <Input
                    id={`${id}-check-out`}
                    name="check_out"
                    type="date"
                    min={addDays(today, 1)}
                    defaultValue={initial?.check_out ?? ''}
                />
            </div>
            <div className="flex flex-col gap-1">
                <Label htmlFor={`${id}-guests`}>Voyageurs</Label>
                <Input
                    id={`${id}-guests`}
                    name="guests"
                    type="number"
                    min={1}
                    max={30}
                    placeholder="1"
                    defaultValue={initial?.guests ?? ''}
                />
            </div>
            <Button
                type="submit"
                size="md"
                className="sm:col-span-2 lg:col-span-1"
            >
                Rechercher
            </Button>
        </form>
    );
}

