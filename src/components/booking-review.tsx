'use client';

import type { FormEvent } from 'react';
import { useState } from 'react';
import { Button } from '@/components/button';
import { Field, InputError, Textarea } from '@/components/form';
import { ReviewCard } from '@/components/review-card';
import { StarInput } from '@/components/star-rating';
import { useActionFeedback } from '@/components/use-action-feedback';
import {
    publishReviewAction,
    replyToReviewAction,
} from '@/lib/actions/bookings';
import type { FieldErrors } from '@/lib/actions/types';
import { formatDateTime } from '@/lib/format';
import type { Booking } from '@/types';

export function BookingReview({ booking }: { booking: Booking }) {
    const { applyResult } = useActionFeedback();
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<FieldErrors>({});

    const review = booking.review ?? null;

    async function handlePublishReview(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setLoading(true);
        setErrors({});
        const fd = new FormData(event.currentTarget);
        try {
            const res = await publishReviewAction({
                reference: booking.reference,
                rating: Number(fd.get('rating') ?? 0),
                comment: String(fd.get('comment') ?? ''),
            });
            applyResult(res, { setFieldErrors: setErrors });
        } finally {
            setLoading(false);
        }
    }

    async function handleReply(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setLoading(true);
        setErrors({});
        const fd = new FormData(event.currentTarget);
        try {
            const res = await replyToReviewAction({
                reference: booking.reference,
                host_reply: String(fd.get('host_reply') ?? ''),
            });
            applyResult(res, { setFieldErrors: setErrors });
        } finally {
            setLoading(false);
        }
    }

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
                <form
                    onSubmit={(event) => void handlePublishReview(event)}
                    className="flex flex-col gap-4"
                >
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
                        loading={loading}
                        className="self-start"
                    >
                        Publier mon avis
                    </Button>
                </form>
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
                <form
                    onSubmit={(event) => void handleReply(event)}
                    className="flex flex-col gap-3"
                >
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
                        loading={loading}
                        className="self-start"
                    >
                        Publier la réponse
                    </Button>
                </form>
            )}
        </section>
    );
}

