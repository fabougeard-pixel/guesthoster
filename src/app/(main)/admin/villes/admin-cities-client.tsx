'use client';

import { useState, useTransition } from 'react';
import { deleteCityAction, saveCityAction } from '@/lib/actions/admin';
import type { FieldErrors } from '@/lib/actions/types';
import {
    DataTable,
    FilterBar,
    buildFilterUrl,
} from '@/components/admin/filters';
import { RecordActions } from '@/components/admin/record-actions';
import { Button } from '@/components/button';
import { Badge } from '@/components/card';
import { Checkbox, Field, Input, Select } from '@/components/form';
import { Modal } from '@/components/modal';
import { Pagination } from '@/components/pagination';
import { useActionFeedback } from '@/components/use-action-feedback';
import type { AdminCity, Paginated } from '@/types';

type CityFormState = {
    country_id: string;
    name: string;
    latitude: string;
    longitude: string;
    sort_order: string;
    is_popular: boolean;
    is_active: boolean;
};

type Props = {
    cities: Paginated<AdminCity>;
    countries: { id: number; name: string }[];
    filters: {
        search: string;
        country: string;
    };
};

export function AdminCitiesClient({ cities, countries, filters }: Props) {
    const { applyResult, router } = useActionFeedback();
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<AdminCity | null>(null);
    const [form, setForm] = useState<CityFormState>({
        country_id: countries[0] ? String(countries[0].id) : '',
        name: '',
        latitude: '',
        longitude: '',
        sort_order: '0',
        is_popular: false,
        is_active: true,
    });
    const [errors, setErrors] = useState<FieldErrors>({});
    const [isPending, startTransition] = useTransition();

    function applyFilter(next: Partial<Props['filters']>) {
        const merged = { ...filters, ...next };
        router.push(
            buildFilterUrl('/admin/villes', {
                search: merged.search || undefined,
                country: merged.country || undefined,
            }),
        );
    }

    function openCreate() {
        setEditing(null);
        setForm({
            country_id:
                filters.country ||
                (countries[0] ? String(countries[0].id) : ''),
            name: '',
            latitude: '',
            longitude: '',
            sort_order: '0',
            is_popular: false,
            is_active: true,
        });
        setErrors({});
        setModalOpen(true);
    }

    function openEdit(city: AdminCity) {
        setEditing(city);
        setForm({
            country_id: String(city.country_id),
            name: city.name,
            latitude: city.latitude !== null ? String(city.latitude) : '',
            longitude: city.longitude !== null ? String(city.longitude) : '',
            sort_order: String(city.sort_order),
            is_popular: city.is_popular,
            is_active: city.is_active,
        });
        setErrors({});
        setModalOpen(true);
    }

    function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setErrors({});
        startTransition(async () => {
            const res = await saveCityAction({
                id: editing?.id,
                values: {
                    country_id: form.country_id,
                    name: form.name,
                    latitude: form.latitude,
                    longitude: form.longitude,
                    sort_order: form.sort_order,
                    is_popular: form.is_popular,
                    is_active: form.is_active,
                },
            });
            applyResult(res, {
                setFieldErrors: setErrors,
                onSuccess: () => {
                    setModalOpen(false);
                    setEditing(null);
                },
            });
        });
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Villes</h1>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        Villes proposées à l’accueil et dans le formulaire d’annonce.
                    </p>
                </div>
                <Button onClick={openCreate}>Ajouter une ville</Button>
            </div>

            <FilterBar
                key={`${filters.search}:${filters.country}`}
                search={filters.search}
                placeholder="Rechercher une ville ou un pays…"
                onSearch={(search) => applyFilter({ search })}
            >
                <Select
                    aria-label="Filtrer par pays"
                    className="sm:w-52"
                    value={filters.country}
                    onChange={(event) =>
                        applyFilter({ country: event.target.value })
                    }
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
                head={['Ville', 'Pays', 'Annonces', 'Statut', '']}
                empty={
                    cities.data.length === 0 ? 'Aucune ville enregistrée.' : false
                }
            >
                {cities.data.map((city) => (
                    <tr key={city.id}>
                        <td className="px-4 py-3">
                            <p className="font-medium">{city.name}</p>
                            {city.latitude !== null && city.longitude !== null && (
                                <p className="text-xs text-zinc-500 tabular-nums">
                                    {city.latitude}, {city.longitude}
                                </p>
                            )}
                        </td>
                        <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">
                            {city.country}
                        </td>
                        <td className="px-4 py-3 tabular-nums">
                            {city.properties}
                        </td>
                        <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1.5">
                                <Badge
                                    tone={city.is_active ? 'success' : 'neutral'}
                                >
                                    {city.is_active ? 'Active' : 'Inactive'}
                                </Badge>
                                {city.is_popular && (
                                    <Badge tone="secondary">Populaire</Badge>
                                )}
                            </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                            <RecordActions
                                label={city.name}
                                canDelete={city.properties === 0}
                                onEdit={() => openEdit(city)}
                                onDelete={async () => {
                                    const res = await deleteCityAction(city.id);
                                    applyResult(res);
                                }}
                            />
                        </td>
                    </tr>
                ))}
            </DataTable>

            <Pagination paginator={cities} noun="ville" nounPlural="villes" />

            <Modal
                open={modalOpen}
                onClose={() => {
                    if (!isPending) {
                        setModalOpen(false);
                    }
                }}
                title={editing ? `Modifier ${editing.name}` : 'Ajouter une ville'}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Field
                        label="Pays"
                        htmlFor="city-country"
                        error={errors.country_id}
                    >
                        <Select
                            id="city-country"
                            value={form.country_id}
                            onChange={(event) =>
                                setForm((prev) => ({
                                    ...prev,
                                    country_id: event.target.value,
                                }))
                            }
                            aria-invalid={Boolean(errors.country_id)}
                            required
                        >
                            {countries.map((country) => (
                                <option key={country.id} value={country.id}>
                                    {country.name}
                                </option>
                            ))}
                        </Select>
                    </Field>

                    <div className="grid grid-cols-3 gap-3">
                        <Field
                            label="Nom"
                            htmlFor="city-name"
                            error={errors.name}
                            className="col-span-2"
                        >
                            <Input
                                id="city-name"
                                value={form.name}
                                onChange={(event) =>
                                    setForm((prev) => ({
                                        ...prev,
                                        name: event.target.value,
                                    }))
                                }
                                aria-invalid={Boolean(errors.name)}
                                required
                            />
                        </Field>
                        <Field
                            label="Ordre"
                            htmlFor="city-order"
                            error={errors.sort_order}
                        >
                            <Input
                                id="city-order"
                                type="number"
                                min={0}
                                max={9999}
                                value={form.sort_order}
                                onChange={(event) =>
                                    setForm((prev) => ({
                                        ...prev,
                                        sort_order: event.target.value,
                                    }))
                                }
                                aria-invalid={Boolean(errors.sort_order)}
                            />
                        </Field>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <Field
                            label="Latitude"
                            htmlFor="city-lat"
                            error={errors.latitude}
                        >
                            <Input
                                id="city-lat"
                                type="number"
                                step="any"
                                value={form.latitude}
                                onChange={(event) =>
                                    setForm((prev) => ({
                                        ...prev,
                                        latitude: event.target.value,
                                    }))
                                }
                                aria-invalid={Boolean(errors.latitude)}
                            />
                        </Field>
                        <Field
                            label="Longitude"
                            htmlFor="city-lng"
                            error={errors.longitude}
                        >
                            <Input
                                id="city-lng"
                                type="number"
                                step="any"
                                value={form.longitude}
                                onChange={(event) =>
                                    setForm((prev) => ({
                                        ...prev,
                                        longitude: event.target.value,
                                    }))
                                }
                                aria-invalid={Boolean(errors.longitude)}
                            />
                        </Field>
                    </div>

                    <div className="flex flex-wrap gap-6">
                        <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                            <Checkbox
                                checked={form.is_active}
                                onChange={(event) =>
                                    setForm((prev) => ({
                                        ...prev,
                                        is_active: event.target.checked,
                                    }))
                                }
                            />
                            Ville active
                        </label>
                        <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                            <Checkbox
                                checked={form.is_popular}
                                onChange={(event) =>
                                    setForm((prev) => ({
                                        ...prev,
                                        is_popular: event.target.checked,
                                    }))
                                }
                            />
                            Destination populaire
                        </label>
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setModalOpen(false)}
                            disabled={isPending}
                        >
                            Annuler
                        </Button>
                        <Button type="submit" loading={isPending}>
                            Enregistrer
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}

