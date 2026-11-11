'use client';

import { useState, useTransition } from 'react';
import {
    deleteCountryAction,
    saveCountryAction,
} from '@/lib/actions/admin';
import type { FieldErrors } from '@/lib/actions/types';
import { DataTable } from '@/components/admin/filters';
import { RecordActions } from '@/components/admin/record-actions';
import { Button } from '@/components/button';
import { Badge } from '@/components/card';
import { Checkbox, Field, Input } from '@/components/form';
import { Modal } from '@/components/modal';
import { useActionFeedback } from '@/components/use-action-feedback';
import type { AdminCountry } from '@/types';

type CountryFormState = {
    name: string;
    code: string;
    flag_emoji: string;
    sort_order: string;
    is_active: boolean;
};

const emptyForm: CountryFormState = {
    name: '',
    code: '',
    flag_emoji: '',
    sort_order: '0',
    is_active: true,
};

export function AdminCountriesClient({
    countries,
}: {
    countries: AdminCountry[];
}) {
    const { applyResult } = useActionFeedback();
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<AdminCountry | null>(null);
    const [form, setForm] = useState<CountryFormState>(emptyForm);
    const [errors, setErrors] = useState<FieldErrors>({});
    const [isPending, startTransition] = useTransition();

    function openCreate() {
        setEditing(null);
        setForm(emptyForm);
        setErrors({});
        setModalOpen(true);
    }

    function openEdit(country: AdminCountry) {
        setEditing(country);
        setForm({
            name: country.name,
            code: country.code,
            flag_emoji: country.flag_emoji ?? '',
            sort_order: String(country.sort_order),
            is_active: country.is_active,
        });
        setErrors({});
        setModalOpen(true);
    }

    function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setErrors({});
        startTransition(async () => {
            const res = await saveCountryAction({
                id: editing?.id,
                values: {
                    name: form.name,
                    code: form.code,
                    flag_emoji: form.flag_emoji || null,
                    sort_order: form.sort_order,
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
                    <h1 className="text-2xl font-bold tracking-tight">Pays</h1>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        Pays couverts dans la recherche et la création d’annonces.
                    </p>
                </div>
                <Button onClick={openCreate}>Ajouter un pays</Button>
            </div>

            <DataTable
                head={['Pays', 'Code ISO', 'Villes', 'Ordre', 'Statut', '']}
                empty={countries.length === 0 ? 'Aucun pays enregistré.' : false}
            >
                {countries.map((country) => (
                    <tr key={country.id}>
                        <td className="px-4 py-3 font-medium">
                            {country.flag_emoji ? `${country.flag_emoji} ` : ''}
                            {country.name}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-zinc-600 dark:text-zinc-300">
                            {country.code}
                        </td>
                        <td className="px-4 py-3 tabular-nums">
                            {country.cities}
                        </td>
                        <td className="px-4 py-3 text-zinc-500 tabular-nums">
                            {country.sort_order}
                        </td>
                        <td className="px-4 py-3">
                            <Badge
                                tone={country.is_active ? 'success' : 'neutral'}
                            >
                                {country.is_active ? 'Actif' : 'Inactif'}
                            </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                            <RecordActions
                                label={country.name}
                                canDelete={country.cities === 0}
                                onEdit={() => openEdit(country)}
                                onDelete={async () => {
                                    const res = await deleteCountryAction(
                                        country.id,
                                    );
                                    applyResult(res);
                                }}
                            />
                        </td>
                    </tr>
                ))}
            </DataTable>

            <Modal
                open={modalOpen}
                onClose={() => {
                    if (!isPending) {
                        setModalOpen(false);
                    }
                }}
                title={editing ? `Modifier ${editing.name}` : 'Ajouter un pays'}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Field
                        label="Nom"
                        htmlFor="country-name"
                        error={errors.name}
                    >
                        <Input
                            id="country-name"
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

                    <div className="grid grid-cols-3 gap-3">
                        <Field
                            label="Code ISO"
                            htmlFor="country-code"
                            error={errors.code}
                        >
                            <Input
                                id="country-code"
                                value={form.code}
                                maxLength={2}
                                placeholder="FR"
                                className="uppercase"
                                onChange={(event) =>
                                    setForm((prev) => ({
                                        ...prev,
                                        code: event.target.value.toUpperCase(),
                                    }))
                                }
                                aria-invalid={Boolean(errors.code)}
                                required
                            />
                        </Field>
                        <Field
                            label="Drapeau"
                            htmlFor="country-flag"
                            error={errors.flag_emoji}
                        >
                            <Input
                                id="country-flag"
                                value={form.flag_emoji}
                                placeholder="🇫🇷"
                                onChange={(event) =>
                                    setForm((prev) => ({
                                        ...prev,
                                        flag_emoji: event.target.value,
                                    }))
                                }
                                aria-invalid={Boolean(errors.flag_emoji)}
                            />
                        </Field>
                        <Field
                            label="Ordre"
                            htmlFor="country-order"
                            error={errors.sort_order}
                        >
                            <Input
                                id="country-order"
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
                        Pays actif sur le site
                    </label>

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

