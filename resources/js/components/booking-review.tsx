import { Form } from '@inertiajs/react';
import { Button } from '@/components/button';
import { Field, InputError, Textarea } from '@/components/form';
import { ReviewCard } from '@/components/review-card';
import { StarInput } from '@/components/star-rating';
import { formatDateTime } from '@/lib/format';
import { reply, store } from '@/routes/reviews';
import type { Booking } from '@/types';

/**
 * Avis du séjour sur la page de réservation : formulaire du voyageur, puis avis publié et réponse de l’hôte.
 */
export function BookingReview({ booking }: { booking: Booking }) {
    const review = booking.review ?? null;

    if (booking.can.review) {
        return (
            <section className="flex flex-col gap-4 rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800">
                <div>
                    <h2 className="text-lg font-semibold">
                        Comment s’est passé votre séjour ?
                    </h2>
                    {booking.review_deadline && (
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                            Votre avis sera publié sur la page du logement. Vous
                            avez jusqu’au{' '}
                            {formatDateTime(booking.review_deadline)} pour le
                            donner.
                        </p>
                    )}
                </div>
                <Form
                    {...store.form(booking.reference)}
                    options={{ preserveScroll: true }}
                    className="flex flex-col gap-4"
                >
                    {({ errors, processing }) => (
                        <>
                            <div>
                                <StarInput name="rating" />
                                <InputError message={errors.rating} />
                            </div>
                            <Field
                                label="Votre avis"
                                htmlFor="comment"
                                error={errors.comment}
                                hint="Le logement, l’accueil, le quartier… 20 caractères minimum."
                            >
                                <Textarea
                                    id="comment"
                                    name="comment"
                                    rows={5}
                                    minLength={20}
                                    maxLength={2000}
                                    required
                                />
                            </Field>
                            <Button
                                type="submit"
                                loading={processing}
                                className="self-start"
                            >
                                Publier mon avis
                            </Button>
                        </>
                    )}
                </Form>
            </section>
        );
    }

    if (!review) {
        return null;
    }

    return (
        <section className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold">Avis du voyageur</h2>
            <ReviewCard review={review} hostName={booking.host.name} />
            {booking.can.reply_review && (
                <Form
                    {...reply.form(booking.reference)}
                    options={{ preserveScroll: true }}
                    className="flex flex-col gap-3"
                >
                    {({ errors, processing }) => (
                        <>
                            <Field
                                label="Répondre publiquement"
                                htmlFor="host_reply"
                                error={errors.host_reply}
                                hint="Votre réponse est visible par tous sous l’avis et ne peut être publiée qu’une fois."
                            >
                                <Textarea
                                    id="host_reply"
                                    name="host_reply"
                                    rows={3}
                                    minLength={5}
                                    maxLength={1000}
                                    required
                                />
                            </Field>
                            <Button
                                type="submit"
                                variant="secondary"
                                size="sm"
                                loading={processing}
                                className="self-start"
                            >
                                Publier la réponse
                            </Button>
                        </>
                    )}
                </Form>
            )}
        </section>
    );
}
