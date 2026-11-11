import { Form, router } from '@inertiajs/react';
import { useState } from 'react';
import { Button } from '@/components/button';
import { Field, Textarea } from '@/components/form';
import { Modal } from '@/components/modal';
import { approve, decline } from '@/routes/host/bookings';
import type { Booking } from '@/types';

/**
 * Boutons Accepter / Refuser d'une demande, avec message facultatif au refus.
 */
export function BookingResponse({ booking }: { booking: Booking }) {
    const [declining, setDeclining] = useState(false);

    return (
        <>
            <Button
                size="sm"
                onClick={() =>
                    router.post(
                        approve.url(booking.reference),
                        {},
                        { preserveScroll: true },
                    )
                }
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
                <Form
                    {...decline.form(booking.reference)}
                    options={{ preserveScroll: true }}
                    onSuccess={() => setDeclining(false)}
                    className="flex flex-col gap-4"
                >
                    {({ errors, processing }) => (
                        <>
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
                                    loading={processing}
                                >
                                    Refuser la demande
                                </Button>
                            </div>
                        </>
                    )}
                </Form>
            </Modal>
        </>
    );
}
