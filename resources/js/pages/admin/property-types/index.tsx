import { Form, Head } from '@inertiajs/react';
import { useState } from 'react';
import { DataTable } from '@/components/admin/filters';
import { RecordActions } from '@/components/admin/record-actions';
import { Button } from '@/components/button';
import { Badge } from '@/components/card';
import { Checkbox, Field, Input } from '@/components/form';
import { Modal } from '@/components/modal';
import { destroy, store, update } from '@/routes/admin/property-types';
import type { AdminPropertyType } from '@/types';

function PropertyTypeForm({
    propertyType,
    onDone,
}: {
    propertyType: AdminPropertyType | null;
    onDone: () => void;
}) {
    return (
        <Form
            {...(propertyType ? update.form(propertyType.id) : store.form())}
            options={{ preserveScroll: true }}
            onSuccess={onDone}
            className="flex flex-col gap-4"
        >
            {({ errors, processing }) => (
                <>
                    <div className="grid gap-4 sm:grid-cols-3">
                        <Field
                            label="Nom"
                            htmlFor="name"
                            error={errors.name}
                            className="sm:col-span-2"
                            hint={
                                propertyType
                                    ? `Identifiant dans les URL de recherche : ${propertyType.slug}`
                                    : undefined
                            }
                        >
                            <Input
                                id="name"
                                name="name"
                                defaultValue={propertyType?.name}
                                required
                                maxLength={60}
                            />
                        </Field>
                        <Field
                            label="Ordre"
                            htmlFor="sort_order"
                            error={errors.sort_order}
                        >
                            <Input
                                id="sort_order"
                                name="sort_order"
                                type="number"
                                min={0}
                                defaultValue={propertyType?.sort_order ?? 0}
                                required
                            />
                        </Field>
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                        <Checkbox
                            name="is_active"
                            value="1"
                            defaultChecked={propertyType?.is_active ?? true}
                        />
                        Proposé aux hôtes et dans les filtres de recherche
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

export default function AdminPropertyTypes({
    propertyTypes,
}: {
    propertyTypes: AdminPropertyType[];
}) {
    const [editing, setEditing] = useState<AdminPropertyType | 'new' | null>(
        null,
    );
    const current = editing === 'new' ? null : editing;

    return (
        <>
            <Head title="Types de logement" />
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold">
                        Types de logement
                    </h1>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        Un type désactivé reste affiché sur les annonces qui
                        l’utilisent, mais n’est plus proposé.
                    </p>
                </div>
                <Button onClick={() => setEditing('new')}>
                    Ajouter un type
                </Button>
            </div>

            <DataTable
                head={['Type', 'Statut', 'Logements', 'Ordre', '']}
                empty={propertyTypes.length === 0 && 'Aucun type de logement.'}
            >
                {propertyTypes.map((propertyType) => (
                    <tr key={propertyType.id}>
                        <td className="px-4 py-3">
                            <p className="font-medium">{propertyType.name}</p>
                            <p className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
                                {propertyType.slug}
                            </p>
                        </td>
                        <td className="px-4 py-3">
                            {propertyType.is_active ? (
                                <Badge tone="success">Actif</Badge>
                            ) : (
                                <Badge>Inactif</Badge>
                            )}
                        </td>
                        <td className="px-4 py-3 tabular-nums">
                            {propertyType.properties}
                        </td>
                        <td className="px-4 py-3 tabular-nums">
                            {propertyType.sort_order}
                        </td>
                        <td className="px-4 py-3">
                            <RecordActions
                                onEdit={() => setEditing(propertyType)}
                                destroy={destroy(propertyType.id)}
                                label={propertyType.name}
                                canDelete={propertyType.properties === 0}
                            />
                        </td>
                    </tr>
                ))}
            </DataTable>

            <Modal
                open={editing !== null}
                onClose={() => setEditing(null)}
                title={
                    current
                        ? `Modifier ${current.name}`
                        : 'Nouveau type de logement'
                }
            >
                {editing !== null && (
                    <PropertyTypeForm
                        key={current?.id ?? 'new'}
                        propertyType={current}
                        onDone={() => setEditing(null)}
                    />
                )}
            </Modal>
        </>
    );
}
