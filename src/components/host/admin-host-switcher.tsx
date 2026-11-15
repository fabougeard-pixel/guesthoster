'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import type { HostContext } from '@/lib/auth/managed-host';
import { switchManagedHostAction } from '@/lib/auth/managed-host';
import { useAppState } from '@/components/providers';
import { cn } from '@/lib/utils';

type Props = {
    hostContext: HostContext;
};

export function AdminHostSwitcher({ hostContext }: Props) {
    const router = useRouter();
    const { pushToast } = useAppState();
    const [isPending, startTransition] = useTransition();

    const { allHosts, activeHost } = hostContext;

    // Déterminer la catégorie initiale en fonction de l'hôte actif
    const initialCategory: 'all' | 'host' | 'owner' = activeHost
        ? activeHost.is_host && !activeHost.is_owner
            ? 'host'
            : activeHost.is_owner && !activeHost.is_host
              ? 'owner'
              : 'all'
        : 'all';

    const [category, setCategory] = useState<'all' | 'host' | 'owner'>(initialCategory);

    const hostsList = allHosts.filter((h) => h.is_host);
    const ownersList = allHosts.filter((h) => h.is_owner);

    const filteredHosts =
        category === 'host'
            ? hostsList
            : category === 'owner'
              ? ownersList
              : allHosts;

    // Total notifications across hosts
    const totalNotifications = allHosts.reduce((sum, h) => sum + h.notifications_count, 0);

    function handleSelectHost(hostId: number) {
        startTransition(async () => {
            const res = await switchManagedHostAction(hostId);
            if (res.ok) {
                pushToast({
                    type: 'success',
                    message: 'Espace de gestion mis à jour.',
                });
                router.refresh();
            } else if (res.error) {
                pushToast({ type: 'error', message: res.error });
            }
        });
    }

    return (
        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50/60 p-4 shadow-2xs dark:border-amber-900/40 dark:bg-amber-950/20">
            {/* Barre de sélection supérieure : Rôle Administrateur & Catégories */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white shadow-xs">
                        👑
                    </span>
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200">
                            Supervision Administrateur — Espace Hôte & Propriétaire
                        </p>
                        <p className="text-[11px] text-amber-700/80 dark:text-amber-400">
                            Choisissez entre Hôte ou Propriétaire pour administrer son espace de gestion dédié en isolation stricte.
                        </p>
                    </div>
                </div>

                {/* Filtre de catégorie : Hôtes vs Propriétaires */}
                <div
                    role="tablist"
                    aria-label="Filtrer par type de gestion"
                    className="flex items-center rounded-xl border border-amber-200 bg-white p-1 text-xs shadow-2xs dark:border-amber-900/60 dark:bg-zinc-900 self-start sm:self-auto"
                >
                    <button
                        type="button"
                        role="tab"
                        aria-selected={category === 'host'}
                        onClick={() => setCategory('host')}
                        className={cn(
                            'flex items-center gap-1.5 rounded-lg px-3 py-1 font-semibold transition',
                            category === 'host'
                                ? 'bg-amber-500 text-white shadow-xs'
                                : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100',
                        )}
                    >
                        <span>🏡 Hôtes ({hostsList.length})</span>
                    </button>

                    <button
                        type="button"
                        role="tab"
                        aria-selected={category === 'owner'}
                        onClick={() => setCategory('owner')}
                        className={cn(
                            'flex items-center gap-1.5 rounded-lg px-3 py-1 font-semibold transition',
                            category === 'owner'
                                ? 'bg-amber-500 text-white shadow-xs'
                                : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100',
                        )}
                    >
                        <span>🏢 Propriétaires ({ownersList.length})</span>
                    </button>

                    <button
                        type="button"
                        role="tab"
                        aria-selected={category === 'all'}
                        onClick={() => setCategory('all')}
                        className={cn(
                            'flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-semibold transition',
                            category === 'all'
                                ? 'bg-amber-500 text-white shadow-xs'
                                : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100',
                        )}
                    >
                        <span>Tous ({allHosts.length})</span>
                    </button>
                </div>
            </div>

            {/* Menu déroulant de sélection avec bulle de notification devant le nom */}
            <div className="grid gap-3 pt-2 sm:grid-cols-[1fr_auto] sm:items-center">
                <div className="flex flex-col gap-1.5">
                    <label
                        htmlFor="admin-managed-host-select"
                        className="flex items-center gap-2 text-xs font-bold text-zinc-800 dark:text-zinc-200"
                    >
                        <span>Compte géré actif :</span>
                        {totalNotifications > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-xs">
                                🔔 {totalNotifications} nouvelle(s) demande(s) / message(s) au total
                            </span>
                        )}
                    </label>

                    <div className="relative">
                        <select
                            id="admin-managed-host-select"
                            disabled={isPending}
                            value={activeHost?.id ?? ''}
                            onChange={(e) => {
                                const id = Number(e.target.value);
                                if (!isNaN(id) && id > 0) {
                                    handleSelectHost(id);
                                }
                            }}
                            className={cn(
                                'w-full rounded-xl border border-amber-300 bg-white py-2 pl-3 pr-10 text-xs font-semibold text-zinc-900 shadow-xs focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-amber-800 dark:bg-zinc-900 dark:text-zinc-100',
                                isPending && 'opacity-60 cursor-wait',
                            )}
                        >
                            {filteredHosts.length === 0 ? (
                                <option value="" disabled>
                                    Aucun profil trouvé dans cette catégorie
                                </option>
                            ) : (
                                filteredHosts.map((h) => {
                                    const notifPrefix =
                                        h.notifications_count > 0
                                            ? `🔴 [${h.notifications_count} nlle(s)] `
                                            : '';
                                    const details = [
                                        h.host_type,
                                        h.account_type === 'company'
                                            ? h.company_name || 'Pro'
                                            : 'Particulier',
                                        `${h.properties_count} logement(s)`,
                                    ]
                                        .filter(Boolean)
                                        .join(' · ');

                                    return (
                                        <option key={h.id} value={h.id}>
                                            {notifPrefix}
                                            {h.name} — {details}
                                        </option>
                                    );
                                })
                            )}
                        </select>
                    </div>
                </div>

                {/* Accès rapide vers l'administration des propriétaires */}
                <div className="flex items-center gap-2 self-end sm:self-auto pt-1 sm:pt-4">
                    <Link
                        href="/admin/proprietaires"
                        className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 shadow-2xs transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                    >
                        <svg
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            className="size-3.5 text-zinc-400"
                            aria-hidden="true"
                        >
                            <path d="M10 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3.465 14.493a1.23 1.23 0 0 0 .41 1.412A9.957 9.957 0 0 0 10 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 0 0-13.074.003Z" />
                        </svg>
                        <span>Gérer tous les hôtes</span>
                    </Link>
                </div>
            </div>

            {/* Fiche d'identité active de l'hôte/propriétaire géré avec badges cliquables */}
            {activeHost && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200/80 bg-white/90 p-3 dark:border-amber-900/50 dark:bg-zinc-900/90">
                    <div className="flex items-center gap-3 min-w-0">
                        {/* Avatar */}
                        <div className="relative flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary-100 text-sm font-bold text-secondary-800 ring-2 ring-amber-300 dark:bg-secondary-900/50 dark:text-secondary-300 dark:ring-amber-800 overflow-hidden">
                            <span className="select-none">{activeHost.name.slice(0, 1).toUpperCase()}</span>
                            {activeHost.avatar_url && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={activeHost.avatar_url}
                                    alt={activeHost.name}
                                    className="absolute inset-0 size-full object-cover"
                                    onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                    }}
                                />
                            )}
                        </div>

                        <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-zinc-900 dark:text-zinc-100 truncate">
                                    {activeHost.name}
                                </span>
                                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800">
                                    {activeHost.host_type}
                                </span>
                            </div>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                                {activeHost.email} ·{' '}
                                {activeHost.account_type === 'company'
                                    ? `Société : ${activeHost.company_name || 'Entreprise'}`
                                    : 'Particulier'}{' '}
                                · {activeHost.properties_count} logement(s)
                            </p>
                        </div>
                    </div>

                    {/* Alertes réservations et chat spécifiques à cet hôte */}
                    <div className="flex flex-wrap items-center gap-2">
                        {activeHost.pending_bookings_count > 0 && (
                            <Link
                                href="/hote/reservations"
                                className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-2.5 py-1 text-xs font-bold text-white shadow-xs transition hover:bg-red-700"
                            >
                                <span className="animate-pulse">🔴</span>
                                <span>{activeHost.pending_bookings_count} réservation(s) en attente</span>
                            </Link>
                        )}

                        {activeHost.unread_messages_count > 0 && (
                            <Link
                                href="/hote/messages"
                                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-bold text-white shadow-xs transition hover:bg-blue-700"
                            >
                                <span>💬</span>
                                <span>{activeHost.unread_messages_count} message(s) non lu(s)</span>
                            </Link>
                        )}

                        {activeHost.notifications_count === 0 && (
                            <span className="text-xs text-emerald-700 font-semibold dark:text-emerald-400 flex items-center gap-1">
                                <span>✓</span>
                                <span>Aucune demande en attente pour cet hôte</span>
                            </span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
