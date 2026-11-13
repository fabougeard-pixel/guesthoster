'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import {
    publishPropertyAction,
    rejectPropertyAction,
} from '@/lib/actions/admin';
import { deletePropertyAction } from '@/lib/actions/host';
import type { FieldErrors } from '@/lib/actions/types';
import { canPropertyTransitionTo } from '@/lib/domain/enums';
import { formatDateTime, formatPrice, plural } from '@/lib/format';
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
import { PropertyStatusBadge } from '@/components/status-badge';
import { useActionFeedback } from '@/components/use-action-feedback';
import type { AdminProperty, Paginated } from '@/types';

type Props = {
    properties: Paginated<AdminProperty>;
    statusTabs: { value: string; label: string; count: number }[];
    filters: {
        search: string;
        status: string;
    };
};

export function AdminPropertiesClient({
    properties,
    statusTabs,
    filters,
}: Props) {
    const { applyResult, router } = useActionFeedback();
    const [pendingSlug, setPendingSlug] = useState<string | null>(null);
    const [rejecting, setRejecting] = useState<AdminProperty | null>(null);
    const [reason, setReason] = useState('');
    const [errors, setErrors] = useState<FieldErrors>({});
    const [isPending, startTransition] = useTransition();

    function applyFilter(next: Partial<Props['filters']>) {
        const merged = { ...filters, ...next };
        router.push(
            buildFilterUrl('/admin/logements', {
                status: merged.status || undefined,
                search: merged.search || undefined,
            }),
        );
    }

    function handlePublish(property: AdminProperty) {
        setPendingSlug(property.slug);
        startTransition(async () => {
            try {
                const res = await publishPropertyAction(property.slug);
                applyResult(res);
            } finally {
                setPendingSlug(null);
            }
        });
    }

    function handleRejectSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!rejecting) {
            return;
        }
        const target = rejecting;
        setErrors({});
        setPendingSlug(target.slug);

        startTransition(async () => {
            try {
                const res = await rejectPropertyAction({
                    slug: target.slug,
                    reason,
                });
                applyResult(res, {
                    setFieldErrors: setErrors,
                    onSuccess: () => {
                        setRejecting(null);
                        setReason('');
                        setErrors({});
                    },
                });
            } finally {
                setPendingSlug(null);
            }
        });
    }

    function handleDelete(property: AdminProperty) {
        if (
            !window.confirm(
                `Supprimer définitivement le logement « ${property.title} » ? Cette action est irréversible.`,
            )
        ) {
            return;
        }
        setPendingSlug(property.slug);
        startTransition(async () => {
            try {
                const res = await deletePropertyAction(property.slug, {
                    isAdminContext: true,
                });
                applyResult(res);
            } finally {
                setPendingSlug(null);
            }
        });
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Annonces</h1>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        Modération, édition et attribution des logements de la plateforme.
                    </p>
                </div>
                <Link
                    href="/admin/logements/nouveau"
                    className="inline-flex items-center justify-center rounded-lg bg-primary-600 px-3.5 py-2 text-sm font-semibold text-white shadow-xs transition hover:bg-primary-700 focus:outline-none"
                >
                    + Ajouter un logement
                </Link>
            </div>

            <StatusTabs
                tabs={statusTabs}
                current={filters.status}
                onChange={(status) => applyFilter({ status })}
            />

            <FilterBar
                key={`${filters.search}:${filters.status}`}
                search={filters.search}
                placeholder="Rechercher par titre, ville ou hôte…"
                onSearch={(search) => applyFilter({ search })}
            />

            <DataTable
                head={['Annonce', 'Hôte', 'Mode', 'Tarif', 'Statut', 'Actions']}
                empty={
                    properties.data.length === 0
                        ? 'Aucune annonce correspondante.'
                        : false
                }
            >
                {properties.data.map((property) => {
                    const busy = isPending && pendingSlug === property.slug;
                    const canPublish = canPropertyTransitionTo(
                        property.status,
                        'published',
                    );
                    const canReject = canPropertyTransitionTo(
                        property.status,
                        'rejected',
                    );

                    return (
                        <tr key={property.id}>
                            <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                    {property.cover_url ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={property.cover_url}
                                            alt={property.title}
                                            className="h-11 w-14 shrink-0 rounded-lg object-cover"
                                        />
                                    ) : (
                                        <div className="h-11 w-14 shrink-0 rounded-lg bg-zinc-100 dark:bg-zinc-800" />
                                    )}
                                    <div className="min-w-0">
                                        <p className="truncate font-medium text-zinc-900 dark:text-zinc-100">
                                            {property.title}
                                        </p>
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                            {property.type} ·{' '}
                                            {property.rental_duration ===
                                            'long_term'
                                                ? 'Longue durée'
                                                : 'Courte durée'}{' '}
                                            ·{' '}
                                            {property.city ?? 'Ville non définie'}{' '}
                                            · {plural(property.photos, 'photo')}
                                        </p>
                                        {property.submitted_at && (
                                            <p className="mt-0.5 text-xs text-zinc-400">
                                                Soumise le{' '}
                                                {formatDateTime(
                                                    property.submitted_at,
                                                )}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </td>
                            <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-zinc-900 dark:text-zinc-100">
                                        {property.host.name}
                                    </span>
                                    {property.host.suspended && (
                                        <Badge tone="danger">Suspendu</Badge>
                                    )}
                                </div>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                    {property.host.email}
                                </p>
                            </td>
                            <td className="px-4 py-3 text-xs whitespace-nowrap text-zinc-600 dark:text-zinc-300">
                                {property.booking_mode}
                            </td>
                            <td className="px-4 py-3 text-xs font-medium whitespace-nowrap tabular-nums">
                                {property.rental_duration === 'long_term'
                                    ? `${formatPrice(property.monthly_rent)} / mois`
                                    : `${formatPrice(property.price_per_night)} / nuit`}
                            </td>
                            <td className="px-4 py-3">
                                <PropertyStatusBadge
                                    status={property.status}
                                    label={property.status_label}
                                />
                                {property.rejection_reason && (
                                    <p
                                        className="mt-1 max-w-52 truncate text-xs text-red-600 dark:text-red-400"
                                        title={property.rejection_reason}
                                    >
                                        {property.rejection_reason}
                                    </p>
                                )}
                            </td>
                            <td className="px-4 py-3">
                                <div className="flex items-center justify-end gap-1.5">
                                    {/* Modifier : Stylo */}
                                    <Link
                                        href={`/admin/logements/${property.slug}/modifier/details`}
                                        title="Modifier"
                                        aria-label="Modifier"
                                        className="flex size-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 dark:hover:text-zinc-100"
                                    >
                                        <svg
                                            viewBox="0 0 20 20"
                                            fill="currentColor"
                                            className="size-4"
                                            aria-hidden="true"
                                        >
                                            <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
                                            <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" />
                                        </svg>
                                    </Link>

                                    {/* Aperçu : Œil */}
                                    <Link
                                        href={`/logements/${property.slug}`}
                                        target="_blank"
                                        title="Aperçu"
                                        aria-label="Aperçu"
                                        className="flex size-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 dark:hover:text-zinc-100"
                                    >
                                        <svg
                                            viewBox="0 0 20 20"
                                            fill="currentColor"
                                            className="size-4"
                                            aria-hidden="true"
                                        >
                                            <path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
                                            <path
                                                fillRule="evenodd"
                                                d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                    </Link>

                                    {/* Publier (si applicable) */}
                                    {canPublish && (
                                        <button
                                            type="button"
                                            disabled={busy}
                                            onClick={() =>
                                                handlePublish(property)
                                            }
                                            title="Publier"
                                            aria-label="Publier"
                                            className="flex size-8 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/50"
                                        >
                                            <svg
                                                viewBox="0 0 20 20"
                                                fill="currentColor"
                                                className="size-4"
                                                aria-hidden="true"
                                            >
                                                <path
                                                    fillRule="evenodd"
                                                    d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                                                    clipRule="evenodd"
                                                />
                                            </svg>
                                        </button>
                                    )}

                                    {/* Refuser (si applicable) : icône avec hover "Refuser" */}
                                    {canReject && (
                                        <button
                                            type="button"
                                            disabled={busy}
                                            onClick={() => {
                                                setRejecting(property);
                                                setReason(
                                                    property.rejection_reason ??
                                                        '',
                                                );
                                                setErrors({});
                                            }}
                                            title="Refuser"
                                            aria-label="Refuser"
                                            className="flex size-8 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 text-amber-700 transition hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-900/50"
                                        >
                                            <svg
                                                viewBox="0 0 20 20"
                                                fill="currentColor"
                                                className="size-4"
                                                aria-hidden="true"
                                            >
                                                <path
                                                    fillRule="evenodd"
                                                    d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z"
                                                    clipRule="evenodd"
                                                />
                                            </svg>
                                        </button>
                                    )}

                                    {/* Supprimer : Corbeille */}
                                    <button
                                        type="button"
                                        disabled={busy}
                                        onClick={() =>
                                            handleDelete(property)
                                        }
                                        title="Supprimer"
                                        aria-label="Supprimer ce logement"
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
                    );
                })}
            </DataTable>

            <Pagination
                paginator={properties}
                noun="annonce"
                nounPlural="annonces"
            />

            <Modal
                open={rejecting !== null}
                onClose={() => {
                    if (!isPending) {
                        setRejecting(null);
                    }
                }}
                title={
                    rejecting
                        ? `Refuser « ${rejecting.title} »`
                        : 'Refuser l’annonce'
                }
            >
                <form onSubmit={handleRejectSubmit} className="space-y-4">
                    <Field
                        label="Motif du refus"
                        htmlFor="reject-reason"
                        error={errors.reason}
                        hint="Ce message est envoyé à l’hôte (10 caractères minimum)."
                    >
                        <Textarea
                            id="reject-reason"
                            value={reason}
                            onChange={(event) => setReason(event.target.value)}
                            aria-invalid={Boolean(errors.reason)}
                            placeholder="Expliquez les éléments à corriger avant republication…"
                            required
                        />
                    </Field>
                    <div className="flex justify-end gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setRejecting(null)}
                            disabled={isPending}
                        >
                            Annuler
                        </Button>
                        <Button
                            type="submit"
                            variant="danger"
                            loading={isPending}
                        >
                            Confirmer le refus
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
