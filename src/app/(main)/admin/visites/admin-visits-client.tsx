'use client';

import Link from 'next/link';
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
    confirmVisitBankTransferAction,
    updatePropertyVisitStatusAction,
} from '@/lib/actions/visits';
import { switchManagedHostAction } from '@/lib/actions/managed-host';
import { formatDate, formatPrice } from '@/lib/format';
import type { Paginated, PropertyVisit } from '@/types';

type Props = {
    visits: Paginated<PropertyVisit>;
    statusTabs: { value: string; label: string; count: number }[];
    filters: {
        search: string;
        status: string;
    };
};

export function AdminVisitsClient({
    visits,
    statusTabs,
    filters,
}: Props) {
    const { applyResult, pushToast, router } = useActionFeedback();
    const [isPending, startTransition] = useTransition();

    const [cancellingVisit, setCancellingVisit] = useState<PropertyVisit | null>(null);
    const [cancelReason, setCancelReason] = useState('');
    const [viewingDetails, setViewingDetails] = useState<PropertyVisit | null>(null);
    const [switchingHostId, setSwitchingHostId] = useState<number | null>(null);

    function applyFilter(next: Partial<Props['filters']>) {
        const merged = { ...filters, ...next };
        router.push(
            buildFilterUrl('/admin/visites', {
                search: merged.search || undefined,
                status: merged.status || undefined,
            }),
        );
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
                    router.push('/hote/visites');
                } else {
                    pushToast({
                        type: 'error',
                        message: res.error || 'Erreur lors de la bascule vers cet espace.',
                    });
                }
            } finally {
                setSwitchingHostId(null);
            }
        });
    }

    function handleCompleteVisit(visit: PropertyVisit) {
        if (!confirm(`Confirmer que la visite du logement « ${visit.property_title} » avec ${visit.name} a bien été réalisée ?`)) {
            return;
        }

        startTransition(async () => {
            const res = await updatePropertyVisitStatusAction({
                visitId: visit.id,
                status: 'completed',
            });
            applyResult(res);
        });
    }

    function handleCancelVisit() {
        if (!cancellingVisit) return;

        startTransition(async () => {
            const res = await updatePropertyVisitStatusAction({
                visitId: cancellingVisit.id,
                status: 'cancelled',
                cancelReason: cancelReason.trim() || undefined,
            });
            applyResult(res, {
                onSuccess: () => {
                    setCancellingVisit(null);
                    setCancelReason('');
                },
            });
        });
    }

    function handleConfirmBankTransfer(visitId: number) {
        if (!confirm('Confirmer la bonne réception du virement pour les frais de visite ?')) {
            return;
        }

        startTransition(async () => {
            const res = await confirmVisitBankTransferAction(visitId);
            applyResult(res);
        });
    }

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                    Visites de logements & Candidatures
                </h1>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    Supervision globale de tous les rendez-vous de visite programmés en location classique (baux d’habitation).
                </p>
            </div>

            <StatusTabs
                tabs={statusTabs}
                current={filters.status}
                onChange={(status: string) => applyFilter({ status })}
            />

            <FilterBar
                search={filters.search}
                placeholder="Logement, propriétaire, candidat, référence ou email…"
                onSearch={(search) => applyFilter({ search })}
            />

            <DataTable
                head={[
                    'Logement',
                    'Propriétaire / Hôte',
                    'Candidat',
                    'Date & Créneau',
                    'Statut & Frais',
                    'Actions',
                ]}
                empty={visits.data.length === 0 ? 'Aucun rendez-vous de visite trouvé.' : false}
            >
                {visits.data.map((visit) => {
                    const isUpcoming = visit.status === 'confirmed' || visit.status === 'pending';
                    const isCompleted = visit.status === 'completed';
                    const isCancelled = visit.status === 'cancelled';

                    return (
                        <tr
                            key={visit.id}
                            className="transition hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40"
                        >
                            {/* Logement */}
                            <td className="px-3 py-2.5">
                                <div className="flex items-center gap-2.5">
                                    {visit.property_cover_url ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={visit.property_cover_url}
                                            alt={visit.property_title ?? 'Logement'}
                                            className="size-10 shrink-0 rounded-lg object-cover"
                                        />
                                    ) : (
                                        <div className="size-10 shrink-0 rounded-lg bg-zinc-100 flex items-center justify-center text-sm dark:bg-zinc-800">
                                            🏠
                                        </div>
                                    )}
                                    <div className="min-w-0 max-w-[170px] xl:max-w-[210px]">
                                        <Link
                                            href={`/logements/${visit.property_slug}`}
                                            target="_blank"
                                            className="font-semibold text-zinc-900 hover:text-primary-600 truncate block dark:text-zinc-100 dark:hover:text-primary-400"
                                            title={visit.property_title}
                                        >
                                            {visit.property_title}
                                        </Link>
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                                            {visit.property_city ?? 'Ville'}
                                            {visit.monthly_rent ? ` · ${formatPrice(visit.monthly_rent)}/m` : ''}
                                        </p>
                                        <span className="text-[10px] font-mono text-zinc-400 truncate block">
                                            Réf: {visit.reference}
                                        </span>
                                    </div>
                                </div>
                            </td>

                            {/* Propriétaire / Hôte */}
                            <td className="px-3 py-2.5 whitespace-nowrap">
                                <div className="flex flex-col min-w-0 max-w-[140px] xl:max-w-[170px]">
                                    <span className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                                        {visit.host_name ?? 'Inconnu'}
                                    </span>
                                    <span className="text-xs text-zinc-500 dark:text-zinc-400 truncate" title={visit.host_email}>
                                        {visit.host_email}
                                    </span>
                                    {visit.host_id && (
                                        <button
                                            type="button"
                                            disabled={switchingHostId === visit.host_id}
                                            onClick={() =>
                                                visit.host_id &&
                                                handleSwitchToHost(
                                                    visit.host_id,
                                                    visit.host_name ?? 'Hôte',
                                                )
                                            }
                                            className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold text-purple-700 hover:text-purple-900 hover:underline dark:text-purple-400 disabled:opacity-50"
                                            title={`Ouvrir l'espace hôte de ${visit.host_name}`}
                                        >
                                            {switchingHostId === visit.host_id ? (
                                                <span className="size-2.5 animate-spin rounded-full border border-purple-600 border-t-transparent" />
                                            ) : (
                                                <span>🏠</span>
                                            )}
                                            <span>Gérer</span>
                                        </button>
                                    )}
                                </div>
                            </td>

                            {/* Candidat */}
                            <td className="px-3 py-2.5">
                                <div className="flex flex-col min-w-0 max-w-[150px] xl:max-w-[180px]">
                                    <span className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                                        {visit.name}
                                    </span>
                                    <span className="text-xs text-zinc-500 truncate" title={visit.email}>
                                        {visit.email}
                                    </span>
                                    {visit.phone && (
                                        <span className="text-xs text-zinc-600 dark:text-zinc-400 truncate">
                                            📞 {visit.phone}
                                        </span>
                                    )}
                                    {visit.candidate_notes && (
                                        <button
                                            type="button"
                                            onClick={() => setViewingDetails(visit)}
                                            className="mt-0.5 text-left text-[11px] text-primary-600 hover:underline dark:text-primary-400 truncate"
                                            title={visit.candidate_notes}
                                        >
                                            📄 Dossier : {visit.candidate_notes}
                                        </button>
                                    )}
                                </div>
                            </td>

                            {/* Rendez-vous */}
                            <td className="px-3 py-2.5 whitespace-nowrap">
                                <div className="flex flex-col">
                                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                                        {formatDate(visit.visit_date)}
                                    </span>
                                    <span className="text-xs font-medium text-primary-700 dark:text-primary-400">
                                        ⏰ {visit.time_slot}
                                    </span>
                                </div>
                            </td>

                            {/* Statut & Frais */}
                            <td className="px-3 py-2.5 whitespace-nowrap">
                                <div className="flex flex-col gap-1 items-start">
                                    <div>
                                        {isUpcoming && (
                                            <Badge tone="primary">Confirmée</Badge>
                                        )}
                                        {isCompleted && (
                                            <Badge tone="success">Effectuée</Badge>
                                        )}
                                        {isCancelled && (
                                            <Badge tone="neutral">Annulée</Badge>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1.5 text-xs">
                                        <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                                            {visit.visit_fee > 0 ? formatPrice(visit.visit_fee) : 'Gratuit'}
                                        </span>
                                        {visit.visit_fee > 0 && (
                                            visit.payment_status === 'paid' ? (
                                                <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">· Réglé</span>
                                            ) : visit.payment_status === 'pending_transfer' ? (
                                                <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">· Virement en attente</span>
                                            ) : (
                                                <span className="text-[11px] font-medium text-zinc-500">· En attente</span>
                                            )
                                        )}
                                    </div>
                                    {visit.payment_status === 'pending_transfer' && (
                                        <button
                                            type="button"
                                            disabled={isPending}
                                            onClick={() => handleConfirmBankTransfer(visit.id)}
                                            className="text-left text-[11px] font-bold text-emerald-700 hover:underline dark:text-emerald-400"
                                        >
                                            ✓ Valider virement
                                        </button>
                                    )}
                                </div>
                            </td>

                            {/* Actions */}
                            <td className="px-3 py-2.5 whitespace-nowrap text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                    {isUpcoming && (
                                        <>
                                            <button
                                                type="button"
                                                disabled={isPending}
                                                onClick={() => handleCompleteVisit(visit)}
                                                title="Marquer comme effectuée"
                                                className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50/60 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 transition"
                                            >
                                                <span>✓</span>
                                                <span className="hidden sm:inline">Effectuée</span>
                                            </button>

                                            <button
                                                type="button"
                                                disabled={isPending}
                                                onClick={() => {
                                                    setCancellingVisit(visit);
                                                    setCancelReason('');
                                                }}
                                                title="Annuler ce rendez-vous"
                                                className="flex size-7 items-center justify-center rounded-lg border border-red-200 bg-red-50/50 text-xs font-bold text-red-600 hover:bg-red-100 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400 transition"
                                            >
                                                ✕
                                            </button>
                                        </>
                                    )}

                                    <a
                                        href={`mailto:${visit.email}?subject=Visite%20du%20logement%20${encodeURIComponent(visit.property_title ?? '')}`}
                                        className="inline-flex size-7 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                                        title={`Écrire à ${visit.name}`}
                                    >
                                        ✉️
                                    </a>

                                    <button
                                        type="button"
                                        onClick={() => setViewingDetails(visit)}
                                        title="Détails du candidat et du logement"
                                        className="inline-flex size-7 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                                    >
                                        👁
                                    </button>
                                </div>
                            </td>
                        </tr>
                    );
                })}
            </DataTable>

            <Pagination paginator={visits} noun="visite" nounPlural="visites" />

            {/* Modale d'annulation de visite */}
            <Modal
                open={Boolean(cancellingVisit)}
                onClose={() => setCancellingVisit(null)}
                title="Annuler le rendez-vous de visite"
            >
                {cancellingVisit && (
                    <div className="flex flex-col gap-4">
                        <p className="text-sm text-zinc-600 dark:text-zinc-300">
                            Vous êtes sur le point d’annuler la visite pour{' '}
                            <strong>{cancellingVisit.name}</strong> prévue le{' '}
                            <strong>{formatDate(cancellingVisit.visit_date)}</strong> à{' '}
                            <strong>{cancellingVisit.time_slot}</strong> sur le logement{' '}
                            <strong>« {cancellingVisit.property_title} »</strong> (propriétaire : {cancellingVisit.host_name}).
                        </p>

                        <Field
                            label="Motif d'annulation (envoyé par e-mail au candidat)"
                            htmlFor="cancel-visit-reason-admin"
                        >
                            <Textarea
                                id="cancel-visit-reason-admin"
                                rows={3}
                                value={cancelReason}
                                onChange={(e) => setCancelReason(e.target.value)}
                                placeholder="Ex : Logement déjà attribué, créneau non disponible, etc."
                            />
                        </Field>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setCancellingVisit(null)}
                            >
                                Revenir
                            </Button>
                            <Button
                                type="button"
                                disabled={isPending}
                                onClick={handleCancelVisit}
                                className="bg-red-600 hover:bg-red-700 text-white"
                            >
                                {isPending ? 'Annulation…' : 'Confirmer l’annulation'}
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Modale d'affichage des détails du dossier candidat */}
            <Modal
                open={Boolean(viewingDetails)}
                onClose={() => setViewingDetails(null)}
                title="Dossier & Notes du candidat"
            >
                {viewingDetails && (
                    <div className="flex flex-col gap-4">
                        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900">
                            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                                Logement concerné
                            </p>
                            <p className="mt-1 font-semibold text-zinc-900 dark:text-zinc-100">
                                {viewingDetails.property_title}
                            </p>
                            <p className="text-xs text-zinc-500">
                                {viewingDetails.property_city} · {viewingDetails.monthly_rent ? `${formatPrice(viewingDetails.monthly_rent)} / mois` : ''} · Propriétaire : {viewingDetails.host_name}
                            </p>
                        </div>

                        <div>
                            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                                Candidat
                            </p>
                            <p className="mt-1 text-sm font-bold text-zinc-900 dark:text-zinc-100">
                                {viewingDetails.name}
                            </p>
                            <p className="text-xs text-zinc-600 dark:text-zinc-400">
                                ✉️ {viewingDetails.email} {viewingDetails.phone ? `· 📞 ${viewingDetails.phone}` : ''}
                            </p>
                        </div>

                        <div>
                            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                                Informations & Situation transmises
                            </p>
                            <div className="mt-1 whitespace-pre-wrap rounded-xl border border-zinc-200 bg-white p-3 text-sm text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
                                {viewingDetails.candidate_notes || 'Aucune note complémentaire.'}
                            </div>
                        </div>

                        <div className="flex justify-end pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setViewingDetails(null)}
                            >
                                Fermer
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
