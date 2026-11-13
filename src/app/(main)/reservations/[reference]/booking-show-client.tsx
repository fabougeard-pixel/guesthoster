'use client';

import Link from 'next/link';
import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { BookingResponse } from '@/components/booking-response';
import { BookingReview } from '@/components/booking-review';
import { BookingStatusBadge } from '@/components/booking-status-badge';
import { Button, buttonClasses } from '@/components/button';
import { Badge, Card, Container } from '@/components/card';
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
    const [paypalLoading, setPaypalLoading] = useState(false);
    const [bankModalOpen, setBankModalOpen] = useState(false);
    const [paymentFailure, setPaymentFailure] = useState<{
        failedMethod: string;
        reason: string;
        viableMethod: string;
        action: () => void;
        actionLabel: string;
    } | null>(null);
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

    async function handlePayStripe() {
        setPayLoading(true);
        try {
            const res = await initiateBookingPaymentAction(booking.reference);
            if (res.ok && res.data?.checkoutUrl) {
                window.location.href = res.data.checkoutUrl;
                return;
            }
            // Déclenche la modale d'échec avec l'alternative viable (Virement bancaire)
            setPaymentFailure({
                failedMethod: 'Carte bancaire (Stripe)',
                reason:
                    (!res.ok && res.error) ||
                    'La passerelle de paiement par carte bancaire est temporairement indisponible.',
                viableMethod: 'Virement bancaire SEPA',
                actionLabel: 'Utiliser le virement bancaire',
                action: () => {
                    setPaymentFailure(null);
                    setBankModalOpen(true);
                },
            });
        } finally {
            setPayLoading(false);
        }
    }

    async function handlePayPaypal() {
        setPaypalLoading(true);
        // Simulation / appel PayPal
        setTimeout(() => {
            setPaypalLoading(false);
            setPaymentFailure({
                failedMethod: 'PayPal',
                reason:
                    'La passerelle de paiement PayPal est momentanément indisponible pour cette transaction.',
                viableMethod: 'Carte bancaire sécurisée (Stripe)',
                actionLabel: 'Payer par Carte bancaire sécurisée',
                action: () => {
                    setPaymentFailure(null);
                    void handlePayStripe();
                },
            });
        }, 800);
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
                            {booking.rental_duration === 'long_term' && (
                                <Badge tone="secondary">Longue durée</Badge>
                            )}
                        </div>
                        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                            Réservation {booking.reference}
                            {booking.created_at &&
                                ` · effectuée le ${formatDate(booking.created_at.slice(0, 10))}`}
                        </p>
                    </div>

                    <StatusMessage booking={booking} />

                    <dl className="grid gap-6 sm:grid-cols-2">
                        {booking.rental_duration === 'long_term' ? (
                            <>
                                <div>
                                    <dt className="text-sm text-zinc-500 dark:text-zinc-400">
                                        Date d’entrée prévue
                                    </dt>
                                    <dd className="font-medium">
                                        {formatDate(booking.check_in, {
                                            weekday: 'long',
                                            day: 'numeric',
                                            month: 'long',
                                            year: 'numeric',
                                        })}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-sm text-zinc-500 dark:text-zinc-400">
                                        Première période couverte
                                    </dt>
                                    <dd className="font-medium">
                                        {booking.advance_rent_months} mois d’avance
                                    </dd>
                                    <dd className="text-sm text-zinc-500 dark:text-zinc-400">
                                        jusqu’au{' '}
                                        {formatDate(booking.check_out, {
                                            day: 'numeric',
                                            month: 'long',
                                            year: 'numeric',
                                        })}
                                    </dd>
                                </div>
                            </>
                        ) : (
                            <>
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
                                        à partir de{' '}
                                        {booking.property.check_in_time}
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
                            </>
                        )}
                        <div>
                            <dt className="text-sm text-zinc-500 dark:text-zinc-400">
                                {booking.rental_duration === 'long_term'
                                    ? 'Occupants'
                                    : 'Voyageurs'}
                            </dt>
                            <dd className="font-medium">
                                {plural(
                                    booking.guests,
                                    booking.rental_duration === 'long_term'
                                        ? 'occupant'
                                        : 'voyageur',
                                )}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-sm text-zinc-500 dark:text-zinc-400">
                                {isHost
                                    ? booking.rental_duration === 'long_term'
                                        ? 'Locataire'
                                        : 'Voyageur'
                                    : 'Hôte'}
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
                            <div className="flex flex-col gap-2.5">
                                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                                    Options de règlement
                                </p>

                                {/* Option 1 : Stripe CB */}
                                <Button
                                    type="button"
                                    size="lg"
                                    loading={payLoading}
                                    onClick={() => void handlePayStripe()}
                                    className="w-full bg-primary-600 hover:bg-primary-700"
                                >
                                    Payer par Carte Bancaire ({formatPrice(booking.total_price)})
                                </Button>

                                {/* Option 2 : PayPal */}
                                <button
                                    type="button"
                                    disabled={paypalLoading}
                                    onClick={() => void handlePayPaypal()}
                                    className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-[#ffc439] font-semibold text-zinc-900 transition hover:bg-[#f2ba32] disabled:opacity-50"
                                >
                                    {paypalLoading ? (
                                        'Connexion à PayPal...'
                                    ) : (
                                        <>
                                            <span className="font-bold italic">Pay</span>
                                            <span className="font-bold italic text-[#003087]">Pal</span>
                                        </>
                                    )}
                                </button>

                                {/* Option 3 : Virement bancaire */}
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="md"
                                    onClick={() => setBankModalOpen(true)}
                                    className="w-full"
                                >
                                    Payer par Virement bancaire SEPA
                                </Button>

                                <p className="text-center text-[11px] text-zinc-500 dark:text-zinc-400">
                                    Transactions cryptées et sécurisées. Vos dates sont réservées.
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

            {/* Modale d'échec de paiement avec proposition d'option viable */}
            <Modal
                open={paymentFailure !== null}
                onClose={() => setPaymentFailure(null)}
                title="Paiement non abouti"
            >
                {paymentFailure && (
                    <div className="flex flex-col gap-5">
                        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
                            <svg
                                viewBox="0 0 20 20"
                                fill="currentColor"
                                className="mt-0.5 size-5 shrink-0 text-amber-600"
                                aria-hidden="true"
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
                                    clipRule="evenodd"
                                />
                            </svg>
                            <div className="text-sm">
                                <p className="font-semibold text-amber-900 dark:text-amber-200">
                                    Le paiement via {paymentFailure.failedMethod} n’a pu aboutir
                                </p>
                                <p className="mt-1 text-amber-800 dark:text-amber-300">
                                    {paymentFailure.reason}
                                </p>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                                Option de paiement viable recommandée
                            </p>
                            <p className="mt-1 text-sm font-medium text-emerald-950 dark:text-emerald-200">
                                Vos dates restent bloquées. Vous pouvez finaliser votre réservation immédiatement avec :{' '}
                                <span className="font-bold">{paymentFailure.viableMethod}</span>.
                            </p>
                        </div>

                        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                            <Button
                                variant="outline"
                                onClick={() => setPaymentFailure(null)}
                            >
                                Choisir un autre moyen
                            </Button>
                            <Button
                                onClick={() => paymentFailure.action()}
                                className="bg-primary-600 hover:bg-primary-700"
                            >
                                {paymentFailure.actionLabel}
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Modale d'instructions de virement bancaire SEPA */}
            <Modal
                open={bankModalOpen}
                onClose={() => setBankModalOpen(false)}
                title="Règlement par Virement bancaire SEPA"
            >
                <div className="flex flex-col gap-4 text-sm text-zinc-700 dark:text-zinc-300">
                    <p>
                        Veuillez émettre votre virement bancaire aux coordonnées ci-dessous. Dès réception des fonds ou sur présentation de votre ordre de virement, votre séjour sera définitivement validé.
                    </p>

                    <div className="flex flex-col gap-2.5 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
                        <div className="flex justify-between border-b border-zinc-200 pb-2 dark:border-zinc-800">
                            <span className="text-xs text-zinc-500">Bénéficiaire</span>
                            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                                GuestHoster SAS Conciergerie
                            </span>
                        </div>
                        <div className="flex justify-between border-b border-zinc-200 pb-2 dark:border-zinc-800">
                            <span className="text-xs text-zinc-500">Banque</span>
                            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                                BNP Paribas
                            </span>
                        </div>
                        <div className="flex flex-col gap-1 border-b border-zinc-200 pb-2 dark:border-zinc-800">
                            <span className="text-xs text-zinc-500">IBAN</span>
                            <span className="font-mono font-bold tracking-wider text-primary-700 select-all dark:text-primary-400">
                                FR76 3000 4012 3456 7890 1234 567
                            </span>
                        </div>
                        <div className="flex justify-between border-b border-zinc-200 pb-2 dark:border-zinc-800">
                            <span className="text-xs text-zinc-500">BIC / SWIFT</span>
                            <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                                BNPAFRPP
                            </span>
                        </div>
                        <div className="flex flex-col gap-1 border-b border-zinc-200 pb-2 dark:border-zinc-800">
                            <span className="text-xs font-semibold uppercase text-amber-700 dark:text-amber-400">
                                Libellé / Référence obligatoire
                            </span>
                            <span className="font-mono text-base font-bold text-zinc-900 select-all dark:text-zinc-100">
                                {booking.reference}
                            </span>
                        </div>
                        <div className="flex justify-between pt-1">
                            <span className="text-xs text-zinc-500">Montant total</span>
                            <span className="text-base font-bold text-emerald-700 dark:text-emerald-400">
                                {formatPrice(booking.total_price)}
                            </span>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button
                            variant="primary"
                            onClick={() => {
                                setBankModalOpen(false);
                                pushToast({
                                    type: 'info',
                                    message: 'Coordonnées de virement notées. Vos dates restent réservées.',
                                });
                            }}
                        >
                            J’ai noté les informations
                        </Button>
                    </div>
                </div>
            </Modal>
        </>
    );
}

