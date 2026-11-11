import { Head, InfiniteScroll, router, usePage } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { useId, useRef, useState } from 'react';
import { Button } from '@/components/button';
import { Container } from '@/components/card';
import { Checkbox, Input, InputError, Label } from '@/components/form';
import { Modal } from '@/components/modal';
import { PropertyCard, PropertyCardSkeleton } from '@/components/property-card';
import { cleanQuery, SearchBar } from '@/components/search-bar';
import { plural } from '@/lib/format';
import { index } from '@/routes/properties';
import type {
    Option,
    PropertyCard as PropertyCardData,
    SearchFilters,
} from '@/types';

type Props = {
    properties: { data: PropertyCardData[] };
    total: number;
    filters: SearchFilters;
    options: {
        types: Option[];
        sorts: Option[];
        amenities: { slug: string; name: string }[];
        destinations: string[];
    };
};

function visit(filters: Partial<SearchFilters>) {
    router.get(index.url(), cleanQuery(filters), {
        preserveState: true,
        reset: ['properties'],
    });
}

function toggle(list: string[], value: string): string[] {
    return list.includes(value)
        ? list.filter((item) => item !== value)
        : [...list, value];
}

function FilterPanel({ filters, options }: Pick<Props, 'filters' | 'options'>) {
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

        visit({
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
                            visit({ ...filters, instant: !filters.instant })
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
                                visit({
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
                                visit({
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

export default function PropertiesIndex({
    properties,
    total,
    filters,
    options,
}: Props) {
    const { errors } = usePage().props;
    const [filtersOpen, setFiltersOpen] = useState(false);
    const gridRef = useRef<HTMLDivElement>(null);
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
    const heading = filters.destination
        ? `Logements à ${filters.destination.charAt(0).toUpperCase()}${filters.destination.slice(1)}`
        : 'Tous les logements';

    return (
        <>
            <Head title={heading}>
                <meta
                    head-key="description"
                    name="description"
                    content={`${heading} : comparez les prix, les équipements et les disponibilités, puis réservez en ligne sur GuestHoster.`}
                />
            </Head>

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
                    <div className="mt-2 flex flex-col gap-1">
                        {['check_in', 'check_out', 'guests', 'destination'].map(
                            (key) => (
                                <InputError key={key} message={errors[key]} />
                            ),
                        )}
                    </div>
                </Container>
            </div>

            <Container className="grid gap-10 py-10 lg:grid-cols-[16rem_1fr]">
                <aside className="hidden lg:block" aria-label="Filtres">
                    <FilterPanel filters={filters} options={options} />
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
                        <InfiniteScroll
                            data="properties"
                            onlyNext
                            buffer={400}
                            itemsElement={gridRef}
                            loading={
                                <div className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
                                    {Array.from(
                                        { length: 3 },
                                        (_, skeleton) => (
                                            <PropertyCardSkeleton
                                                key={skeleton}
                                            />
                                        ),
                                    )}
                                </div>
                            }
                        >
                            <div
                                ref={gridRef}
                                className="grid gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-3"
                            >
                                {properties.data.map((property) => (
                                    <PropertyCard
                                        key={property.id}
                                        property={property}
                                        query={stayQuery}
                                    />
                                ))}
                            </div>
                        </InfiniteScroll>
                    )}
                </section>
            </Container>

            <Modal
                open={filtersOpen}
                onClose={() => setFiltersOpen(false)}
                title="Filtres"
            >
                <FilterPanel filters={filters} options={options} />
            </Modal>
        </>
    );
}
