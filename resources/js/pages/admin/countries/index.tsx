import { Form, Head } from '@inertiajs/react';
import { useState } from 'react';
import { DataTable } from '@/components/admin/filters';
import { RecordActions } from '@/components/admin/record-actions';
import { Button } from '@/components/button';
import { Badge } from '@/components/card';
import { Checkbox, Field, Input } from '@/components/form';
import { Modal } from '@/components/modal';
import { destroy, store, update } from '@/routes/admin/countries';
import type { AdminCountry } from '@/types';

type Editing = AdminCountry | 'new' | null;

function CountryForm({
    country,
    onDone,
}: {
    country: AdminCountry | null;
    onDone: () => void;
}) {
    return (
        <Form
            {...(country ? update.form(country.id) : store.form())}
            options={{ preserveScroll: true }}
            onSuccess={onDone}
            className="flex flex-col gap-4"
        >
            {({ errors, processing }) => (
                <>
                    <div className="grid gap-4 sm:grid-cols-[1fr_6rem]">
                        <Field label="Nom" htmlFor="name" error={errors.name}>
                            <Input
                                id="name"
                                name="name"
                                defaultValue={country?.name}
                                required
                                maxLength={100}
                            />
                        </Field>
                        <Field
                            label="Code ISO"
                            htmlFor="code"
                            error={errors.code}
                        >
                            <Input
                                id="code"
                                name="code"
                                defaultValue={country?.code}
                                required
                                minLength={2}
                                maxLength={2}
                                className="uppercase"
                            />
                        </Field>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field
                            label="Drapeau (emoji)"
                            htmlFor="flag_emoji"
                            error={errors.flag_emoji}
                        >
                            <Input
                                id="flag_emoji"
                                name="flag_emoji"
                                defaultValue={country?.flag_emoji ?? ''}
                                maxLength={16}
                            />
                        </Field>
                        <Field
                            label="Ordre d’affichage"
                            htmlFor="sort_order"
                            error={errors.sort_order}
                            hint="Les plus petits en premier."
                        >
                            <Input
                                id="sort_order"
                                name="sort_order"
                                type="number"
                                min={0}
                                defaultValue={country?.sort_order ?? 0}
                                required
                            />
                        </Field>
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                        <Checkbox
                            name="is_active"
                            value="1"
                            defaultChecked={country?.is_active ?? true}
                        />
                        Proposé aux hôtes et aux voyageurs
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

export default function AdminCountries({
    countries,
}: {
    countries: AdminCountry[];
}) {
    const [editing, setEditing] = useState<Editing>(null);
    const current = editing === 'new' ? null : editing;

    return (
        <>
            <Head title="Pays" />
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <h1 className="text-2xl font-semibold">Pays</h1>
                <Button onClick={() => setEditing('new')}>
                    Ajouter un pays
                </Button>
            </div>

            <DataTable
                head={['Pays', 'Code', 'Villes', 'Ordre', 'Statut', '']}
                empty={countries.length === 0 && 'Aucun pays.'}
            >
                {countries.map((country) => (
                    <tr key={country.id}>
                        <td className="px-4 py-3 font-medium">
                            {country.flag_emoji && (
                                <span className="mr-2">
                                    {country.flag_emoji}
                                </span>
                            )}
                            {country.name}
                        </td>
                        <td className="px-4 py-3 font-mono">{country.code}</td>
                        <td className="px-4 py-3 tabular-nums">
                            {country.cities}
                        </td>
                        <td className="px-4 py-3 tabular-nums">
                            {country.sort_order}
                        </td>
                        <td className="px-4 py-3">
                            {country.is_active ? (
                                <Badge tone="success">Actif</Badge>
                            ) : (
                                <Badge>Inactif</Badge>
                            )}
                        </td>
                        <td className="px-4 py-3">
                            <RecordActions
                                onEdit={() => setEditing(country)}
                                destroy={destroy(country.id)}
                                label={country.name}
                                canDelete={country.cities === 0}
                            />
                        </td>
                    </tr>
                ))}
            </DataTable>

            <Modal
                open={editing !== null}
                onClose={() => setEditing(null)}
                title={current ? `Modifier ${current.name}` : 'Nouveau pays'}
            >
                {editing !== null && (
                    <CountryForm
                        key={current?.id ?? 'new'}
                        country={current}
                        onDone={() => setEditing(null)}
                    />
                )}
            </Modal>
        </>
    );
}
