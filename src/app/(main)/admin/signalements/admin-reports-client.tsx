'use client';

import Link from 'next/link';
import type { FormEvent } from 'react';
import { useState, useTransition } from 'react';
import {
    DataTable,
    FilterBar,
    StatusTabs,
    buildFilterUrl,
} from '@/components/admin/filters';
import { Button } from '@/components/button';
import { Badge } from '@/components/card';
import { Field, Textarea } from '@/components/form';
import { Modal } from '@/components/modal';
import { Pagination } from '@/components/pagination';
import { useActionFeedback } from '@/components/use-action-feedback';
import {
    suspendPropertyByReportAction,
    updatePropertyReportStatusAction,
} from '@/lib/actions/report';
import { switchManagedHostAction } from '@/lib/actions/managed-host';
import { formatDate } from '@/lib/format';
import type { AdminPropertyReport, Paginated } from '@/types';

type Props = {
    reports: Paginated<AdminPropertyReport>;
    statusTabs: { value: string; label: string; count: number }[];
    filters: {
        search: string;
        status: string;
    };
};

export function AdminReportsClient({ reports, statusTabs, filters }: Props) {
    const { applyResult, pushToast, router } = useActionFeedback();
    const [suspendingReport, setSuspendingReport] =
        useState<AdminPropertyReport | null>(null);
    const [suspendReason, setSuspendReason] = useState('');
    const [isPending, startTransition] = useTransition();
    const [switchingHostId, setSwitchingHostId] = useState<number | null>(null);

    function applyFilter(next: Partial<Props['filters']>) {
        const merged = { ...filters, ...next };
        router.push(
            buildFilterUrl('/admin/signalements', {
                status: merged.status || undefined,
                search: merged.search || undefined,
            }),
        );
    }

    function handleUpdateStatus(
        reportId: number,
        status: 'resolved' | 'dismissed' | 'pending',
    ) {
        startTransition(async () => {
            const res = await updatePropertyReportStatusAction({
                reportId,
                status,
            });
            applyResult(res);
        });
    }

    function handleSuspend(e: FormEvent) {
        e.preventDefault();
        if (!suspendingReport) return;

        startTransition(async () => {
            const res = await suspendPropertyByReportAction({
                reportId: suspendingReport.id,
                propertyId: suspendingReport.property_id,
                rejectionReason: suspendReason,
            });
            applyResult(res, {
                onSuccess: () => {
                    setSuspendingReport(null);
                    setSuspendReason('');
                },
            });
        });
    }

    function handleSwitchToHost(hostId: number, hostName: string) {
        setSwitchingHostId(hostId);
        startTransition(async () => {
            try {
                const res = await switchManagedHostAction(hostId);
                if (res.ok) {
                    pushToast({
                        type: 'success',
                        message: `Espace hôte de « ${hostName} » activé.`,
                    });
                    router.push('/hote');
                } else {
                    pushToast({
                        type: 'error',
                        message:
                            res.error || 'Erreur lors de la bascule vers cet espace.',
                    });
                }
            } finally {
                setSwitchingHostId(null);
            }
        });
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                    Signalements d’annonces
                </h1>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Vérifiez et traitez les alertes déposées par les visiteurs (logements frauduleux, arnaques, non-conformité).
                </p>
            </div>

            <StatusTabs
                tabs={statusTabs}
                current={filters.status}
                onChange={(status: string) => applyFilter({ status })}
            />

            <FilterBar
                key={`${filters.search}:${filters.status}`}
                search={filters.search}
                placeholder="Titre, hôte, motif ou e-mail..."
                onSearch={(search) => applyFilter({ search })}
            />

            <DataTable
                head={[
                    'Logement & Hôte',
                    'Motif du signalement',
                    'Signalé par',
                    'Date & Statut',
                    'Actions de modération',
                ]}
                empty={
                    reports.data.length === 0
                        ? 'Aucun signalement trouvé dans cette section.'
                        : false
                }
            >
                {reports.data.map((report) => (
                    <tr key={report.id}>
                        {/* Logement & Hôte */}
                        <td className="px-4 py-3">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="size-12 shrink-0 overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800">
                                    {report.property_cover_url && (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={report.property_cover_url}
                                            alt=""
                                            className="size-full object-cover"
                                        />
                                    )}
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <Link
                                        href={`/logements/${report.property_slug}`}
                                        target="_blank"
                                        className="font-semibold text-zinc-900 hover:text-primary-600 dark:text-zinc-100 hover:underline truncate max-w-56"
                                    >
                                        {report.property_title} ↗
                                    </Link>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate max-w-56">
                                        Hôte : <strong>{report.host_name}</strong> ({report.host_email})
                                    </p>
                                    <button
                                        type="button"
                                        disabled={switchingHostId === report.host_id}
                                        onClick={() =>
                                            handleSwitchToHost(
                                                report.host_id,
                                                report.host_name,
                                            )
                                        }
                                        className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-purple-700 hover:underline dark:text-purple-400 self-start"
                                    >
                                        <span>🏠 Gérer son espace</span>
                                    </button>
                                </div>
                            </div>
                        </td>

                        {/* Motif & Détails */}
                        <td className="px-4 py-3">
                            <div className="flex flex-col gap-1 max-w-72">
                                <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-bold text-red-800 border border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900 self-start">
                                    ⚠️ {report.reason_label}
                                </span>
                                {report.details ? (
                                    <p className="text-xs text-zinc-600 dark:text-zinc-300 bg-zinc-50 p-2 rounded-lg border border-zinc-200/60 dark:bg-zinc-800/60 dark:border-zinc-800 line-clamp-3">
                                        « {report.details} »
                                    </p>
                                ) : (
                                    <span className="text-xs text-zinc-400 italic">
                                        Aucun détail complémentaire fourni
                                    </span>
                                )}
                            </div>
                        </td>

                        {/* Signalé par */}
                        <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex flex-col text-xs">
                                <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                                    {report.reporter_name}
                                </span>
                                <span className="text-zinc-500 dark:text-zinc-400">
                                    {report.reporter_email}
                                </span>
                            </div>
                        </td>

                        {/* Date & Statut */}
                        <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex flex-col gap-1 items-start">
                                {report.status === 'pending' && (
                                    <Badge tone="warning">À modérer</Badge>
                                )}
                                {report.status === 'resolved' && (
                                    <Badge tone="success">Traité</Badge>
                                )}
                                {report.status === 'dismissed' && (
                                    <Badge tone="neutral">Classé sans suite</Badge>
                                )}
                                <span className="text-[11px] text-zinc-400">
                                    {report.created_at
                                        ? formatDate(report.created_at.slice(0, 10))
                                        : '—'}
                                </span>
                            </div>
                        </td>

                        {/* Actions de modération */}
                        <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex flex-wrap items-center gap-1.5">
                                {report.status === 'pending' ? (
                                    <>
                                        <Button
                                            size="sm"
                                            disabled={isPending}
                                            onClick={() =>
                                                handleUpdateStatus(report.id, 'resolved')
                                            }
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-2.5 py-1 h-auto"
                                            title="Marquer comme vérifié et traité"
                                        >
                                            ✓ Traité
                                        </Button>

                                        <Button
                                            size="sm"
                                            disabled={isPending}
                                            onClick={() => {
                                                setSuspendingReport(report);
                                                setSuspendReason(
                                                    `Signalement confirmé (${report.reason_label}). Annonce retirée du catalogue public.`,
                                                );
                                            }}
                                            className="bg-red-600 hover:bg-red-700 text-white font-semibold text-xs px-2 py-1 h-auto"
                                            title="Suspendre l'annonce du catalogue"
                                        >
                                            🚫 Masquer
                                        </Button>

                                        <Button
                                            size="sm"
                                            variant="outline"
                                            disabled={isPending}
                                            onClick={() =>
                                                handleUpdateStatus(report.id, 'dismissed')
                                            }
                                            className="text-xs px-2 py-1 h-auto text-zinc-500 hover:text-zinc-800"
                                            title="Classer le signalement sans suite"
                                        >
                                            Classer
                                        </Button>
                                    </>
                                ) : (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={isPending}
                                        onClick={() =>
                                            handleUpdateStatus(report.id, 'pending')
                                        }
                                        className="text-xs px-2 py-1 h-auto text-zinc-500 hover:text-zinc-800"
                                    >
                                        Ré-ouvrir
                                    </Button>
                                )}
                            </div>
                        </td>
                    </tr>
                ))}
            </DataTable>

            <Pagination
                paginator={reports}
                noun="signalement"
                nounPlural="signalements"
            />

            {/* Modale de suspension de l'annonce */}
            <Modal
                open={Boolean(suspendingReport)}
                onClose={() => setSuspendingReport(null)}
                title="Masquer et suspendre l’annonce signalée"
            >
                {suspendingReport && (
                    <form onSubmit={handleSuspend} className="flex flex-col gap-4">
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                            Cette action passera l’annonce{' '}
                            <strong>« {suspendingReport.property_title} »</strong> en statut{' '}
                            <strong>Refusé / Suspendu</strong> et la retirera
                            immédiatement des résultats de recherche.
                        </p>

                        <Field
                            label="Motif du refus notifié à l’hôte"
                            htmlFor="suspend-reason"
                        >
                            <Textarea
                                id="suspend-reason"
                                rows={3}
                                required
                                value={suspendReason}
                                onChange={(e) => setSuspendReason(e.target.value)}
                            />
                        </Field>

                        <div className="flex justify-end gap-2">
                            <Button
                                variant="ghost"
                                onClick={() => setSuspendingReport(null)}
                            >
                                Annuler
                            </Button>
                            <Button
                                type="submit"
                                variant="danger"
                                loading={isPending}
                            >
                                Confirmer la suspension
                            </Button>
                        </div>
                    </form>
                )}
            </Modal>
        </div>
    );
}
