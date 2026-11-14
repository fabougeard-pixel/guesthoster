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
    confirmBankTransferPaymentAction,
    initiateBookingPaymentAction,
    submitTransferProofAction,
} from '@/lib/actions/bookings';
import type { FieldErrors } from '@/lib/actions/types';
import type { PaymentMethodKey } from '@/lib/domain/platform-settings';
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
            if (booking.transfer_receipt_url) {
                return (
                    <Alert tone="info">
                        {isHost
                            ? `Le voyageur a transmis un justificatif d’ordre de virement (${booking.transfer_type === 'instant' ? 'Virement instantané' : 'Virement SEPA'}). Veuillez vérifier votre compte bancaire pour confirmer le séjour.`
                            : `Votre ordre de virement ${booking.transfer_type === 'instant' ? 'instantané' : 'SEPA'} a bien été transmis. Vos dates restent bloquées. Réservation confirmée sous 24h sous réserve de réception du paiement.`}
                    </Alert>
                );
            }
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
                        ? booking.payment_method === 'bank_transfer'
                            ? 'Séjour réglé par virement bancaire et confirmé.'
                            : 'Séjour payé et confirmé.'
                        : booking.payment_method === 'bank_transfer'
                          ? 'Paiement par virement validé, séjour confirmé. Bon voyage !'
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
    paymentFailed,
    enabledMethods,
    bank,
}: {
    booking: Booking;
    justPaid: boolean;
    paymentFailed?: string | null;
    enabledMethods: PaymentMethodKey[];
    bank: {
        holder: string;
        bankName: string;
        iban: string;
        bic: string;
        instructions: string;
    };
}) {
    const { applyResult, pushToast, router } = useActionFeedback();
    const [cancelling, setCancelling] = useState(false);
    const [cancelLoading, setCancelLoading] = useState(false);
    const [payLoading, setPayLoading] = useState(false);
    const [paypalLoading, setPaypalLoading] = useState(false);
    const [bankModalOpen, setBankModalOpen] = useState(false);
    const [bankStep, setBankStep] = useState<'details' | 'upload'>('details');
    const [transferTypeChoice, setTransferTypeChoice] = useState<'instant' | 'sepa'>('instant');
    const [proofFile, setProofFile] = useState<File | null>(null);
    const [proofPreviewUrl, setProofPreviewUrl] = useState<string | null>(null);
    const [bankRefInput, setBankRefInput] = useState('');
    const [uploadLoading, setUploadLoading] = useState(false);
    const [copiedField, setCopiedField] = useState<string | null>(null);
    const [confirmTransferLoading, setConfirmTransferLoading] = useState(false);
    const [paymentFailure, setPaymentFailure] = useState<{
        failedMethod: string;
        reason: string;
        viableMethod: string;
        targetAction: 'bank' | 'stripe';
        actionLabel: string;
    } | null>(() => {
        if (!paymentFailed) {
            return null;
        }
        if (paymentFailed === 'card' || paymentFailed === 'stripe') {
            return {
                failedMethod: 'Carte bancaire (Stripe)',
                reason:
                    'La passerelle de paiement par carte bancaire n’a pu aboutir ou la transaction a été interrompue.',
                viableMethod: 'Virement bancaire (instantané ou SEPA)',
                targetAction: 'bank',
                actionLabel: 'Payer par Virement bancaire',
            };
        }
        if (paymentFailed === 'paypal') {
            return {
                failedMethod: 'PayPal',
                reason:
                    'La passerelle de paiement PayPal est momentanément indisponible pour cette transaction.',
                viableMethod: enabledMethods.includes('card')
                    ? 'Carte bancaire sécurisée (Stripe)'
                    : 'Virement bancaire (instantané ou SEPA)',
                targetAction: enabledMethods.includes('card') ? 'stripe' : 'bank',
                actionLabel: enabledMethods.includes('card')
                    ? 'Payer par Carte bancaire sécurisée'
                    : 'Payer par Virement bancaire',
            };
        }
        return null;
    });
    const [errors, setErrors] = useState<FieldErrors>({});

    const isHost = booking.viewer === 'host';

    function handlePaymentFailureAction() {
        if (!paymentFailure) {
            return;
        }
        const target = paymentFailure.targetAction;
        setPaymentFailure(null);
        if (target === 'bank') {
            setBankStep('details');
            setBankModalOpen(true);
        } else {
            void handlePayStripe();
        }
    }

    function copyToClipboard(text: string, label: string) {
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
            void navigator.clipboard.writeText(text);
            setCopiedField(label);
            setTimeout(() => setCopiedField(null), 2000);
            pushToast({
                type: 'info',
                message: `${label} copié dans le presse-papier !`,
            });
        }
    }

    function handleFileChange(file: File | null) {
        if (proofPreviewUrl) {
            URL.revokeObjectURL(proofPreviewUrl);
        }
        setProofFile(file);
        if (file && file.type.startsWith('image/')) {
            setProofPreviewUrl(URL.createObjectURL(file));
        } else {
            setProofPreviewUrl(null);
        }
    }

    async function handleSubmitProof(e: FormEvent) {
        e.preventDefault();
        if (!proofFile) {
            pushToast({
                type: 'error',
                message: 'Veuillez joindre l’ordre ou justificatif de virement.',
            });
            return;
        }

        setUploadLoading(true);
        try {
            const fd = new FormData();
            fd.append('reference', booking.reference);
            fd.append('transferType', transferTypeChoice);
            if (bankRefInput.trim()) {
                fd.append('bankReference', bankRefInput.trim());
            }
            fd.append('file', proofFile);

            const res = await submitTransferProofAction(fd);
            if (res.ok) {
                pushToast(
                    res.toast ?? {
                        type: 'success',
                        message: 'Ordre de virement transmis avec succès !',
                    },
                );
                setBankModalOpen(false);
                setBankStep('details');
                setProofFile(null);
                setProofPreviewUrl(null);
                setBankRefInput('');
                router.refresh();
            } else {
                pushToast({
                    type: 'error',
                    message: res.error || 'Erreur lors de la transmission.',
                });
            }
        } finally {
            setUploadLoading(false);
        }
    }

    async function handleConfirmBankTransfer() {
        setConfirmTransferLoading(true);
        try {
            const res = await confirmBankTransferPaymentAction(booking.reference);
            if (res.ok) {
                pushToast(
                    res.toast ?? {
                        type: 'success',
                        message: 'Paiement par virement validé. Séjour confirmé.',
                    },
                );
                router.refresh();
            } else {
                pushToast({
                    type: 'error',
                    message: res.error || 'Erreur lors de la validation.',
                });
            }
        } finally {
            setConfirmTransferLoading(false);
        }
    }

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
                    'La passerelle de paiement par carte bancaire est temporairement indisponible pour cette transaction.',
                viableMethod: 'Virement bancaire (instantané ou SEPA)',
                targetAction: 'bank',
                actionLabel: 'Payer par Virement bancaire',
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
                viableMethod: enabledMethods.includes('card')
                    ? 'Carte bancaire sécurisée (Stripe)'
                    : 'Virement bancaire (instantané ou SEPA)',
                targetAction: enabledMethods.includes('card') ? 'stripe' : 'bank',
                actionLabel: enabledMethods.includes('card')
                    ? 'Payer par Carte bancaire sécurisée'
                    : 'Payer par Virement bancaire',
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

                                {enabledMethods.length === 0 && (
                                    <p className="text-xs text-amber-700">
                                        Aucun moyen de paiement n’est disponible actuellement. Contactez-nous.
                                    </p>
                                )}

                                {/* Option 1 : Stripe CB */}
                                {enabledMethods.includes('card') && (
                                <Button
                                    type="button"
                                    size="lg"
                                    loading={payLoading}
                                    onClick={() => void handlePayStripe()}
                                    className="w-full bg-primary-600 hover:bg-primary-700"
                                >
                                    Payer par Carte Bancaire ({formatPrice(booking.total_price)})
                                </Button>
                                )}

                                {/* Option 2 : PayPal */}
                                {enabledMethods.includes('paypal') && (
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
                                )}

                                {/* Option 3 : Virement bancaire */}
                                {enabledMethods.includes('bank_transfer') && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="md"
                                    onClick={() => {
                                        setBankStep('details');
                                        setBankModalOpen(true);
                                    }}
                                    className="w-full"
                                >
                                    Payer par Virement bancaire SEPA
                                </Button>
                                )}

                                <p className="text-center text-[11px] text-zinc-500 dark:text-zinc-400">
                                    Transactions cryptées et sécurisées. Vos dates sont réservées.
                                </p>
                            </div>
                        )}

                        {booking.transfer_receipt_url && (
                            <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4 text-xs dark:border-blue-900/50 dark:bg-blue-950/25">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="font-bold text-blue-950 dark:text-blue-100">
                                        Ordre de virement transmis
                                    </span>
                                    <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-semibold text-blue-800 dark:bg-blue-900/60 dark:text-blue-300">
                                        {booking.transfer_type === 'instant'
                                            ? '⚡ Virement instantané'
                                            : '⏱️ Virement SEPA'}
                                    </span>
                                </div>
                                <p className="mt-1.5 text-blue-800 dark:text-blue-300">
                                    {booking.status === 'confirmed'
                                        ? 'Paiement validé avec succès. Séjour confirmé.'
                                        : 'Vérification bancaire en cours sous 24h. Vos dates restent bloquées.'}
                                </p>
                                <div className="mt-3 flex flex-col gap-2">
                                    <a
                                        href={booking.transfer_receipt_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-blue-300 bg-white px-3 py-2 font-semibold text-blue-900 shadow-xs transition hover:bg-blue-50 dark:border-blue-800 dark:bg-zinc-900 dark:text-blue-200"
                                    >
                                        <svg
                                            className="size-4 text-blue-700 dark:text-blue-400"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth="2"
                                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                            />
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth="2"
                                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                            />
                                        </svg>
                                        Consulter l’ordre de virement
                                    </a>

                                    {isHost &&
                                        booking.status === 'awaiting_payment' && (
                                            <Button
                                                size="sm"
                                                loading={confirmTransferLoading}
                                                onClick={() =>
                                                    void handleConfirmBankTransfer()
                                                }
                                                className="w-full bg-emerald-600 hover:bg-emerald-700"
                                            >
                                                Valider la réception des fonds
                                            </Button>
                                        )}
                                </div>
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

            {/* Modale d'échec de paiement avec recommandation de virement bancaire */}
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

                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
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
                                onClick={handlePaymentFailureAction}
                                className="bg-[#c2410c] hover:bg-[#9a3412] text-white font-semibold"
                            >
                                {paymentFailure.actionLabel}
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Modale Règlement par Virement bancaire & Envoi de justificatif */}
            <Modal
                open={bankModalOpen}
                onClose={() => {
                    setBankModalOpen(false);
                    setBankStep('details');
                }}
                title={
                    bankStep === 'details'
                        ? 'Règlement par Virement bancaire SEPA'
                        : 'Joindre l’ordre de virement bancaire'
                }
            >
                {bankStep === 'details' ? (
                    <div className="flex flex-col gap-4 text-sm text-zinc-700 dark:text-zinc-300">
                        <p>
                            {bank.instructions ||
                                'Veuillez effectuer le virement sur le compte ci-dessous en indiquant la référence.'}
                        </p>

                        <div className="flex flex-col gap-2.5 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
                            <div className="flex justify-between border-b border-zinc-200 pb-2 dark:border-zinc-800">
                                <span className="text-xs text-zinc-500">Bénéficiaire</span>
                                <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                                    {bank.holder || 'GUEST HOSTER'}
                                </span>
                            </div>
                            <div className="flex justify-between border-b border-zinc-200 pb-2 dark:border-zinc-800">
                                <span className="text-xs text-zinc-500">Banque</span>
                                <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                                    {bank.bankName || 'KANTONAL BANQUE'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between border-b border-zinc-200 pb-2 dark:border-zinc-800">
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-xs text-zinc-500">IBAN</span>
                                    <span className="font-mono font-bold tracking-wider text-[#c2410c] select-all dark:text-orange-400">
                                        {bank.iban}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => copyToClipboard(bank.iban, 'IBAN')}
                                    className="rounded-lg border border-zinc-300 bg-white px-2 py-1 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                                >
                                    {copiedField === 'IBAN' ? 'Copié !' : 'Copier'}
                                </button>
                            </div>
                            <div className="flex items-center justify-between border-b border-zinc-200 pb-2 dark:border-zinc-800">
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-xs text-zinc-500">BIC / SWIFT</span>
                                    <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                                        {bank.bic}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => copyToClipboard(bank.bic, 'BIC')}
                                    className="rounded-lg border border-zinc-300 bg-white px-2 py-1 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                                >
                                    {copiedField === 'BIC' ? 'Copié !' : 'Copier'}
                                </button>
                            </div>
                            <div className="flex items-center justify-between border-b border-zinc-200 pb-2 dark:border-zinc-800">
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-xs font-semibold uppercase text-amber-700 dark:text-amber-400">
                                        Libellé / Référence obligatoire
                                    </span>
                                    <span className="font-mono text-base font-bold text-zinc-900 select-all dark:text-zinc-100">
                                        {booking.reference}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => copyToClipboard(booking.reference, 'Référence')}
                                    className="rounded-lg border border-zinc-300 bg-white px-2 py-1 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                                >
                                    {copiedField === 'Référence' ? 'Copié !' : 'Copier'}
                                </button>
                            </div>
                            <div className="flex justify-between pt-1">
                                <span className="text-xs text-zinc-500">Montant total</span>
                                <span className="text-base font-bold text-emerald-700 dark:text-emerald-400">
                                    {formatPrice(booking.total_price)}
                                </span>
                            </div>
                        </div>

                        {/* Précision du type de virement requis */}
                        <div className="grid gap-2.5 sm:grid-cols-2">
                            <div className="flex flex-col gap-1 rounded-2xl border border-amber-200 bg-amber-50/80 p-3.5 text-xs dark:border-amber-900/40 dark:bg-amber-950/20">
                                <div className="flex items-center gap-1.5 font-bold text-amber-950 dark:text-amber-100">
                                    <span>⚡</span>
                                    <span>Virement instantané</span>
                                </div>
                                <p className="font-semibold text-amber-800 dark:text-amber-300">
                                    (Confirmation de réservation immédiate)
                                </p>
                                <p className="text-[11px] text-amber-700 dark:text-amber-400">
                                    Exécuté en temps réel par votre banque : votre réservation est validée dès transmission de votre ordre de virement.
                                </p>
                            </div>

                            <div className="flex flex-col gap-1 rounded-2xl border border-blue-200 bg-blue-50/80 p-3.5 text-xs dark:border-blue-900/40 dark:bg-blue-950/20">
                                <div className="flex items-center gap-1.5 font-bold text-blue-950 dark:text-blue-100">
                                    <span>⏱️</span>
                                    <span>Virement SEPA</span>
                                </div>
                                <p className="font-semibold text-blue-800 dark:text-blue-300">
                                    (Réservation confirmée sous 24h sous réserve de réception du paiement)
                                </p>
                                <p className="text-[11px] text-blue-700 dark:text-blue-400">
                                    Délai interbancaire classique : vos dates restent bloquées le temps de la réception des fonds sur notre compte.
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end pt-2">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setBankModalOpen(false);
                                    pushToast({
                                        type: 'info',
                                        message:
                                            'Coordonnées de virement notées. Vos dates restent réservées.',
                                    });
                                }}
                            >
                                J’ai noté les informations
                            </Button>
                            <Button
                                onClick={() => setBankStep('upload')}
                                className="bg-[#c2410c] hover:bg-[#9a3412] text-white font-bold inline-flex items-center gap-2"
                            >
                                <svg
                                    className="size-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M5 13l4 4L19 7"
                                    />
                                </svg>
                                <span>Paiement Effectué</span>
                            </Button>
                        </div>
                    </div>
                ) : (
                    /* Étape 2 : Transmission de l'ordre de virement */
                    <form
                        onSubmit={(e) => void handleSubmitProof(e)}
                        className="flex flex-col gap-4 text-sm text-zinc-700 dark:text-zinc-300"
                    >
                        <p className="text-xs text-zinc-600 dark:text-zinc-400">
                            Afin de valider votre réservation, veuillez préciser le type de virement effectué et joindre votre ordre de virement (attestation, reçu bancaire ou capture d’écran).
                        </p>

                        {/* Choix du type de virement */}
                        <div>
                            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                                Type de virement exécuté <span className="text-red-500">*</span>
                            </label>
                            <div className="grid gap-2.5 sm:grid-cols-2">
                                <label
                                    className={`relative flex cursor-pointer flex-col gap-1 rounded-2xl border p-3.5 transition ${
                                        transferTypeChoice === 'instant'
                                            ? 'border-[#c2410c] bg-orange-50/50 ring-2 ring-orange-400/20 dark:border-orange-500 dark:bg-orange-950/20'
                                            : 'border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5 font-bold text-zinc-900 dark:text-zinc-100">
                                            <span>⚡</span>
                                            <span>Virement instantané</span>
                                        </div>
                                        <input
                                            type="radio"
                                            name="transferType"
                                            value="instant"
                                            checked={transferTypeChoice === 'instant'}
                                            onChange={() => setTransferTypeChoice('instant')}
                                            className="accent-[#c2410c]"
                                        />
                                    </div>
                                    <p className="text-[11px] font-semibold text-orange-800 dark:text-orange-300">
                                        Confirmation de réservation immédiate
                                    </p>
                                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                                        Virement reçu en temps réel. Validation instantanée dès transmission du reçu.
                                    </p>
                                </label>

                                <label
                                    className={`relative flex cursor-pointer flex-col gap-1 rounded-2xl border p-3.5 transition ${
                                        transferTypeChoice === 'sepa'
                                            ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-400/20 dark:border-blue-500 dark:bg-blue-950/20'
                                            : 'border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5 font-bold text-zinc-900 dark:text-zinc-100">
                                            <span>⏱️</span>
                                            <span>Virement SEPA</span>
                                        </div>
                                        <input
                                            type="radio"
                                            name="transferType"
                                            value="sepa"
                                            checked={transferTypeChoice === 'sepa'}
                                            onChange={() => setTransferTypeChoice('sepa')}
                                            className="accent-blue-600"
                                        />
                                    </div>
                                    <p className="text-[11px] font-semibold text-blue-800 dark:text-blue-300">
                                        Réservation confirmée sous 24h
                                    </p>
                                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                                        Sous réserve de réception du paiement. Vos dates restent bloquées.
                                    </p>
                                </label>
                            </div>
                        </div>

                        {/* Référence bancaire facultative */}
                        <div>
                            <label
                                htmlFor="bankRefInput"
                                className="mb-1 block text-xs font-semibold text-zinc-700 dark:text-zinc-300"
                            >
                                Référence ou N° d’opération bancaire (facultatif)
                            </label>
                            <input
                                id="bankRefInput"
                                type="text"
                                value={bankRefInput}
                                onChange={(e) => setBankRefInput(e.target.value)}
                                placeholder="ex. VIR-8392019 ou ID transaction de votre banque"
                                className="w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-xs text-zinc-900 outline-none transition focus:border-[#c2410c] focus:ring-2 focus:ring-orange-400/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                            />
                        </div>

                        {/* Téléversement de l'ordre de virement */}
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                                Joindre l’ordre du virement (justificatif obligatoire) <span className="text-red-500">*</span>
                            </label>

                            <div className="relative">
                                <input
                                    type="file"
                                    id="transferProofFileInput"
                                    accept=".pdf,image/jpeg,image/png,image/webp"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0] ?? null;
                                        handleFileChange(file);
                                    }}
                                    className="hidden"
                                />

                                {!proofFile ? (
                                    <label
                                        htmlFor="transferProofFileInput"
                                        className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-zinc-300 bg-zinc-50/70 p-6 text-center transition hover:border-[#c2410c] hover:bg-orange-50/30 dark:border-zinc-700 dark:bg-zinc-900/60 dark:hover:border-orange-500"
                                    >
                                        <div className="flex size-11 items-center justify-center rounded-full bg-orange-100 text-[#c2410c] dark:bg-orange-950/60 dark:text-orange-400">
                                            <svg
                                                className="size-6"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth="2"
                                                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                                                />
                                            </svg>
                                        </div>
                                        <div className="text-xs">
                                            <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                                                Cliquez pour téléverser votre ordre de virement
                                            </p>
                                            <p className="mt-0.5 text-zinc-500 dark:text-zinc-400">
                                                PDF, JPG, PNG ou WebP (max. 10 Mo)
                                            </p>
                                        </div>
                                    </label>
                                ) : (
                                    <div className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-3.5 dark:border-zinc-800 dark:bg-zinc-900">
                                        <div className="flex items-center gap-3 min-w-0">
                                            {proofPreviewUrl ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img
                                                    src={proofPreviewUrl}
                                                    alt="Aperçu"
                                                    className="size-12 rounded-xl object-cover shrink-0 border border-zinc-200 dark:border-zinc-700"
                                                />
                                            ) : (
                                                <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-[#c2410c] dark:bg-orange-950/60 dark:text-orange-400">
                                                    <svg
                                                        className="size-6"
                                                        fill="none"
                                                        viewBox="0 0 24 24"
                                                        stroke="currentColor"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth="2"
                                                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                                        />
                                                    </svg>
                                                </div>
                                            )}
                                            <div className="min-w-0 text-xs">
                                                <p className="truncate font-semibold text-zinc-900 dark:text-zinc-100">
                                                    {proofFile.name}
                                                </p>
                                                <p className="text-zinc-500 dark:text-zinc-400">
                                                    {(proofFile.size / (1024 * 1024)).toFixed(2)} Mo
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleFileChange(null)}
                                            className="shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                                        >
                                            Changer
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setBankStep('details')}
                            >
                                ← Coordonnées bancaires
                            </Button>
                            <Button
                                type="submit"
                                loading={uploadLoading}
                                className="bg-[#c2410c] hover:bg-[#9a3412] text-white font-bold"
                            >
                                Valider et transmettre mon ordre de virement
                            </Button>
                        </div>
                    </form>
                )}
            </Modal>
        </>
    );
}

