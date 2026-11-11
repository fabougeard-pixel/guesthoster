'use client';

import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';
import { useId, useState } from 'react';
import { Button } from '@/components/button';
import { Container } from '@/components/card';
import { Checkbox, Input, Label } from '@/components/form';
import { Modal } from '@/components/modal';
import { Pagination } from '@/components/pagination';
import { PropertyCard } from '@/components/property-card';
import { buildQueryString, cleanQuery, SearchBar } from '@/components/search-bar';
import { plural } from '@/lib/format';
import type {
    Option,
    Paginated,
    PropertyCard as PropertyCardData,
    SearchFilters,
} from '@/types';

type CatalogOptions = {
    types: Option[];
    sorts: Option[];
    amenities: { slug: string; name: string }[];
    destinations: string[];
};

function toggle(list: string[], value: string): string[] {
    return list.includes(value)
        ? list.filter((item) => item !== value)
        : [...list, value];
}

function FilterPanel({
    filters,
    options,
    onVisit,
}: {
    filters: SearchFilters;
    options: CatalogOptions;
    onVisit: (next: Partial<SearchFilters>) => void;
}) {
    const id = useId();
    const [showAllAmenities, setShowAllAmenities] = useState(false);
    const amenities = showAllAmenities
        ? options.amenities
        : options.amenities.slice(0, 8);

    function submitPrice(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const read = (key: string) => {
            const raw = data.get(key);
            const value = typeof raw === 'string' ? raw : '';
            return value === '' ? null : Number(value);
        };

        onVisit({
            ...filters,
            price_min: read('price_min'),
            price_max: read('price_max'),
        });
    }

    return (
        <div className="flex flex-col gap-8">
            <form
                key={`${filters.price_min}-${filters.price_max}`}
                onSubmit={submitPrice}
                className="flex flex-col gap-3"
            >
                <h3 className="font-semibold">Prix par nuit</h3>
                <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                        <Label htmlFor={`${id}-price-min`}>Minimum (€)</Label>
                        <Input
                            id={`${id}-price-min`}
                            name="price_min"
                            type="number"
                            min={0}
                            defaultValue={filters.price_min ?? ''}
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <Label htmlFor={`${id}-price-max`}>Maximum (€)</Label>
                        <Input
                            id={`${id}-price-max`}
                            name="price_max"
                            type="number"
                            min={0}
                            defaultValue={filters.price_max ?? ''}
                        />
                    </div>
                </div>
                <Button type="submit" variant="outline" size="sm">
                    Appliquer
                </Button>
            </form>

            <fieldset className="flex flex-col gap-2">
                <legend className="mb-2 font-semibold">Réservation</legend>
                <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                        checked={filters.instant}
                        onChange={() =>
                            onVisit({ ...filters, instant: !filters.instant })
                        }
                    />
                    Réservation instantanée uniquement
                </label>
            </fieldset>

            <fieldset className="flex flex-col gap-2">
                <legend className="mb-2 font-semibold">Type de logement</legend>
                {options.types.map((type) => (
                    <label
                        key={type.value}
                        className="flex items-center gap-2 text-sm"
                    >
                        <Checkbox
                            checked={filters.types.includes(type.value)}
                            onChange={() =>
                                onVisit({
                                    ...filters,
                                    types: toggle(filters.types, type.value),
                                })
                            }
                        />
                        {type.label}
                    </label>
                ))}
            </fieldset>

            <fieldset className="flex flex-col gap-2">
                <legend className="mb-2 font-semibold">Équipements</legend>
                {amenities.map((amenity) => (
                    <label
                        key={amenity.slug}
                        className="flex items-center gap-2 text-sm"
                    >
                        <Checkbox
                            checked={filters.amenities.includes(amenity.slug)}
                            onChange={() =>
                                onVisit({
                                    ...filters,
                                    amenities: toggle(
                                        filters.amenities,
                                        amenity.slug,
                                    ),
                                })
                            }
                        />
                        {amenity.name}
                    </label>
                ))}
                {options.amenities.length > 8 && (
                    <button
                        type="button"
                        onClick={() => setShowAllAmenities(!showAllAmenities)}
                        className="self-start text-sm font-medium text-primary-700 underline-offset-4 hover:underline dark:text-primary-400"
                    >
                        {showAllAmenities
                            ? 'Afficher moins'
                            : `Afficher les ${options.amenities.length} équipements`}
                    </button>
                )}
            </fieldset>
        </div>
    );
}

