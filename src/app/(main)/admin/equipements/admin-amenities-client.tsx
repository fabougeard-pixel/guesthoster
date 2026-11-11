'use client';

import { useState, useTransition } from 'react';
import {
    deleteAmenityAction,
    saveAmenityAction,
} from '@/lib/actions/admin';
import type { FieldErrors } from '@/lib/actions/types';
import { AMENITY_CATEGORY_OPTIONS } from '@/lib/domain/enums';
import { DataTable } from '@/components/admin/filters';
import { RecordActions } from '@/components/admin/record-actions';
import { Button } from '@/components/button';
import { Badge } from '@/components/card';
import { Field, Input, Select } from '@/components/form';
import { Modal } from '@/components/modal';
import { useActionFeedback } from '@/components/use-action-feedback';
import type { AdminAmenity } from '@/types';

type AmenityFormState = {
    name: string;
    category: string;
    icon: string;
    sort_order: string;
};

const emptyForm: AmenityFormState = {
    name: '',
    category: AMENITY_CATEGORY_OPTIONS[0]?.value ?? 'essential',
    icon: '',
    sort_order: '0',
};

export function AdminAmenitiesClient({
    amenities,
}: {
    amenities: AdminAmenity[];
}) {
    const { applyResult } = useActionFeedback();
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<AdminAmenity | null>(null);
    const [form, setForm] = useState<AmenityFormState>(emptyForm);
    const [errors, setErrors] = useState<FieldErrors>({});
    const [isPending, startTransition] = useTransition();

    function openCreate() {
        setEditing(null);
        setForm(emptyForm);
        setErrors({});
        setModalOpen(true);
    }

    function openEdit(amenity: AdminAmenity) {
        setEditing(amenity);
        setForm({
            name: amenity.name,
            category: amenity.category,
            icon: amenity.icon ?? '',
            sort_order: String(amenity.sort_order),
        });
        setErrors({});
        setModalOpen(true);
    }

    function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setErrors({});
        startTransition(async () => {
            const res = await saveAmenityAction({
                id: editing?.id,
                values: {
                    name: form.name,
                    category: form.category,
                    icon: form.icon || null,
                    sort_order: form.sort_order,
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
                    <h1 className="text-2xl font-bold tracking-tight">
                        Équipements
                    </h1>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        Liste des équipements disponibles dans les filtres et les
                        annonces.
                    </p>
                </div>
                <Button onClick={openCreate}>Ajouter un équipement</Button>
            </div>

            <DataTable
                head={['Nom', 'Catégorie', 'Icône', 'Annonces', 'Ordre', '']}
                empty={
                    amenities.length === 0
                        ? 'Aucun équipement enregistré.'
                        : false
                }
            >
                {amenities.map((amenity) => (
                    <tr key={amenity.id}>
                        <td className="px-4 py-3 font-medium">
                            {amenity.name}
                        </td>
                        <td className="px-4 py-3">
                            <Badge>{amenity.category_label}</Badge>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-zinc-500">
                            {amenity.icon ?? '—'}
                        </td>
                        <td className="px-4 py-3 tabular-nums">
                            {amenity.properties}
                        </td>
                        <td className="px-4 py-3 text-zinc-500 tabular-nums">
                            {amenity.sort_order}
                        </td>
                        <td className="px-4 py-3 text-right">
                            <RecordActions
                                label={amenity.name}
                                canDelete={amenity.properties === 0}
                                onEdit={() => openEdit(amenity)}
                                onDelete={async () => {
                                    const res = await deleteAmenityAction(
                                        amenity.id,
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
                title={
                    editing
                        ? `Modifier ${editing.name}`
                        : 'Ajouter un équipement'
                }
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Field
                        label="Nom"
                        htmlFor="amenity-name"
                        error={errors.name}
                    >
                        <Input
                            id="amenity-name"
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
                        label="Catégorie"
                        htmlFor="amenity-category"
                        error={errors.category}
                    >
                        <Select
                            id="amenity-category"
                            value={form.category}
                            onChange={(event) =>
                                setForm((prev) => ({
                                    ...prev,
                                    category: event.target.value,
                                }))
                            }
                            aria-invalid={Boolean(errors.category)}
                        >
                            {AMENITY_CATEGORY_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </Select>
                    </Field>

                    <div className="grid grid-cols-2 gap-3">
                        <Field
                            label="Icône (optionnel)"
                            htmlFor="amenity-icon"
                            error={errors.icon}
                        >
                            <Input
                                id="amenity-icon"
                                value={form.icon}
                                placeholder="wifi"
                                onChange={(event) =>
                                    setForm((prev) => ({
                                        ...prev,
                                        icon: event.target.value,
                                    }))
                                }
                                aria-invalid={Boolean(errors.icon)}
                            />
                        </Field>
                        <Field
                            label="Ordre"
                            htmlFor="amenity-order"
                            error={errors.sort_order}
                        >
                            <Input
                                id="amenity-order"
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

