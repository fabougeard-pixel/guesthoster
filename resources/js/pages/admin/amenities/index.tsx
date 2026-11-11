import { Form, Head } from '@inertiajs/react';
import { useState } from 'react';
import { DataTable } from '@/components/admin/filters';
import { RecordActions } from '@/components/admin/record-actions';
import { Button } from '@/components/button';
import { Field, Input, Select } from '@/components/form';
import { Modal } from '@/components/modal';
import { destroy, store, update } from '@/routes/admin/amenities';
import type { AdminAmenity, Option } from '@/types';

type Props = {
    amenities: AdminAmenity[];
    categories: Option[];
};

function AmenityForm({
    amenity,
    categories,
    onDone,
}: {
    amenity: AdminAmenity | null;
    categories: Option[];
    onDone: () => void;
}) {
    return (
        <Form
            {...(amenity ? update.form(amenity.id) : store.form())}
            options={{ preserveScroll: true }}
            onSuccess={onDone}
            className="flex flex-col gap-4"
        >
            {({ errors, processing }) => (
                <>
                    <Field
                        label="Nom"
                        htmlFor="name"
                        error={errors.name}
                        hint={
                            amenity
                                ? `Identifiant dans les URL de recherche : ${amenity.slug}`
                                : undefined
                        }
                    >
                        <Input
                            id="name"
                            name="name"
                            defaultValue={amenity?.name}
                            required
                            maxLength={60}
                        />
                    </Field>
                    <div className="grid gap-4 sm:grid-cols-3">
                        <Field
                            label="Catégorie"
                            htmlFor="category"
                            error={errors.category}
                            className="sm:col-span-2"
                        >
                            <Select
                                id="category"
                                name="category"
                                defaultValue={
                                    amenity?.category ?? categories[0]?.value
                                }
                            >
                                {categories.map((category) => (
                                    <option
                                        key={category.value}
                                        value={category.value}
                                    >
                                        {category.label}
                                    </option>
                                ))}
                            </Select>
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
                                defaultValue={amenity?.sort_order ?? 0}
                                required
                            />
                        </Field>
                    </div>
                    <Field
                        label="Icône (facultatif)"
                        htmlFor="icon"
                        error={errors.icon}
                    >
                        <Input
                            id="icon"
                            name="icon"
                            defaultValue={amenity?.icon ?? ''}
                            maxLength={50}
                        />
                    </Field>
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

export default function AdminAmenities({ amenities, categories }: Props) {
    const [editing, setEditing] = useState<AdminAmenity | 'new' | null>(null);
    const current = editing === 'new' ? null : editing;

    return (
        <>
            <Head title="Équipements" />
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <h1 className="text-2xl font-semibold">Équipements</h1>
                <Button onClick={() => setEditing('new')}>
                    Ajouter un équipement
                </Button>
            </div>

            <DataTable
                head={['Équipement', 'Catégorie', 'Logements', 'Ordre', '']}
                empty={amenities.length === 0 && 'Aucun équipement.'}
            >
                {amenities.map((amenity) => (
                    <tr key={amenity.id}>
                        <td className="px-4 py-3">
                            <p className="font-medium">{amenity.name}</p>
                            <p className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
                                {amenity.slug}
                            </p>
                        </td>
                        <td className="px-4 py-3">{amenity.category_label}</td>
                        <td className="px-4 py-3 tabular-nums">
                            {amenity.properties}
                        </td>
                        <td className="px-4 py-3 tabular-nums">
                            {amenity.sort_order}
                        </td>
                        <td className="px-4 py-3">
                            <RecordActions
                                onEdit={() => setEditing(amenity)}
                                destroy={destroy(amenity.id)}
                                label={amenity.name}
                                canDelete={amenity.properties === 0}
                            />
                        </td>
                    </tr>
                ))}
            </DataTable>

            <Modal
                open={editing !== null}
                onClose={() => setEditing(null)}
                title={
                    current ? `Modifier ${current.name}` : 'Nouvel équipement'
                }
            >
                {editing !== null && (
                    <AmenityForm
                        key={current?.id ?? 'new'}
                        amenity={current}
                        categories={categories}
                        onDone={() => setEditing(null)}
                    />
                )}
            </Modal>
        </>
    );
}
