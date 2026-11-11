'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getFreshSessionUser } from '@/lib/auth/session';
import {
    cancelExistingBooking,
    createBookingForProperty,
    publishBookingReview,
    replyToBookingReview,
} from '@/lib/domain/bookings';
import { DomainError } from '@/lib/domain/properties';
import { env } from '@/lib/env';
import { formatLongDateFr, isValidIsoDate, todayIso } from '@/lib/format';
import { notifyNewMessage } from '@/lib/notifications/service';
import { prisma } from '@/lib/prisma';
import {
    createCheckoutSession,
    isStripeConfigured,
} from '@/lib/services/stripe';
import { type ActionResult, zodToFieldErrors } from './types';

function handleDomainError(err: unknown): ActionResult<never> {
    if (err instanceof DomainError) {
        return { ok: false, error: err.message };
    }
    throw err;
}

const createBookingSchema = z
    .object({
        propertySlug: z.string().min(1),
        check_in: z
            .string()
            .refine(isValidIsoDate, 'Date d’arrivée invalide.'),
        check_out: z
            .string()
            .refine(isValidIsoDate, 'Date de départ invalide.'),
        guests: z.coerce
            .number()
            .int()
            .min(1, 'Au moins 1 voyageur.')
            .max(30),
        special_requests: z
            .string()
            .max(1000, 'Les précisions ne doivent pas dépasser 1000 caractères.')
            .optional()
            .nullable(),
    })
    .refine((d) => d.check_in >= todayIso(), {
        path: ['check_in'],
        message: 'La date d’arrivée doit être aujourd’hui ou ultérieure.',
    })
    .refine((d) => d.check_out > d.check_in, {
        path: ['check_out'],
        message: 'La date de départ doit être postérieure à la date d’arrivée.',
    });

export async function createBookingAction(input: {
    propertySlug: string;
    check_in: string;
    check_out: string;
    guests: number;
    special_requests?: string | null;
}): Promise<ActionResult> {
    const user = await getFreshSessionUser();
    if (!user) {
        return { ok: false, error: 'Authentification requise.' };
    }
    if (!user.emailVerifiedAt) {
        return {
            ok: false,
            error: 'Veuillez vérifier votre adresse e-mail avant de réserver.',
        };
    }

    const parsed = createBookingSchema.safeParse(input);
    if (!parsed.success) {
        return { ok: false, fieldErrors: zodToFieldErrors(parsed.error) };
    }

    const property = await prisma.property.findUnique({
        where: { slug: parsed.data.propertySlug },
        select: { id: true, slug: true },
    });

    if (!property) {
        return { ok: false, error: 'Logement introuvable.' };
    }

    try {
        const result = await createBookingForProperty({
            propertyId: property.id,
            guestId: user.id,
            checkInIso: parsed.data.check_in,
            checkOutIso: parsed.data.check_out,
            guests: parsed.data.guests,
            specialRequests: parsed.data.special_requests,
        });

        revalidatePath('/voyages');
        revalidatePath(`/logements/${property.slug}`);

        return {
            ok: true,
            redirectTo: `/reservations/${result.reference}`,
            toast: {
                type: 'success',
                message:
                    result.mode === 'instant'
                        ? 'Dates bloquées ! Réglez maintenant votre réservation.'
                        : 'Demande envoyée à l’hôte.',
            },
        };
    } catch (error) {
        return handleDomainError(error);
    }
}

export async function cancelBookingAction(input: {
    reference: string;
    reason?: string | null;
}): Promise<ActionResult> {
    const user = await getFreshSessionUser();
    if (!user || !user.emailVerifiedAt) {
        return { ok: false, error: 'Authentification et vérification requises.' };
    }

    const reason = input.reason?.trim() || null;
    if (reason && reason.length > 500) {
        return {
            ok: false,
            fieldErrors: {
                reason: 'Le motif ne doit pas dépasser 500 caractères.',
            },
        };
    }

    try {
        await cancelExistingBooking(input.reference, user, reason);
        revalidatePath(`/reservations/${input.reference}`);
        revalidatePath('/voyages');
        revalidatePath('/hote/reservations');

        return {
            ok: true,
            toast: { type: 'info', message: 'La réservation a été annulée.' },
        };
    } catch (error) {
        if (error instanceof DomainError) {
            return { ok: false, error: error.message };
        }
        return {
            ok: false,
            error:
                error instanceof Error
                    ? error.message
                    : 'Impossible d’annuler cette réservation.',
        };
    }
}

export async function initiateBookingPaymentAction(
    reference: string,
): Promise<ActionResult<{ checkoutUrl: string }>> {
    const user = await getFreshSessionUser();
    if (!user || !user.emailVerifiedAt) {
        return { ok: false, error: 'Authentification requise.' };
    }

    if (!isStripeConfigured()) {
        return {
            ok: false,
            error: 'Le paiement en ligne Stripe n’est pas configuré sur ce serveur.',
        };
    }

    const booking = await prisma.booking.findUnique({
        where: { reference },
        include: {
            property: { select: { title: true } },
        },
    });

    if (!booking || booking.userId !== user.id) {
        return { ok: false, error: 'Action non autorisée.' };
    }

    if (
        booking.status !== 'awaiting_payment' ||
        (booking.expiresAt !== null && booking.expiresAt.getTime() <= Date.now())
    ) {
        return {
            ok: false,
            error: 'Cette réservation n’est plus en attente de paiement.',
        };
    }

    const session = await createCheckoutSession({
        booking: {
            reference: booking.reference,
            totalPrice: booking.totalPrice,
            nights: booking.nights,
            checkIn: formatLongDateFr(booking.checkIn.toISOString().slice(0, 10)),
            checkOut: formatLongDateFr(
                booking.checkOut.toISOString().slice(0, 10),
            ),
            expiresAt: booking.expiresAt,
            guestEmail: user.email,
            propertyTitle: booking.property.title,
        },
        successUrl: `${env.appUrl}/reservations/${booking.reference}/paiement/retour?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${env.appUrl}/reservations/${booking.reference}`,
    });

    await prisma.booking.update({
        where: { id: booking.id },
        data: { stripeCheckoutSessionId: session.id },
    });

    return { ok: true, data: { checkoutUrl: session.url } };
}

