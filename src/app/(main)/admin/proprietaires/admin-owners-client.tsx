'use client';

import Link from 'next/link';
import type { FormEvent } from 'react';
import { useState, useTransition } from 'react';
import {
    DataTable,
    FilterBar,
    buildFilterUrl,
} from '@/components/admin/filters';
import { Button } from '@/components/button';
import { Badge, Card } from '@/components/card';
import { Field, Input } from '@/components/form';
import { Modal } from '@/components/modal';
import { Pagination } from '@/components/pagination';
import { useActionFeedback } from '@/components/use-action-feedback';
import {
    createManagedOwnerAction,
    deleteManagedOwnerAction,
} from '@/lib/actions/admin';
import type { FieldErrors } from '@/lib/actions/types';
import { formatDate, plural } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Paginated } from '@/types';

export const DEFAULT_HOST_TYPES = [
    'Hôte Standard',
    'Hôte Vérifié',
    'Superhôte',
    'Hôte Premium',
    'Conciergerie Partenaire',
];

export type ManagedOwner = {
    id: number;
    name: string;
    email: string;
    role: string;
    host_type: string;
    created_at: string;
    properties_count: number;
    suspended_at: string | null;
};

type Props = {
    owners: Paginated<ManagedOwner>;
    totalPropertiesCount: number;
    filters: {
        search: string;
    };
};

