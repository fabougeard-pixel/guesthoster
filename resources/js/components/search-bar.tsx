import { router } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { useId } from 'react';
import { Button } from '@/components/button';
import { Input, Label } from '@/components/form';
import { cn } from '@/lib/utils';
import { addDays, todayIso } from '@/lib/format';
import { index } from '@/routes/properties';
import type { SearchFilters } from '@/types';

type SearchValues = Pick<
    SearchFilters,
    'destination' | 'check_in' | 'check_out' | 'guests'
>;

/**
 * Barre de recherche principale (destination, dates, voyageurs). Les autres
 * filtres déjà actifs sont conservés.
 */
export function SearchBar({
    destinations,
    initial,
    keep = {},
    className,
}: {
    destinations: string[];
    initial?: Partial<SearchValues>;
    keep?: Record<string, unknown>;
    className?: string;
}) {
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

        router.get(index.url(), cleanQuery(query), {
            reset: ['properties'],
        });
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

/**
 * Retire les valeurs vides et les valeurs par défaut pour garder des URL courtes.
 */
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