export function CatalogClient({
    properties,
    total,
    filters,
    options,
    heading,
}: {
    properties: Paginated<PropertyCardData>;
    total: number;
    filters: SearchFilters;
    options: CatalogOptions;
    heading: string;
}) {
    const router = useRouter();
    const [filtersOpen, setFiltersOpen] = useState(false);

    function visit(next: Partial<SearchFilters>) {
        const qs = buildQueryString(next);
        router.push(qs ? `/logements?${qs}` : '/logements');
    }

    const activeFilters =
        filters.types.length +
        filters.amenities.length +
        (filters.instant ? 1 : 0) +
        (filters.price_min !== null || filters.price_max !== null ? 1 : 0);

    const stayQuery = cleanQuery({
        check_in: filters.check_in,
        check_out: filters.check_out,
        guests: filters.guests,
    }) as Record<string, string>;

    return (
        <>
            <div className="border-b border-zinc-200 bg-zinc-50 py-6 dark:border-zinc-800 dark:bg-zinc-900/50">
                <Container>
                    <SearchBar
                        key={[
                            filters.destination,
                            filters.check_in,
                            filters.check_out,
                            filters.guests,
                        ].join('|')}
                        destinations={options.destinations}
                        initial={filters}
                        keep={{
                            ...filters,
                            destination: undefined,
                            check_in: undefined,
                            check_out: undefined,
                            guests: undefined,
                        }}
                    />
                </Container>
            </div>

            <Container className="grid gap-10 py-10 lg:grid-cols-[16rem_1fr]">
                <aside className="hidden lg:block" aria-label="Filtres">
                    <FilterPanel
                        filters={filters}
                        options={options}
                        onVisit={visit}
                    />
                </aside>

                <section
                    aria-labelledby="results-heading"
                    className="flex flex-col gap-6"
                >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h1
                                id="results-heading"
                                className="text-2xl font-semibold"
                            >
                                {heading}
                            </h1>
                            <p
                                className="text-sm text-zinc-500 dark:text-zinc-400"
                                aria-live="polite"
                            >
                                {total === 0
                                    ? 'Aucun résultat'
                                    : plural(
                                          total,
                                          'logement disponible',
                                          'logements disponibles',
                                      )}
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="lg:hidden"
                                onClick={() => setFiltersOpen(true)}
                            >
                                Filtres
                                {activeFilters > 0 && ` (${activeFilters})`}
                            </Button>
                            <label htmlFor="sort" className="sr-only">
                                Trier par
                            </label>
                            <select
                                id="sort"
                                value={filters.sort}
                                onChange={(event) =>
                                    visit({
                                        ...filters,
                                        sort: event.target.value,
                                    })
                                }
                                className="h-8 rounded-lg border border-zinc-300 bg-white px-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                            >
                                {options.sorts.map((sort) => (
                                    <option key={sort.value} value={sort.value}>
                                        {sort.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {total === 0 ? (
                        <div className="rounded-2xl border border-dashed border-zinc-300 px-6 py-16 text-center dark:border-zinc-700">
                            <p className="font-medium">
                                Aucun logement ne correspond à votre recherche.
                            </p>
                            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                                Essayez d’autres dates ou retirez quelques
                                filtres.
                            </p>
                            <Button
                                variant="outline"
                                className="mt-6"
                                onClick={() => visit({})}
                            >
                                Réinitialiser la recherche
                            </Button>
                        </div>
                    ) : (
                        <>
                            <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
                                {properties.data.map((property) => (
                                    <PropertyCard
                                        key={property.id}
                                        property={property}
                                        query={stayQuery}
                                    />
                                ))}
                            </div>
                            <Pagination
                                paginator={properties}
                                noun="logement"
                            />
                        </>
                    )}
                </section>
            </Container>

            <Modal
                open={filtersOpen}
                onClose={() => setFiltersOpen(false)}
                title="Filtres"
            >
                <FilterPanel
                    filters={filters}
                    options={options}
                    onVisit={(next) => {
                        setFiltersOpen(false);
                        visit(next);
                    }}
                />
            </Modal>
        </>
    );
}