const reviewSchema = z.object({
    reference: z.string().min(1),
    rating: z.coerce
        .number()
        .int()
        .min(1, 'Choisissez une note de 1 à 5.')
        .max(5),
    comment: z
        .string()
        .trim()
        .min(20, 'Votre commentaire doit contenir au moins 20 caractères.')
        .max(2000, 'Votre commentaire ne doit pas dépasser 2000 caractères.'),
});

export async function publishReviewAction(input: {
    reference: string;
    rating: number;
    comment: string;
}): Promise<ActionResult> {
    const user = await getFreshSessionUser();
    if (!user || !user.emailVerifiedAt) {
        return { ok: false, error: 'Authentification requise.' };
    }

    const parsed = reviewSchema.safeParse(input);
    if (!parsed.success) {
        return { ok: false, fieldErrors: zodToFieldErrors(parsed.error) };
    }

    try {
        await publishBookingReview({
            bookingReference: parsed.data.reference,
            guestId: user.id,
            rating: parsed.data.rating,
            comment: parsed.data.comment,
        });
        revalidatePath(`/reservations/${parsed.data.reference}`);
        return {
            ok: true,
            toast: { type: 'success', message: 'Merci pour votre avis !' },
        };
    } catch (error) {
        return handleDomainError(error);
    }
}

const replySchema = z.object({
    reference: z.string().min(1),
    host_reply: z
        .string()
        .trim()
        .min(5, 'Votre réponse doit contenir au moins 5 caractères.')
        .max(1000, 'Votre réponse ne doit pas dépasser 1000 caractères.'),
});

export async function replyToReviewAction(input: {
    reference: string;
    host_reply: string;
}): Promise<ActionResult> {
    const user = await getFreshSessionUser();
    if (!user || !user.emailVerifiedAt) {
        return { ok: false, error: 'Authentification requise.' };
    }

    const parsed = replySchema.safeParse(input);
    if (!parsed.success) {
        return { ok: false, fieldErrors: zodToFieldErrors(parsed.error) };
    }

    try {
        await replyToBookingReview({
            bookingReference: parsed.data.reference,
            hostId: user.id,
            hostReply: parsed.data.host_reply,
        });
        revalidatePath(`/reservations/${parsed.data.reference}`);
        return {
            ok: true,
            toast: { type: 'success', message: 'Réponse publiée.' },
        };
    } catch (error) {
        return handleDomainError(error);
    }
}

export async function sendMessageAction(input: {
    reference: string;
    body: string;
}): Promise<ActionResult> {
    const user = await getFreshSessionUser();
    if (!user || !user.emailVerifiedAt) {
        return { ok: false, error: 'Authentification requise.' };
    }

    const body = input.body.trim();
    if (!body) {
        return {
            ok: false,
            fieldErrors: { body: 'Écrivez un message avant d’envoyer.' },
        };
    }
    if (body.length > 2000) {
        return {
            ok: false,
            fieldErrors: {
                body: 'Le message ne doit pas dépasser 2000 caractères.',
            },
        };
    }

    const booking = await prisma.booking.findUnique({
        where: { reference: input.reference },
        include: { property: { select: { userId: true } } },
    });

    if (
        !booking ||
        (booking.userId !== user.id && booking.property.userId !== user.id)
    ) {
        return { ok: false, error: 'Conversation inaccessible.' };
    }

    const created = await prisma.message.create({
        data: {
            bookingId: booking.id,
            userId: user.id,
            body,
        },
    });

    await notifyNewMessage(created.id);

    revalidatePath(`/messages/${booking.reference}`);
    revalidatePath('/messages');

    return { ok: true };
}

export async function toggleFavoriteAction(
    propertyId: number,
): Promise<ActionResult<{ favorited: boolean }>> {
    const user = await getFreshSessionUser();
    if (!user) {
        return { ok: false, error: 'Connectez-vous pour enregistrer un favori.' };
    }

    const existing = await prisma.favorite.findUnique({
        where: {
            userId_propertyId: { userId: user.id, propertyId },
        },
    });

    if (existing) {
        await prisma.favorite.delete({
            where: { userId_propertyId: { userId: user.id, propertyId } },
        });
        revalidatePath('/favoris');
        return {
            ok: true,
            data: { favorited: false },
            toast: { type: 'info', message: 'Retiré des favoris.' },
        };
    }

    await prisma.favorite.create({
        data: { userId: user.id, propertyId },
    });
    revalidatePath('/favoris');

    return {
        ok: true,
        data: { favorited: true },
        toast: { type: 'success', message: 'Ajouté aux favoris.' },
    };
}

export async function markAllNotificationsReadAction(): Promise<ActionResult> {
    const user = await getFreshSessionUser();
    if (!user) {
        return { ok: false, error: 'Authentification requise.' };
    }

    await prisma.notification.updateMany({
        where: {
            notifiableId: user.id,
            readAt: null,
        },
        data: { readAt: new Date() },
    });

    revalidatePath('/notifications');
    return {
        ok: true,
        toast: { type: 'info', message: 'Toutes les notifications sont lues.' },
    };
}

