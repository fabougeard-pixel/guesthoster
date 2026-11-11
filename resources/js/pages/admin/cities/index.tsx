import { Form, Head } from '@inertiajs/react';
import { useState } from 'react';
import { applyFilters, DataTable, FilterBar } from '@/components/admin/filters';
import { RecordActions } from '@/components/admin/record-actions';
import { Button } from '@/components/button';
import { Badge } from '@/components/card';
import { Checkbox, Field, Input, Select } from '@/components/form';
import { Modal } from '@/components/modal';
import { Pagination } from '@/components/pagination';
import { destroy, index, store, update } from '@/routes/admin/cities';
import type { AdminCity, Paginated } from '@/types';

type Country = { id: number; name: string };

type Props = {
    cities: Paginated<AdminCity>;
    filters: { country: number | null; q: string | null };
    countries: Country[];
};

function CityForm({
    city,
    countries,
    defaultCountry,
    onDone,
}: {
    city: AdminCity | null;
    countries: Country[];
    defaultCountry: number | null;
    onDone: () => void;
}) {
    return (
        <Form
            {...(city ? update.form(city.id) : store.form())}
            options={{ preserveScroll: true }}
            onSuccess={onDone}
            className="flex flex-col gap-4"
        >
            {({ errors, processing }) => (
                <>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Nom" htmlFor="name" error={errors.name}>
                            <Input
                                id="name"
                                name="name"
                                defaultValue={city?.name}
                                required
                                maxLength={100}
                            />
                        </Field>
                        <Field
                            label="Pays"
                            htmlFor="country_id"
                            error={errors.country_id}
                        >
                            <Select
                                id="country_id"
                                name="country_id"
                                defaultValue={
                                    city?.country_id ??
                                    defaultCountry ??
                                    countries[0]?.id
                                }
                                required
                            >
                                {countries.map((country) => (
                                    <option key={country.id} value={country.id}>
                                        {country.name}
                                    </option>
                                ))}
                            </Select>
                        </Field>
                        <Field
                            label="Latitude"
                            htmlFor="latitude"
                            error={errors.latitude}
                        >
                            <Input
                                id="latitude"
                                name="latitude"
                                type="number"
                                step="any"
                                min={-90}
                                max={90}
                                defaultValue={city?.latitude ?? ''}
                            />
                        </Field>
                        <Field
                            label="Longitude"
                            htmlFor="longitude"
                            error={errors.longitude}
                        >
                            <Input
                                id="longitude"
                                name="longitude"
                                type="number"
                                step="any"
                                min={-180}
                                max={180}
                                defaultValue={city?.longitude ?? ''}
                            />
                        </Field>
                        <Field
                            label="Ordre d’affichage"
                            htmlFor="sort_order"
                            error={errors.sort_order}
                            hint="Ordre parmi les destinations populaires."
                        >
                            <Input
                                id="sort_order"
                                name="sort_order"
                                type="number"
                                min={0}
                                defaultValue={city?.sort_order ?? 0}
                                required
                            />
                        </Field>
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                        <Checkbox
                            name="is_active"
                            value="1"
                            defaultChecked={city?.is_active ?? true}
                        />
                        Proposée aux hôtes et aux voyageurs
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                        <Checkbox
                            name="is_popular"
                            value="1"
                            defaultChecked={city?.is_popular ?? false}
                        />
                        Destination populaire (page d’accueil)
                    </label>
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={onDone}>
                            Annuler
                        </Button>
                        <Button type="submit" loading={processing}>
                            Enregistrer
                        </Button>
                    </div>
                </>
            )}
        </Form>
    );
}

export default function AdminCities({ cities, filters, countries }: Props) {
    const [editing, setEditing] = useState<AdminCity | 'new' | null>(null);
    const current = editing === 'new' ? null : editing;
    const filter = (query: Record<string, unknown>) =>
        applyFilters(index.url(), {
            pays: filters.country,
            q: filters.q,
            ...query,
        });

    return (
        <>
            <Head title="Villes" />
            <div className="flex flex-wrap items-center justify-between gap-4">
                <h1 className="text-2xl font-semibold">Villes</h1>
                <Button
                    onClick={() => setEditing('new')}
                    disabled={countries.length === 0}
                >
                    Ajouter une ville
                </Button>
            </div>

            <FilterBar
                search={filters.q}
                placeholder="Nom de la ville…"
                onSearch={(q) => filter({ q })}
                className="mt-6 mb-4"
            >
                <Select
                    aria-label="Pays"
                    value={filters.country ?? ''}
                    onChange={(event) => filter({ pays: event.target.value })}
                    className="sm:w-56"
                >
                    <option value="">Tous les pays</option>
                    {countries.map((country) => (
                        <option key={country.id} value={country.id}>
                            {country.name}
                        </option>
                    ))}
                </Select>
            </FilterBar>

            <DataTable
                head={['Ville', 'Pays', 'Logements', 'Statut', '']}
                empty={
                    cities.data.length === 0 && 'Aucune ville ne correspond.'
                }
            >
                {cities.data.map((city) => (
                    <tr key={city.id}>
                        <td className="px-4 py-3 font-medium">{city.name}</td>
                        <td className="px-4 py-3">{city.country}</td>
                        <td className="px-4 py-3 tabular-nums">
                            {city.properties}
                        </td>
                        <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                                {city.is_active ? (
                                    <Badge tone="success">Active</Badge>
                                ) : (
                                    <Badge>Inactive</Badge>
                                )}
                                {city.is_popular && (
                                    <Badge tone="primary">Populaire</Badge>
                                )}
                            </div>
                        </td>
                        <td className="px-4 py-3">
                            <RecordActions
                                onEdit={() => setEditing(city)}
                                destroy={destroy(city.id)}
                                label={city.name}
                                canDelete={city.properties === 0}
                            />
                        </td>
                    </tr>
                ))}
            </DataTable>

            <Pagination paginator={cities} noun="ville" />

            <Modal
                open={editing !== null}
                onClose={() => setEditing(null)}
                title={current ? `Modifier ${current.name}` : 'Nouvelle ville'}
            >
                {editing !== null && (
                    <CityForm
                        key={current?.id ?? 'new'}
                        city={current}
                        countries={countries}
                        defaultCountry={filters.country}
                        onDone={() => setEditing(null)}
                    />
                )}
            </Modal>
        </>
    );
}
