'use client';

import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { Button } from '@/components/button';
import { Field, Textarea } from '@/components/form';
import { Modal } from '@/components/modal';
import { useActionFeedback } from '@/components/use-action-feedback';
import {
    confirmBankTransferPaymentAction,
    rejectBankTransferPaymentAction,
} from '@/lib/actions/bookings';
import type { FieldErrors } from '@/lib/actions/types';

type Props = {
    booking: {
        reference: string;
        payment_method?: string | null;
        transfer_type?: 'instant' | 'sepa' | null;
        transfer_receipt_url?: string | null;
        transfer_bank_reference?: string | null;
        transfer_declared_at?: string | null;
        status: string;
        guest?: { name?: string };
    };
    compact?: boolean;
    onValidated?: () => void;
};

export function BookingTransferActions({
    booking,
    compact = false,
    onValidated,
}: Props) {
    const router = useRouter();
    const { applyResult, pushToast } = useActionFeedback();
    const [confirming, setConfirming] = useState(false);
    const [rejecting, setRejecting] = useState(false);
    const [submittingReject, setSubmittingReject] = useState(false);
    const [reason, setReason] = useState('');
    const [errors, setErrors] = useState<FieldErrors>({});

    async function handleConfirm() {
        setConfirming(true);
        try {
            const res = await confirmBankTransferPaymentAction(booking.reference);
            applyResult(res, {
                onSuccess: () => {
                    onValidated?.();
                    router.refresh();
                },
            });
        } catch {
            pushToast({
                type: 'error',
                message: 'Erreur lors de la validation du virement.',
            });
        } finally {
            setConfirming(false);
        }
    }

    async function handleReject(e: FormEvent) {
        e.preventDefault();
        setSubmittingReject(true);
        setErrors({});
        try {
            const res = await rejectBankTransferPaymentAction({
                reference: booking.reference,
                reason,
            });
            applyResult(res, {
                setFieldErrors: setErrors,
                onSuccess: () => {
                    setRejecting(false);
                    setReason('');
                    router.refresh();
                },
            });
        } catch {
            pushToast({
                type: 'error',
                message: 'Erreur lors du rejet du virement.',
            });
        } finally {
            setSubmittingReject(false);
        }
    }

    const transferLabel =
        booking.transfer_type === 'instant'
            ? 'Virement instantané'
            : 'Virement SEPA';

    if (compact) {
        return (
            <div className="flex flex-wrap items-center gap-1.5">
                {booking.transfer_receipt_url && (
                    <a
                        href={booking.transfer_receipt_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Consulter l'ordre de virement transmis par le voyageur"
                        className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 shadow-2xs transition hover:bg-blue-100 hover:text-blue-900 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300"
                    >
                        <svg
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            className="size-3.5"
                            aria-hidden="true"
                        >
                            <path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
                            <path
                                fillRule="evenodd"
                                d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z"
                                clipRule="evenodd"
                            />
                        </svg>
                        <span>Justificatif</span>
                    </a>
                )}

                <Button
                    size="sm"
                    loading={confirming}
                    onClick={() => void handleConfirm()}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-2.5 py-1 h-auto"
                >
                    <span className="mr-1">✓</span> Valider fonds
                </Button>

                <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setRejecting(true)}
                    className="text-xs px-2 py-1 h-auto text-zinc-600 hover:text-red-700 hover:border-red-300"
                >
                    Rejeter
                </Button>

                <Modal
                    open={rejecting}
                    onClose={() => setRejecting(false)}
                    title="Rejeter le virement et libérer les dates"
                >
                    <form
                        onSubmit={(event) => void handleReject(event)}
                        className="flex flex-col gap-4"
                    >
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                            Indiquez le motif du rejet pour la réservation{' '}
                            <strong>{booking.reference}</strong>. Le voyageur sera
                            notifié et les dates du logement seront libérées.
                        </p>

                        <Field
                            label="Motif du rejet (visible par le voyageur)"
                            htmlFor={`reject-${booking.reference}`}
                            error={errors.reason}
                        >
                            <Textarea
                                id={`reject-${booking.reference}`}
                                name="reason"
                                rows={3}
                                maxLength={500}
                                placeholder="Ex : Les fonds ne sont pas parvenus sur notre compte après 48h / justificatif non lisible..."
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                            />
                        </Field>

                        <div className="flex justify-end gap-2">
                            <Button
                                variant="ghost"
                                onClick={() => setRejecting(false)}
                            >
                                Retour
                            </Button>
                            <Button
                                type="submit"
                                variant="danger"
                                loading={submittingReject}
                            >
                                Confirmer le rejet
                            </Button>
                        </div>
                    </form>
                </Modal>
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 dark:border-blue-900/60 dark:bg-blue-950/20">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow-xs">
                        💳
                    </span>
                    <div>
                        <p className="text-xs font-bold text-blue-950 dark:text-blue-100 uppercase tracking-wider">
                            Règlement par {transferLabel}
                        </p>
                        <p className="text-xs text-blue-800/80 dark:text-blue-300">
                            {booking.transfer_bank_reference
                                ? `Référence bancaire indiquée : ${booking.transfer_bank_reference}`
                                : 'Le voyageur a déclaré avoir effectué le virement.'}
                        </p>
                    </div>
                </div>

                {booking.transfer_receipt_url && (
                    <a
                        href={booking.transfer_receipt_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-xl border border-blue-300 bg-white px-3 py-1.5 text-xs font-bold text-blue-900 shadow-2xs transition hover:bg-blue-50 dark:border-blue-800 dark:bg-zinc-900 dark:text-blue-200"
                    >
                        <svg
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            className="size-4 text-blue-600"
                            aria-hidden="true"
                        >
                            <path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
                            <path
                                fillRule="evenodd"
                                d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z"
                                clipRule="evenodd"
                            />
                        </svg>
                        <span>Ouvrir l’ordre de virement</span>
                    </a>
                )}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 pt-2 border-t border-blue-200/60 dark:border-blue-900/40">
                <Button
                    size="sm"
                    loading={confirming}
                    onClick={() => void handleConfirm()}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                >
                    <span className="mr-1.5">✓</span> Valider la réception des fonds
                </Button>

                <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setRejecting(true)}
                    className="text-zinc-600 hover:text-red-700 hover:border-red-300"
                >
                    Rejeter / Fonds non reçus
                </Button>
            </div>

            <Modal
                open={rejecting}
                onClose={() => setRejecting(false)}
                title="Rejeter le virement et libérer les dates"
            >
                <form
                    onSubmit={(event) => void handleReject(event)}
                    className="flex flex-col gap-4"
                >
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        Indiquez le motif du rejet pour la réservation{' '}
                        <strong>{booking.reference}</strong>. Le voyageur sera notifié
                        par message et les dates bloquées du logement seront
                        libérées.
                    </p>

                    <Field
                        label="Motif du rejet (visible par le voyageur)"
                        htmlFor={`reject-detail-${booking.reference}`}
                        error={errors.reason}
                    >
                        <Textarea
                            id={`reject-detail-${booking.reference}`}
                            name="reason"
                            rows={3}
                            maxLength={500}
                            placeholder="Ex : Virement non reçu sur le compte bancaire après 48h / justificatif non lisible..."
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                        />
                    </Field>

                    <div className="flex justify-end gap-2">
                        <Button
                            variant="ghost"
                            onClick={() => setRejecting(false)}
                        >
                            Retour
                        </Button>
                        <Button
                            type="submit"
                            variant="danger"
                            loading={submittingReject}
                        >
                            Confirmer le rejet
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
