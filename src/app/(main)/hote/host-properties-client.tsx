'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { Button } from '@/components/button';
import { Badge, Card } from '@/components/card';
import { Modal } from '@/components/modal';
import { PropertyStatusBadge } from '@/components/status-badge';
import { useActionFeedback } from '@/components/use-action-feedback';
import { deletePropertyAction } from '@/lib/actions/host';
import type { PropertyStatus, RentalDuration } from '@/lib/domain/enums';
import { formatPrice, plural } from '@/lib/format';

export type HostPropertyItem = {
    id: number;
    slug: string;
    title: string;
    rental_duration: RentalDuration;
    city: string | null;
    status: PropertyStatus;
    status_label: string;
    price_per_night: number;
    monthly_rent: number;
    cover_url: string | null;
    upcoming_bookings: number;
};

export function HostPropertiesClient({
    properties,
}: {
    properties: HostPropertyItem[];
}) {
    const { applyResult, router } = useActionFeedback();
    const [deletingProperty, setDeletingProperty] =
        useState<HostPropertyItem | null>(null);
    const [isPending, startTransition] = useTransition();

    function handleDelete(property: HostPropertyItem) {
        setDeletingProperty(property);
    }

    function confirmDelete() {
        if (!deletingProperty) {
            return;
        }

        startTransition(async () => {
            const res = await deletePropertyAction(deletingProperty.slug);
            applyResult(res, {
                onSuccess: () => {
                    setDeletingProperty(null);
                    router.refresh();
                },
            });
        });
    }

    return (
        <>
            <ul className="mt-8 flex flex-col gap-4">
                {properties.map((property) => (
                    <li key={property.id}>
                        <Card className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                            <div className="aspect-4/3 w-full shrink-0 overflow-hidden rounded-xl bg-zinc-100 sm:w-36 dark:bg-zinc-800">
                                {property.cover_url && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={property.cover_url}
                                        alt=""
                                        className="size-full object-cover"
                                    />
                                )}
                            </div>
                            <div className="flex flex-1 flex-col gap-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h2 className="font-medium text-zinc-900 dark:text-zinc-100">
                                        {property.title}
                                    </h2>
                                    <PropertyStatusBadge
                                        status={property.status}
                                        label={property.status_label}
                                    />
                                    {property.rental_duration ===
                                        'long_term' && (
                                        <Badge tone="secondary">
                                            Longue durée
                                        </Badge>
                                    )}
                                </div>
                                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                    {property.city ?? 'Ville à préciser'}
                                    {property.rental_duration === 'long_term'
                                        ? property.monthly_rent > 0 &&
                                          ` · ${formatPrice(property.monthly_rent)} / mois`
                                        : property.price_per_night > 0 &&
                                          ` · ${formatPrice(property.price_per_night)} / nuit`}
                                    {property.upcoming_bookings > 0 &&
                                        ` · ${plural(property.upcoming_bookings, 'séjour à venir', 'séjours à venir')}`}
                                </p>
                            </div>

                            {/* Actions avec icônes Calendrier, Stylo (Modifier), Poubelle (Supprimer) */}
                            <div className="flex items-center gap-2 self-end sm:self-center">
                                {/* Calendrier */}
                                <Link
                                    href={`/hote/logements/${property.slug}/calendrier`}
                                    title="Calendrier & Disponibilités"
                                    aria-label="Calendrier"
                                    className="flex size-9 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 shadow-2xs transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-700 dark:hover:text-zinc-100"
                                >
                                    <svg
                                        viewBox="0 0 20 20"
                                        fill="currentColor"
                                        className="size-4.5"
                                        aria-hidden="true"
                                    >
                                        <path
                                            fillRule="evenodd"
                                            d="M5.75 2a.75.75 0 0 1 .75.75V4h7V2.75a.75.75 0 0 1 1.5 0V4h.25A2.75 2.75 0 0 1 18 6.75v8.5A2.75 2.75 0 0 1 15.25 18H4.75A2.75 2.75 0 0 1 2 15.25v-8.5A2.75 2.75 0 0 1 4.75 4H5V2.75A.75.75 0 0 1 5.75 2Zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75Z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                </Link>

                                {/* Stylo (Modifier) */}
                                <Link
                                    href={`/hote/logements/${property.slug}/modifier`}
                                    title="Modifier ce logement"
                                    aria-label="Modifier"
                                    className="flex size-9 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 shadow-2xs transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-700 dark:hover:text-zinc-100"
                                >
                                    <svg
                                        viewBox="0 0 20 20"
                                        fill="currentColor"
                                        className="size-4.5"
                                        aria-hidden="true"
                                    >
                                        <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
                                        <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" />
                                    </svg>
                                </Link>

                                {/* Poubelle (Supprimer) */}
                                <button
                                    type="button"
                                    onClick={() => handleDelete(property)}
                                    title="Supprimer ce logement"
                                    aria-label="Supprimer"
                                    className="flex size-9 items-center justify-center rounded-xl border border-red-200 bg-red-50/50 text-red-600 shadow-2xs transition hover:border-red-300 hover:bg-red-100 hover:text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-400 dark:hover:border-red-800 dark:hover:bg-red-900/50"
                                >
                                    <svg
                                        viewBox="0 0 20 20"
                                        fill="currentColor"
                                        className="size-4.5"
                                        aria-hidden="true"
                                    >
                                        <path
                                            fillRule="evenodd"
                                            d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                </button>
                            </div>
                        </Card>
                    </li>
                ))}
            </ul>

            {/* Modale de confirmation de suppression */}
            <Modal
                open={deletingProperty !== null}
                onClose={() => setDeletingProperty(null)}
                title="Supprimer définitivement ce logement"
            >
                <div className="flex flex-col gap-4">
                    <p className="text-sm text-zinc-600 dark:text-zinc-300">
                        Êtes-vous sûr de vouloir supprimer définitivement le logement{' '}
                        <strong className="text-zinc-900 dark:text-zinc-100">
                            « {deletingProperty?.title} »
                        </strong>{' '}
                        ({deletingProperty?.status_label}) ?
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Cette action est irréversible et supprimera le bien ainsi que l’ensemble des photos et paramètres associés.
                    </p>
                    <div className="flex justify-end gap-3 pt-2">
                        <Button
                            variant="outline"
                            onClick={() => setDeletingProperty(null)}
                            disabled={isPending}
                        >
                            Annuler
                        </Button>
                        <Button
                            variant="danger"
                            loading={isPending}
                            onClick={confirmDelete}
                        >
                            Supprimer
                        </Button>
                    </div>
                </div>
            </Modal>
        </>
    );
}

