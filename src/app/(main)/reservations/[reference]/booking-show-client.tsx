'use client';

import Link from 'next/link';
import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { BookingResponse } from '@/components/booking-response';
import { BookingReview } from '@/components/booking-review';
import { BookingStatusBadge } from '@/components/booking-status-badge';
import { Button, buttonClasses } from '@/components/button';
import { Card, Container } from '@/components/card';
import { Alert, Field, Textarea } from '@/components/form';
import { Modal } from '@/components/modal';
import { PriceBreakdown } from '@/components/price-breakdown';
import { useActionFeedback } from '@/components/use-action-feedback';
import {
    cancelBookingAction,
    initiateBookingPaymentAction,
} from '@/lib/actions/bookings';
import type { FieldErrors } from '@/lib/actions/types';
import { formatDate, formatDateTime, formatPrice, plural } from '@/lib/format';
import type { Booking } from '@/types';

function StatusMessage({ booking }: { booking: Booking }) {
    const deadline = booking.expires_at
        ? formatDateTime(booking.expires_at)
        : null;
    const isHost = booking.viewer === 'host';

    switch (booking.status) {
        case 'pending':
            return (
                <Alert tone="warning">
                    {isHost
                        ? `${booking.guest.name} attend votre réponse${deadline ? ` avant le ${deadline}` : ''}.`
                        : `Votre demande a été transmise à ${booking.host.name}${deadline ? `, qui a jusqu’au ${deadline} pour répondre` : ''}.`}
                </Alert>
            );
        case 'awaiting_payment':
            return (
                <Alert tone="info">
                    {isHost
                        ? `En attente du paiement du voyageur${deadline ? ` (jusqu’au ${deadline})` : ''}.`
                        : `Vos dates sont bloquées. Réglez le séjour${deadline ? ` avant le ${deadline}` : ''} pour le confirmer.`}
                </Alert>
            );
        case 'confirmed':
            return (
                <Alert tone="success">
                    {isHost
                        ? 'Séjour payé et confirmé.'
                        : 'Paiement reçu, séjour confirmé. Bon voyage !'}
                </Alert>
            );
        case 'declined':
            return (
                <Alert tone="warning">
                    La demande a été refusée par l’hôte.
                </Alert>
            );
        case 'cancelled':
            return (
                <Alert tone="warning">
                    Cette réservation a été annulée.
                    {booking.refunded_amount > 0 &&
                        ` ${formatPrice(booking.refunded_amount)} ${isHost ? 'ont été remboursés au voyageur' : 'vous ont été remboursés'}.`}
                </Alert>
            );
        case 'expired':
            return (
                <Alert tone="warning">
                    Cette réservation a expiré : les dates ont été libérées.
                </Alert>
            );
        default:
            return null;
    }
}

