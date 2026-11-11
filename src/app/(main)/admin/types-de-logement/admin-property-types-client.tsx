'use client';

import { useState, useTransition } from 'react';
import {
    deletePropertyTypeAction,
    savePropertyTypeAction,
} from '@/lib/actions/admin';
import type { FieldErrors } from '@/lib/actions/types';
import { DataTable } from '@/components/admin/filters';
import { RecordActions } from '@/components/admin/record-actions';
import { Button } from '@/components/button';
import { Badge } from '@/components/card';
import { Checkbox, Field, Input } from '@/components/form';
import { Modal } from '@/components/modal';
import { useActionFeedback } from '@/components/use-action-feedback';
import type { AdminPropertyType } from '@/types';

type PropertyTypeFormState = {
    name: string;
    sort_order: string;
    is_active: boolean;
};

const emptyForm: PropertyTypeFormState = {
    name: '',
    sort_order: '0',
    is_active: true,
};

export function AdminPropertyTypesClient({
    propertyTypes,
}: {
    propertyTypes: AdminPropertyType[];
}) {
    const { applyResult } = useActionFeedback();
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<AdminPropertyType | null>(null);
    const [form, setForm] = useState<PropertyTypeFormState>(emptyForm);
    const [errors, setErrors] = useState<FieldErrors>({});
    const [isPending, startTransition] = useTransition();

    function openCreate() {
        setEditing(null);
        setForm(emptyForm);
        setErrors({});
        setModalOpen(true);
    }

    function openEdit(item: AdminPropertyType) {
        setEditing(item);
        setForm({
            name: item.name,
            sort_order: String(item.sort_order),
            is_active: item.is_active,
        });
        setErrors({});
        setModalOpen(true);
    }

    function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setErrors({});
        startTransition(async () => {
            const res = await savePropertyTypeAction({
                id: editing?.id,
                values: {
                    name: form.name,
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
                    <h1 className="text-2xl font-bold tracking-tight">
                        Types de logement
                    </h1>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        Catégories disponibles lors du dépôt d’annonce.
                    </p>
                </div>
                <Button onClick={openCreate}>Ajouter un type</Button>
            </div>

            <DataTable
                head={['Nom', 'Annonces', 'Ordre', 'Statut', '']}
                empty={
                    propertyTypes.length === 0
                        ? 'Aucun type de logement enregistré.'
                        : false
                }
            >
                {propertyTypes.map((item) => (
                    <tr key={item.id}>
                        <td className="px-4 py-3 font-medium">{item.name}</td>
                        <td className="px-4 py-3 tabular-nums">
                            {item.properties}
                        </td>
                        <td className="px-4 py-3 text-zinc-500 tabular-nums">
                            {item.sort_order}
                        </td>
                        <td className="px-4 py-3">
                            <Badge
                                tone={item.is_active ? 'success' : 'neutral'}
                            >
                                {item.is_active ? 'Actif' : 'Inactif'}
                            </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                            <RecordActions
                                label={item.name}
                                canDelete={item.properties === 0}
                                onEdit={() => openEdit(item)}
                                onDelete={async () => {
                                    const res = await deletePropertyTypeAction(
                                        item.id,
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
                        : 'Ajouter un type de logement'
                }
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Field label="Nom" htmlFor="type-name" error={errors.name}>
                        <Input
                            id="type-name"
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
                        htmlFor="type-order"
                        error={errors.sort_order}
                    >
                        <Input
                            id="type-order"
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
                        Type actif
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

