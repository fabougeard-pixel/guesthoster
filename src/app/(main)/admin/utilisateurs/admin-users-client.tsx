'use client';

import { useState, useTransition } from 'react';
import {
    reinstateUserAction,
    suspendUserAction,
    updateUserRoleAction,
} from '@/lib/actions/admin';
import { ALL_ROLE_OPTIONS } from '@/lib/domain/enums';
import { formatDateTime, plural } from '@/lib/format';
import {
    DataTable,
    FilterBar,
    buildFilterUrl,
} from '@/components/admin/filters';
import { Button } from '@/components/button';
import { Badge } from '@/components/card';
import { Checkbox, Select } from '@/components/form';
import { Modal } from '@/components/modal';
import { Pagination } from '@/components/pagination';
import { useActionFeedback } from '@/components/use-action-feedback';
import type { AdminUser, Paginated } from '@/types';

type Props = {
    users: Paginated<AdminUser>;
    filters: {
        search: string;
        role: string;
        suspended: boolean;
    };
};

export function AdminUsersClient({ users, filters }: Props) {
    const { applyResult, router } = useActionFeedback();
    const [pendingId, setPendingId] = useState<number | null>(null);
    const [suspending, setSuspending] = useState<AdminUser | null>(null);
    const [isPending, startTransition] = useTransition();

    function applyFilter(next: Partial<Props['filters']>) {
        const merged = { ...filters, ...next };
        router.push(
            buildFilterUrl('/admin/utilisateurs', {
                search: merged.search || undefined,
                role: merged.role || undefined,
                suspended: merged.suspended ? '1' : undefined,
            }),
        );
    }

    function handleRoleChange(user: AdminUser, nextRole: string) {
        if (nextRole === user.role) {
            return;
        }
        setPendingId(user.id);
        startTransition(async () => {
            try {
                const res = await updateUserRoleAction({
                    userId: user.id,
                    role: nextRole,
                });
                applyResult(res);
            } finally {
                setPendingId(null);
            }
        });
    }

    function handleReinstate(user: AdminUser) {
        setPendingId(user.id);
        startTransition(async () => {
            try {
                const res = await reinstateUserAction(user.id);
                applyResult(res);
            } finally {
                setPendingId(null);
            }
        });
    }

    function handleConfirmSuspend() {
        if (!suspending) {
            return;
        }
        const target = suspending;
        setPendingId(target.id);
        startTransition(async () => {
            try {
                const res = await suspendUserAction(target.id);
                applyResult(res, {
                    onSuccess: () => setSuspending(null),
                });
            } finally {
                setPendingId(null);
            }
        });
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Utilisateurs</h1>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    Gestion des rôles et modération des comptes.
                </p>
            </div>

            <FilterBar
                key={`${filters.search}:${filters.role}:${filters.suspended ? '1' : '0'}`}
                search={filters.search}
                placeholder="Rechercher par nom ou e-mail…"
                onSearch={(search) => applyFilter({ search })}
            >
                <Select
                    aria-label="Filtrer par rôle"
                    className="sm:w-48"
                    value={filters.role}
                    onChange={(event) => applyFilter({ role: event.target.value })}
                >
                    <option value="">Tous les rôles</option>
                    {ALL_ROLE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </Select>
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                    <Checkbox
                        checked={filters.suspended}
                        onChange={(event) =>
                            applyFilter({ suspended: event.target.checked })
                        }
                    />
                    Suspendus uniquement
                </label>
            </FilterBar>

            <DataTable
                head={['Utilisateur', 'Rôle', 'Activité', 'Statut', 'Actions']}
                empty={
                    users.data.length === 0
                        ? 'Aucun utilisateur correspondant.'
                        : false
                }
            >
                {users.data.map((user) => {
                    const busy = isPending && pendingId === user.id;

                    return (
                        <tr key={user.id}>
                            <td className="px-4 py-3">
                                <p className="font-medium text-zinc-900 dark:text-zinc-100">
                                    {user.name}
                                    {user.is_self && (
                                        <span className="ml-2 text-xs text-zinc-500">
                                            (vous)
                                        </span>
                                    )}
                                </p>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                    {user.email}
                                </p>
                                {user.created_at && (
                                    <p className="mt-0.5 text-xs text-zinc-400">
                                        Inscrit le {formatDateTime(user.created_at)}
                                    </p>
                                )}
                            </td>
                            <td className="px-4 py-3">
                                <Select
                                    aria-label={`Rôle de ${user.name}`}
                                    value={user.role}
                                    disabled={user.is_self || busy}
                                    className="h-9 w-40 text-xs"
                                    onChange={(event) =>
                                        handleRoleChange(user, event.target.value)
                                    }
                                >
                                    {ALL_ROLE_OPTIONS.map((option) => (
                                        <option
                                            key={option.value}
                                            value={option.value}
                                        >
                                            {option.label}
                                        </option>
                                    ))}
                                </Select>
                            </td>
                            <td className="px-4 py-3 text-xs text-zinc-600 dark:text-zinc-300">
                                <p>{plural(user.properties, 'logement')}</p>
                                <p className="text-zinc-500 dark:text-zinc-400">
                                    {plural(user.bookings, 'réservation')}
                                </p>
                            </td>
                            <td className="px-4 py-3">
                                <div className="flex flex-wrap gap-1.5">
                                    {user.suspended_at ? (
                                        <Badge tone="danger">Suspendu</Badge>
                                    ) : (
                                        <Badge tone="success">Actif</Badge>
                                    )}
                                    {!user.verified && (
                                        <Badge tone="warning">
                                            E-mail non vérifié
                                        </Badge>
                                    )}
                                </div>
                            </td>
                            <td className="px-4 py-3 text-right">
                                {user.is_self ? (
                                    <span className="text-xs text-zinc-400">—</span>
                                ) : user.suspended_at ? (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        loading={busy}
                                        onClick={() => handleReinstate(user)}
                                    >
                                        Réactiver
                                    </Button>
                                ) : (
                                    <Button
                                        variant="danger"
                                        size="sm"
                                        disabled={busy}
                                        onClick={() => setSuspending(user)}
                                    >
                                        Suspendre
                                    </Button>
                                )}
                            </td>
                        </tr>
                    );
                })}
            </DataTable>

            <Pagination
                paginator={users}
                noun="utilisateur"
                nounPlural="utilisateurs"
            />

            <Modal
                open={suspending !== null}
                onClose={() => {
                    if (!isPending) {
                        setSuspending(null);
                    }
                }}
                title={
                    suspending
                        ? `Suspendre ${suspending.name}`
                        : 'Suspendre le compte'
                }
            >
                <div className="space-y-4">
                    <p className="text-sm text-zinc-600 dark:text-zinc-300">
                        L’utilisateur ne pourra plus se connecter tant que son
                        compte restera suspendu.
                    </p>
                    <div className="flex justify-end gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setSuspending(null)}
                            disabled={isPending}
                        >
                            Annuler
                        </Button>
                        <Button
                            variant="danger"
                            loading={isPending}
                            onClick={handleConfirmSuspend}
                        >
                            Confirmer la suspension
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