export function BookingShowClient({
    booking,
    justPaid,
}: {
    booking: Booking;
    justPaid: boolean;
}) {
    const { applyResult, pushToast, router } = useActionFeedback();
    const [cancelling, setCancelling] = useState(false);
    const [cancelLoading, setCancelLoading] = useState(false);
    const [payLoading, setPayLoading] = useState(false);
    const [errors, setErrors] = useState<FieldErrors>({});

    const isHost = booking.viewer === 'host';

    useEffect(() => {
        if (justPaid && booking.status === 'confirmed') {
            pushToast({
                type: 'success',
                message: 'Paiement reçu ! Votre séjour est confirmé.',
            });
        }
    }, [justPaid, booking.status, pushToast]);

    useEffect(() => {
        if (booking.status !== 'awaiting_payment') {
            return;
        }
        const id = window.setInterval(() => {
            router.refresh();
        }, 5000);
        return () => window.clearInterval(id);
    }, [booking.status, router]);

    async function handlePay() {
        setPayLoading(true);
        try {
            const res = await initiateBookingPaymentAction(booking.reference);
            if (res.ok && res.data?.checkoutUrl) {
                window.location.href = res.data.checkoutUrl;
                return;
            }
            applyResult(res);
        } finally {
            setPayLoading(false);
        }
    }

    async function handleCancel(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setCancelLoading(true);
        setErrors({});
        const fd = new FormData(event.currentTarget);

        try {
            const res = await cancelBookingAction({
                reference: booking.reference,
                reason: String(fd.get('reason') ?? ''),
            });
            applyResult(res, {
                setFieldErrors: setErrors,
                onSuccess: () => setCancelling(false),
            });
        } finally {
            setCancelLoading(false);
        }
    }

    return (
        <>
            <Container className="grid gap-10 py-10 lg:grid-cols-[1fr_22rem]">
                <div className="flex flex-col gap-8">
                    <div>
                        <Link
                            href={isHost ? '/hote/reservations' : '/voyages'}
                            className="text-sm font-medium text-zinc-600 hover:underline dark:text-zinc-400"
                        >
                            ← {isHost ? 'Réservations reçues' : 'Mes voyages'}
                        </Link>
                        <div className="mt-3 flex flex-wrap items-center gap-3">
                            <h1 className="text-2xl font-semibold">
                                {booking.property.title}
                            </h1>
                            <BookingStatusBadge
                                status={booking.status}
                                label={booking.status_label}
                            />
                        </div>
                        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                            Réservation {booking.reference}
                            {booking.created_at &&
                                ` · effectuée le ${formatDate(booking.created_at.slice(0, 10))}`}
                        </p>
                    </div>

                    <StatusMessage booking={booking} />

                    <dl className="grid gap-6 sm:grid-cols-2">
                        <div>
                            <dt className="text-sm text-zinc-500 dark:text-zinc-400">
                                Arrivée
                            </dt>
                            <dd className="font-medium">
                                {formatDate(booking.check_in, {
                                    weekday: 'long',
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric',
                                })}
                            </dd>
                            <dd className="text-sm text-zinc-500 dark:text-zinc-400">
                                à partir de {booking.property.check_in_time}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-sm text-zinc-500 dark:text-zinc-400">
                                Départ
                            </dt>
                            <dd className="font-medium">
                                {formatDate(booking.check_out, {
                                    weekday: 'long',
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric',
                                })}
                            </dd>
                            <dd className="text-sm text-zinc-500 dark:text-zinc-400">
                                avant {booking.property.check_out_time}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-sm text-zinc-500 dark:text-zinc-400">
                                Voyageurs
                            </dt>
                            <dd className="font-medium">
                                {plural(booking.guests, 'voyageur')}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-sm text-zinc-500 dark:text-zinc-400">
                                {isHost ? 'Voyageur' : 'Hôte'}
                            </dt>
                            <dd className="font-medium">
                                {isHost
                                    ? booking.guest.name
                                    : booking.host.name}
                            </dd>
                        </div>
                        <div className="sm:col-span-2">
                            <dt className="text-sm text-zinc-500 dark:text-zinc-400">
                                Adresse
                            </dt>
                            <dd className="font-medium">
                                {booking.property.address ??
                                    `${booking.property.city ?? ''}, ${booking.property.country ?? ''}`}
                            </dd>
                            {!booking.property.address && (
                                <dd className="text-sm text-zinc-500 dark:text-zinc-400">
                                    L’adresse exacte s’affichera une fois le
                                    séjour confirmé.
                                </dd>
                            )}
                        </div>
                    </dl>

                    {booking.special_requests && (
                        <section>
                            <h2 className="text-sm text-zinc-500 dark:text-zinc-400">
                                Message du voyageur
                            </h2>
                            <p className="mt-1 whitespace-pre-line">
                                {booking.special_requests}
                            </p>
                        </section>
                    )}
                    {booking.cancellation_reason && (
                        <section>
                            <h2 className="text-sm text-zinc-500 dark:text-zinc-400">
                                Motif
                            </h2>
                            <p className="mt-1 whitespace-pre-line">
                                {booking.cancellation_reason}
                            </p>
                        </section>
                    )}

                    {booking.can.message && (
                        <Link
                            href={`/messages/${booking.reference}`}
                            className={buttonClasses({
                                variant: 'secondary',
                                className: 'self-start',
                            })}
                        >
                            {isHost
                                ? `Écrire à ${booking.guest.name}`
                                : `Écrire à ${booking.host.name}`}
                        </Link>
                    )}

                    <BookingReview booking={booking} />

                    {(booking.can.respond || booking.can.cancel) && (
                        <div className="flex flex-wrap gap-2 border-t border-zinc-200 pt-6 dark:border-zinc-800">
                            {booking.can.respond && (
                                <BookingResponse booking={booking} />
                            )}
                            {booking.can.cancel &&
                                booking.status !== 'pending' && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCancelling(true)}
                                    >
                                        Annuler la réservation
                                    </Button>
                                )}
                            {booking.can.cancel &&
                                booking.status === 'pending' &&
                                !isHost && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCancelling(true)}
                                    >
                                        Retirer ma demande
                                    </Button>
                                )}
                        </div>
                    )}
                </div>

                <aside>
                    <Card className="flex flex-col gap-4 p-5 lg:sticky lg:top-24">
                        {booking.property.cover_url && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={booking.property.cover_url}
                                alt=""
                                className="aspect-4/3 w-full rounded-xl object-cover"
                            />
                        )}
                        <Link
                            href={`/logements/${booking.property.slug}`}
                            className="font-medium hover:underline"
                        >
                            {booking.property.title}
                        </Link>
                        <PriceBreakdown
                            price={booking}
                            totalLabel={
                                booking.paid_at ? 'Total payé' : 'Total'
                            }
                            className="border-t border-zinc-200 pt-4 dark:border-zinc-800"
                        />
                        {booking.can.pay && (
                            <div className="flex flex-col gap-2">
                                <Button
                                    type="button"
                                    size="lg"
                                    loading={payLoading}
                                    onClick={() => void handlePay()}
                                >
                                    Payer {formatPrice(booking.total_price)}
                                </Button>
                                <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
                                    Paiement sécurisé par Stripe. Vous serez
                                    redirigé vers la page de paiement.
                                </p>
                            </div>
                        )}
                        {booking.viewer === 'guest' &&
                            booking.status !== 'cancelled' && (
                                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                    {booking.refund_policy}
                                </p>
                            )}
                    </Card>
                </aside>
            </Container>

            <Modal
                open={cancelling}
                onClose={() => setCancelling(false)}
                title="Annuler la réservation"
            >
                <form
                    onSubmit={(event) => void handleCancel(event)}
                    className="flex flex-col gap-4"
                >
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        Les dates seront libérées et{' '}
                        {isHost ? 'le voyageur' : 'l’hôte'} sera prévenu par
                        e-mail.
                    </p>
                    {booking.paid_at && (
                        <p className="rounded-lg bg-zinc-50 p-3 text-sm dark:bg-zinc-900">
                            {booking.refund_if_cancelled > 0
                                ? `${isHost ? 'Le voyageur sera remboursé' : 'Vous serez remboursé'} de ${formatPrice(booking.refund_if_cancelled)} sur ${formatPrice(booking.total_price)}.`
                                : 'Aucun remboursement ne sera effectué.'}
                        </p>
                    )}
                    <Field
                        label="Motif (facultatif)"
                        htmlFor="reason"
                        error={errors.reason}
                    >
                        <Textarea
                            id="reason"
                            name="reason"
                            rows={3}
                            maxLength={500}
                        />
                    </Field>
                    <div className="flex justify-end gap-2">
                        <Button
                            variant="ghost"
                            onClick={() => setCancelling(false)}
                        >
                            Garder la réservation
                        </Button>
                        <Button
                            type="submit"
                            variant="danger"
                            loading={cancelLoading}
                        >
                            Confirmer l’annulation
                        </Button>
                    </div>
                </form>
            </Modal>
        </>
    );
}

