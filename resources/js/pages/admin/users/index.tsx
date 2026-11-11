import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import { applyFilters, DataTable, FilterBar } from '@/components/admin/filters';
import { Button, buttonClasses } from '@/components/button';
import { Badge } from '@/components/card';
import { Checkbox, Select } from '@/components/form';
import { Modal } from '@/components/modal';
import { Pagination } from '@/components/pagination';
import { formatDate, plural } from '@/lib/format';
import { index, reinstate, role, suspend } from '@/routes/admin/users';
import type { AdminUser, Option, Paginated, UserRole } from '@/types';

type Props = {
    users: Paginated<AdminUser>;
    filters: { role: UserRole | null; suspended: boolean; q: string | null };
    roles: Option[];
};

export default function AdminUsers({ users, filters, roles }: Props) {
    const [suspending, setSuspending] = useState<AdminUser | null>(null);
    const filter = (query: Record<string, unknown>) =>
        applyFilters(index.url(), {
            role: filters.role,
            suspendus: filters.suspended,
            q: filters.q,
            ...query,
        });

    const changeRole = (user: AdminUser, value: string) =>
        router.patch(
            role.url(user.id),
            { role: value },
            { preserveScroll: true },
        );

    return (
        <>
            <Head title="Utilisateurs" />
            <h1 className="text-2xl font-semibold">Utilisateurs</h1>

            <FilterBar
                search={filters.q}
                placeholder="Nom ou e-mail…"
                onSearch={(q) => filter({ q })}
                className="mt-6 mb-4"
            >
                <Select
                    aria-label="Rôle"
                    value={filters.role ?? ''}
                    onChange={(event) => filter({ role: event.target.value })}
                    className="sm:w-48"
                >
                    <option value="">Tous les rôles</option>
                    {roles.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </Select>
                <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                        checked={filters.suspended}
                        onChange={(event) =>
                            filter({ suspendus: event.target.checked })
                        }
                    />
                    Comptes suspendus
                </label>
            </FilterBar>

            <DataTable
                head={[
                    'Utilisateur',
                    'Rôle',
                    'Activité',
                    'Inscription',
                    'Statut',
                    '',
                ]}
                empty={
                    users.data.length === 0 &&
                    'Aucun utilisateur ne correspond.'
                }
            >
                {users.data.map((user) => (
                    <tr key={user.id} className="align-middle">
                        <td className="px-4 py-3">
                            <p className="font-medium">{user.name}</p>
                            <p className="text-zinc-500 dark:text-zinc-400">
                                {user.email}
                            </p>
                        </td>
                        <td className="px-4 py-3">
                            {user.is_self ? (
                                user.role_label
                            ) : (
                                <Select
                                    aria-label={`Rôle de ${user.name}`}
                                    value={user.role}
                                    onChange={(event) =>
                                        changeRole(user, event.target.value)
                                    }
                                    className="h-8 w-40"
                                >
                                    {roles.map((option) => (
                                        <option
                                            key={option.value}
                                            value={option.value}
                                        >
                                            {option.label}
                                        </option>
                                    ))}
                                </Select>
                            )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-zinc-600 dark:text-zinc-300">
                            {user.properties > 0 && (
                                <span className="block">
                                    {plural(user.properties, 'logement')}
                                </span>
                            )}
                            <span className="block">
                                {plural(user.bookings, 'réservation')}
                            </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-zinc-600 dark:text-zinc-300">
                            {user.created_at &&
                                formatDate(user.created_at.slice(0, 10))}
                        </td>
                        <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
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
                            {!user.is_self &&
                                (user.suspended_at ? (
                                    <Link
                                        href={reinstate(user.id)}
                                        as="button"
                                        preserveScroll
                                        className={buttonClasses({
                                            variant: 'outline',
                                            size: 'sm',
                                        })}
                                    >
                                        Réactiver
                                    </Link>
                                ) : (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setSuspending(user)}
                                    >
                                        Suspendre
                                    </Button>
                                ))}
                        </td>
                    </tr>
                ))}
            </DataTable>

            <Pagination paginator={users} noun="utilisateur" />

            <Modal
                open={suspending !== null}
                onClose={() => setSuspending(null)}
                title="Suspendre le compte"
            >
                {suspending && (
                    <div className="flex flex-col gap-4">
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                            {suspending.name} sera déconnecté et ne pourra plus
                            se connecter.
                            {suspending.properties > 0 &&
                                ' Ses logements disparaissent du catalogue et ne peuvent plus être réservés.'}{' '}
                            Les réservations en cours ne sont pas annulées :
                            annulez-les depuis l’onglet Réservations si besoin.
                        </p>
                        <div className="flex justify-end gap-2">
                            <Button
                                variant="ghost"
                                onClick={() => setSuspending(null)}
                            >
                                Annuler
                            </Button>
                            <Link
                                href={suspend(suspending.id)}
                                as="button"
                                preserveScroll
                                onSuccess={() => setSuspending(null)}
                                className={buttonClasses({ variant: 'danger' })}
                            >
                                Suspendre
                            </Link>
                        </div>
                    </div>
                )}
            </Modal>
        </>
    );
}