export function AdminOwnersClient({
    owners,
    totalPropertiesCount,
    filters,
}: Props) {
    const { applyResult, router } = useActionFeedback();
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [createErrors, setCreateErrors] = useState<FieldErrors>({});
    const [isPending, startTransition] = useTransition();

    function applyFilter(next: Partial<Props['filters']>) {
        const merged = { ...filters, ...next };
        router.push(
            buildFilterUrl('/admin/proprietaires', {
                search: merged.search || undefined,
            }),
        );
    }

    async function handleCreateOwner(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setCreateErrors({});
        const fd = new FormData(event.currentTarget);

        const name = String(fd.get('name') ?? '').trim();
        const email = String(fd.get('email') ?? '').trim();
        const password = String(fd.get('password') ?? '').trim();
        const hostType = String(fd.get('hostType') ?? '').trim();

        startTransition(async () => {
            const res = await createManagedOwnerAction({
                name,
                email,
                password: password || undefined,
                hostType: hostType || undefined,
            });

            applyResult(res, {
                setFieldErrors: setCreateErrors,
                onSuccess: () => {
                    setIsCreateOpen(false);
                },
            });
        });
    }

    function handleDeleteOwner(owner: ManagedOwner) {
        if (
            !window.confirm(
                `Supprimer définitivement le propriétaire « ${owner.name} » ainsi que tous ses biens associés ? Cette action est irréversible.`,
            )
        ) {
            return;
        }

        startTransition(async () => {
            const res = await deleteManagedOwnerAction(owner.id);
            applyResult(res);
        });
    }

    return (
        <div className="flex flex-col gap-6">
            {/* En-tête avec bouton d'enregistrement */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                        Propriétaires en gestion
                    </h1>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        Enregistrez les propriétaires et confiez-leur des biens en conciergerie ou gestion locative.
                    </p>
                </div>
                <Button
                    onClick={() => setIsCreateOpen(true)}
                    className="self-start sm:self-auto bg-primary-600 hover:bg-primary-700"
                >
                    <svg
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="mr-1.5 size-4"
                        aria-hidden="true"
                    >
                        <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
                    </svg>
                    Enregistrer un propriétaire
                </Button>
            </div>

            {/* Cartes statistiques */}
            <div className="grid gap-4 sm:grid-cols-3">
                <Card className="p-4">
                    <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider dark:text-zinc-400">
                        Propriétaires enregistrés
                    </p>
                    <p className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                        {owners.total}
                    </p>
                </Card>
                <Card className="p-4">
                    <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider dark:text-zinc-400">
                        Biens au catalogue
                    </p>
                    <p className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                        {totalPropertiesCount}
                    </p>
                </Card>
                <Card className="p-4">
                    <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider dark:text-zinc-400">
                        Rôle système
                    </p>
                    <p className="mt-2 text-sm font-semibold text-primary-700 dark:text-primary-300">
                        Hôte / Mandant conciergerie
                    </p>
                </Card>
            </div>

            {/* Barre de recherche */}
            <FilterBar
                search={filters.search}
                placeholder="Rechercher par nom ou email…"
                onSearch={(search) => applyFilter({ search })}
            />

            {/* Tableau des propriétaires */}
            <DataTable
                head={[
                    'Propriétaire',
                    'Type d’hôte',
                    'Adresse email',
                    'Biens attribués',
                    'Date d’enregistrement',
                    'Statut',
                    'Actions',
                ]}
                empty={owners.data.length === 0 ? 'Aucun propriétaire trouvé.' : false}
            >
                {owners.data.map((owner) => (
                    <tr
                        key={owner.id}
                        className="transition hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40"
                    >
                        {/* Nom */}
                        <td className="px-4 py-3.5 font-medium text-zinc-900 dark:text-zinc-100">
                            <div className="flex items-center gap-3">
                                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary-100 text-sm font-bold text-secondary-800 dark:bg-secondary-900/40 dark:text-secondary-300">
                                    {owner.name.slice(0, 1).toUpperCase()}
                                </div>
                                <span className="font-semibold">{owner.name}</span>
                            </div>
                        </td>

                        {/* Type d'hôte */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                            <span
                                className={cn(
                                    'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
                                    owner.host_type === 'Hôte Premium'
                                        ? 'bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-700'
                                        : owner.host_type === 'Superhôte'
                                          ? 'bg-purple-100 text-purple-900 border border-purple-300 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-700'
                                          : owner.host_type === 'Hôte Vérifié'
                                            ? 'bg-sky-100 text-sky-900 border border-sky-300 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-700'
                                            : owner.host_type === 'Conciergerie Partenaire'
                                              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-700'
                                              : 'bg-zinc-100 text-zinc-700 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700',
                                )}
                            >
                                {owner.host_type}
                            </span>
                        </td>

                        {/* Email */}
                        <td className="px-4 py-3.5 text-zinc-600 dark:text-zinc-300">
                            {owner.email}
                        </td>

                        {/* Logements */}
                        <td className="px-4 py-3.5">
                            <Link
                                href={`/admin/logements?search=${encodeURIComponent(owner.email)}`}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-800 transition hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                            >
                                <span>{plural(owner.properties_count, 'logement')}</span>
                                <svg
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                    className="size-3.5 text-zinc-400"
                                    aria-hidden="true"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M7.21 14.77a.75.75 0 0 1 .02-1.06L11.168 10 7.23 6.29a.75.75 0 1 1 1.04-1.08l4.5 4.25a.75.75 0 0 1 0 1.08l-4.5 4.25a.75.75 0 0 1-1.06-.02Z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                            </Link>
                        </td>

                        {/* Date */}
                        <td className="px-4 py-3.5 text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                            {owner.created_at ? formatDate(owner.created_at.slice(0, 10)) : '—'}
                        </td>

                        {/* Statut */}
                        <td className="px-4 py-3.5">
                            {owner.suspended_at ? (
                                <Badge tone="danger">Suspendu</Badge>
                            ) : (
                                <Badge tone="success">Actif</Badge>
                            )}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3.5">
                            <div className="flex items-center gap-1.5">
                                {/* Ajouter un bien pour ce propriétaire */}
                                <Link
                                    href={`/admin/logements/nouveau?owner_id=${owner.id}`}
                                    title="Ajouter un bien pour ce propriétaire"
                                    aria-label="Ajouter un bien"
                                    className="flex size-8 items-center justify-center rounded-lg border border-primary-200 bg-primary-50/70 text-primary-700 transition hover:bg-primary-100 hover:text-primary-800 dark:border-primary-900/60 dark:bg-primary-950/40 dark:text-primary-300 dark:hover:bg-primary-900/50"
                                >
                                    <svg
                                        viewBox="0 0 20 20"
                                        fill="currentColor"
                                        className="size-4"
                                        aria-hidden="true"
                                    >
                                        <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
                                    </svg>
                                </Link>

                                {/* Profil utilisateur */}
                                <Link
                                    href={`/admin/utilisateurs?search=${encodeURIComponent(owner.email)}`}
                                    title="Consulter le profil utilisateur"
                                    aria-label="Voir le profil"
                                    className="flex size-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                                >
                                    <svg
                                        viewBox="0 0 20 20"
                                        fill="currentColor"
                                        className="size-4"
                                        aria-hidden="true"
                                    >
                                        <path d="M10 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3.465 14.493a1.23 1.23 0 0 0 .41 1.412A9.957 9.957 0 0 0 10 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 0 0-13.074.003Z" />
                                    </svg>
                                </Link>

                                {/* Supprimer le propriétaire : Corbeille */}
                                <button
                                    type="button"
                                    disabled={isPending}
                                    onClick={() => handleDeleteOwner(owner)}
                                    title="Supprimer définitivement ce propriétaire"
                                    aria-label="Supprimer ce propriétaire"
                                    className="flex size-8 items-center justify-center rounded-lg border border-red-200 bg-red-50/70 text-red-600 transition hover:border-red-300 hover:bg-red-100 hover:text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-900/50"
                                >
                                    <svg
                                        viewBox="0 0 20 20"
                                        fill="currentColor"
                                        className="size-4"
                                        aria-hidden="true"
                                    >
                                        <path
                                            fillRule="evenodd"
                                            d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 1 .75.72l.5 6a.75.75 0 1 1-1.498.12l-.5-6a.75.75 0 0 1 .748-.84Zm3.59.84a.75.75 0 0 0-1.498-.12l-.5 6a.75.75 0 1 0 1.498.12l.5-6Z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                </button>
                            </div>
                        </td>
                    </tr>
                ))}
            </DataTable>

            <Pagination paginator={owners} noun="propriétaire" nounPlural="propriétaires" />

            {/* Modale d'enregistrement de propriétaire */}
            <Modal
                open={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                title="Enregistrer un nouveau propriétaire"
            >
                <form
                    onSubmit={(event) => void handleCreateOwner(event)}
                    className="flex flex-col gap-4 text-left"
                >
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Ce compte aura le rôle Hôte / Propriétaire. Une fois enregistré, il sera immédiatement disponible pour lui attribuer des biens en conciergerie.
                    </p>

                    <Field
                        label="Nom et prénom du propriétaire"
                        htmlFor="owner-name"
                        error={createErrors.name}
                    >
                        <Input
                            id="owner-name"
                            name="name"
                            required
                            placeholder="Ex : Jean Dupont"
                            autoComplete="name"
                        />
                    </Field>

                    <Field
                        label="Type d’hôte"
                        htmlFor="owner-host-type"
                        hint="Choisissez parmi les suggestions ou tapez librement votre propre type d’hôte."
                    >
                        <Input
                            id="owner-host-type"
                            name="hostType"
                            list="host-types-list"
                            placeholder="Ex : Hôte Premium, Hôte Vérifié, Superhôte..."
                            defaultValue="Hôte Standard"
                        />
                        <datalist id="host-types-list">
                            {DEFAULT_HOST_TYPES.map((type) => (
                                <option key={type} value={type} />
                            ))}
                        </datalist>
                    </Field>

                    <Field
                        label="Adresse e-mail"
                        htmlFor="owner-email"
                        error={createErrors.email}
                    >
                        <Input
                            id="owner-email"
                            name="email"
                            type="email"
                            required
                            placeholder="jean.dupont@exemple.com"
                            autoComplete="email"
                        />
                    </Field>

                    <Field
                        label="Mot de passe provisoire (facultatif)"
                        htmlFor="owner-password"
                        error={createErrors.password}
                        hint="Laissez vide pour générer automatiquement un mot de passe sécurisé."
                    >
                        <Input
                            id="owner-password"
                            name="password"
                            type="password"
                            placeholder="Minimum 8 caractères (optionnel)"
                            autoComplete="new-password"
                        />
                    </Field>

                    <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setIsCreateOpen(false)}
                        >
                            Annuler
                        </Button>
                        <Button
                            type="submit"
                            loading={isPending}
                            className="bg-primary-600 hover:bg-primary-700"
                        >
                            Enregistrer le propriétaire
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
