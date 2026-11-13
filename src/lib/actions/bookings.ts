'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import {
    createSessionCookie,
    getFreshSessionUser,
} from '@/lib/auth/session';
import {
    cancelExistingBooking,
    createBookingForProperty,
    publishBookingReview,
    replyToBookingReview,
} from '@/lib/domain/bookings';
import { DomainError } from '@/lib/domain/properties';
import { env } from '@/lib/env';
import { addDays, formatLongDateFr, isValidIsoDate, todayIso } from '@/lib/format';
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
            .optional()
            .nullable()
            .default(''),
        guests: z.coerce
            .number()
            .int()
            .min(1, 'Au moins 1 occupant.')
            .max(30),
        special_requests: z
            .string()
            .max(1000, 'Les précisions ne doivent pas dépasser 1000 caractères.')
            .optional()
            .nullable(),
        guest_name: z.string().trim().optional().nullable(),
        guest_email: z.string().trim().optional().nullable(),
        guest_password: z.string().optional().nullable(),
    })
    .refine((d) => d.check_in >= todayIso(), {
        path: ['check_in'],
        message: 'La date doit être aujourd’hui ou ultérieure.',
    });

export async function createBookingAction(input: {
    propertySlug: string;
    check_in: string;
    check_out?: string | null;
    guests: number;
    special_requests?: string | null;
    guest_name?: string | null;
    guest_email?: string | null;
    guest_password?: string | null;
}): Promise<ActionResult> {
    let user = await getFreshSessionUser();

    const parsed = createBookingSchema.safeParse(input);
    if (!parsed.success) {
        return { ok: false, fieldErrors: zodToFieldErrors(parsed.error) };
    }

    if (!user) {
        const guestName = (parsed.data.guest_name ?? '').trim();
        const guestEmail = (parsed.data.guest_email ?? '').trim().toLowerCase();
        const guestPassword = parsed.data.guest_password ?? '';

        const fieldErrors: Record<string, string> = {};
        if (!guestName || guestName.length < 2) {
            fieldErrors.guest_name =
                'Veuillez renseigner votre nom complet (au moins 2 caractères).';
        }
        if (!guestEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)) {
            fieldErrors.guest_email =
                'Veuillez saisir une adresse e-mail valide.';
        }
        if (!guestPassword || guestPassword.length < 8) {
            fieldErrors.guest_password =
                'Le mot de passe doit comporter au moins 8 caractères.';
        }

        if (Object.keys(fieldErrors).length > 0) {
            return { ok: false, fieldErrors };
        }

        const existing = await prisma.user.findUnique({
            where: { email: guestEmail },
        });

        if (existing) {
            if (existing.suspendedAt !== null) {
                return {
                    ok: false,
                    fieldErrors: {
                        guest_email:
                            'Ce compte est suspendu. Veuillez contacter le support.',
                    },
                };
            }

            const isValid = await verifyPassword(
                guestPassword,
                existing.password,
            );
            if (!isValid) {
                return {
                    ok: false,
                    fieldErrors: {
                        guest_password:
                            'Un compte existe déjà avec cette adresse. Le mot de passe saisi est incorrect.',
                    },
                };
            }

            user = existing;
            if (!user.emailVerifiedAt) {
                user = await prisma.user.update({
                    where: { id: user.id },
                    data: { emailVerifiedAt: new Date() },
                });
            }
            await createSessionCookie(user.id, true);
        } else {
            const passwordHash = await hashPassword(guestPassword);
            user = await prisma.user.create({
                data: {
                    name: guestName,
                    email: guestEmail,
                    password: passwordHash,
                    role: 'client',
                    emailVerifiedAt: new Date(),
                },
            });
            await createSessionCookie(user.id, true);
        }
    } else {
        if (!user.emailVerifiedAt) {
            return {
                ok: false,
                error: 'Veuillez vérifier votre adresse e-mail avant de réserver.',
            };
        }
    }

    const property = await prisma.property.findUnique({
        where: { slug: parsed.data.propertySlug },
        select: {
            id: true,
            slug: true,
            rentalDuration: true,
            advanceRentMonths: true,
        },
    });

    if (!property) {
        return { ok: false, error: 'Logement introuvable.' };
    }

    let checkOutIso = (parsed.data.check_out ?? '').trim();
    if (property.rentalDuration === 'long_term') {
        if (!checkOutIso || !isValidIsoDate(checkOutIso) || checkOutIso <= parsed.data.check_in) {
            checkOutIso = addDays(
                parsed.data.check_in,
                Math.max(1, property.advanceRentMonths) * 30,
            );
        }
    } else if (!isValidIsoDate(checkOutIso) || checkOutIso <= parsed.data.check_in) {
        return {
            ok: false,
            fieldErrors: {
                check_out: 'La date de départ doit être postérieure à la date d’arrivée.',
            },
        };
    }

    try {
        const result = await createBookingForProperty({
            propertyId: property.id,
            guestId: user.id,
            checkInIso: parsed.data.check_in,
            checkOutIso,
            guests: parsed.data.guests,
            specialRequests: parsed.data.special_requests,
        });

        revalidatePath('/', 'layout');
        revalidatePath('/voyages');
        revalidatePath(`/logements/${property.slug}`);

        return {
            ok: true,
            redirectTo: `/reservations/${result.reference}`,
            toast: {
                type: 'success',
                message:
                    result.mode === 'instant'
                        ? property.rentalDuration === 'long_term'
                            ? 'Dossier enregistré ! Procédez maintenant au règlement.'
                            : 'Dates bloquées ! Réglez maintenant votre réservation.'
                        : 'Demande envoyée au propriétaire.',
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
            rentalDuration: booking.rentalDuration,
            advanceRentMonths: booking.advanceRentMonths,
            chargesIncluded: booking.chargesIncluded,
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

