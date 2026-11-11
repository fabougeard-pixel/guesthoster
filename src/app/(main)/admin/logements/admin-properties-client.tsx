'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import {
    publishPropertyAction,
    rejectPropertyAction,
} from '@/lib/actions/admin';
import type { FieldErrors } from '@/lib/actions/types';
import { canPropertyTransitionTo } from '@/lib/domain/enums';
import { formatDateTime, formatPrice, plural } from '@/lib/format';
import {
    DataTable,
    FilterBar,
    StatusTabs,
    buildFilterUrl,
} from '@/components/admin/filters';
import { Button, buttonClasses } from '@/components/button';
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
                    className={buttonClasses({ size: 'sm' })}
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
                                {formatPrice(property.price_per_night)} / nuit
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
                                <div className="flex justify-end gap-1.5">
                                    <Link
                                        href={`/admin/logements/${property.slug}/modifier/details`}
                                        className={buttonClasses({
                                            variant: 'outline',
                                            size: 'sm',
                                        })}
                                    >
                                        Modifier
                                    </Link>
                                    <Link
                                        href={`/logements/${property.slug}`}
                                        target="_blank"
                                        className={buttonClasses({
                                            variant: 'ghost',
                                            size: 'sm',
                                        })}
                                    >
                                        Aperçu
                                    </Link>
                                    {canPublish && (
                                        <Button
                                            size="sm"
                                            loading={busy}
                                            onClick={() =>
                                                handlePublish(property)
                                            }
                                        >
                                            Publier
                                        </Button>
                                    )}
                                    {canReject && (
                                        <Button
                                            variant="danger"
                                            size="sm"
                                            disabled={busy}
                                            onClick={() => {
                                                setRejecting(property);
                                                setReason(
                                                    property.rejection_reason ??
                                                    '',
                                                );
                                                setErrors({});
                                            }}
                                        >
                                            Refuser
                                        </Button>
                                    )}
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

