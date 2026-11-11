'use client';

import type { FormEvent } from 'react';
import { useState } from 'react';
import { Button } from '@/components/button';
import { Field, Textarea } from '@/components/form';
import { Modal } from '@/components/modal';
import { useActionFeedback } from '@/components/use-action-feedback';
import {
    approveBookingAction,
    declineBookingAction,
} from '@/lib/actions/host';
import type { FieldErrors } from '@/lib/actions/types';
import type { Booking } from '@/types';

export function BookingResponse({ booking }: { booking: Booking }) {
    const { applyResult } = useActionFeedback();
    const [declining, setDeclining] = useState(false);
    const [approving, setApproving] = useState(false);
    const [submittingDecline, setSubmittingDecline] = useState(false);
    const [reason, setReason] = useState('');
    const [errors, setErrors] = useState<FieldErrors>({});

    async function handleApprove() {
        setApproving(true);
        try {
            const res = await approveBookingAction(booking.reference);
            applyResult(res);
        } finally {
            setApproving(false);
        }
    }

    async function handleDecline(event: FormEvent) {
        event.preventDefault();
        setSubmittingDecline(true);
        setErrors({});
        try {
            const res = await declineBookingAction({
                reference: booking.reference,
                reason,
            });
            applyResult(res, {
                setFieldErrors: setErrors,
                onSuccess: () => {
                    setDeclining(false);
                    setReason('');
                },
            });
        } finally {
            setSubmittingDecline(false);
        }
    }

    return (
        <>
            <Button
                size="sm"
                loading={approving}
                onClick={() => void handleApprove()}
            >
                Accepter
            </Button>
            <Button
                size="sm"
                variant="outline"
                onClick={() => setDeclining(true)}
            >
                Refuser
            </Button>
            <Modal
                open={declining}
                onClose={() => setDeclining(false)}
                title="Refuser la demande"
            >
                <form
                    onSubmit={(event) => void handleDecline(event)}
                    className="flex flex-col gap-4"
                >
                    <Field
                        label={`Message à ${booking.guest.name} (facultatif)`}
                        htmlFor={`decline-${booking.reference}`}
                        error={errors.reason}
                    >
                        <Textarea
                            id={`decline-${booking.reference}`}
                            name="reason"
                            rows={3}
                            maxLength={500}
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                        />
                    </Field>
                    <div className="flex justify-end gap-2">
                        <Button
                            variant="ghost"
                            onClick={() => setDeclining(false)}
                        >
                            Annuler
                        </Button>
                        <Button
                            type="submit"
                            variant="danger"
                            loading={submittingDecline}
                        >
                            Refuser la demande
                        </Button>
                    </div>
                </form>
            </Modal>
        </>
    );
}

