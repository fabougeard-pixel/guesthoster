import crypto from 'node:crypto';
import type { Prisma } from '@prisma/client';
import {
    BLOCKING_BOOKING_STATUSES,
    BOOKING_STATUS_LABELS,
    type BookingMode,
    type BookingStatus,
    canBookingTransitionTo,
} from '@/lib/domain/enums';
import { quotePrice } from '@/lib/domain/pricing';
import {
    DomainError,
    isPropertyAvailableBetween,
    resolveThumbnailUrl,
    reviewWindowDeadlineIso,
} from '@/lib/domain/properties';
import { calculateRefundAmount, describeRefundPolicy } from '@/lib/domain/refund-policy';
import { env } from '@/lib/env';
import { diffInDays, parseDate, todayIso, toIsoDate } from '@/lib/format';
import {
    notifyBookingAwaitingPayment,
    notifyBookingCancelled,
    notifyBookingConfirmed,
    notifyBookingDeclined,
    notifyBookingExpired,
    notifyBookingPaymentRefunded,
    notifyBookingRequested,
    notifyReviewReceived,
    notifyReviewRequested,
} from '@/lib/notifications/service';
import { prisma } from '@/lib/prisma';
import { type PaidCheckout, refundPayment } from '@/lib/services/stripe';
import type { Booking, Review } from '@/types';

const REFERENCE_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function generateBookingReference(): string {
    const bytes = crypto.randomBytes(8);
    let code = '';
    for (let i = 0; i < 8; i += 1) {
        code += REFERENCE_ALPHABET[bytes[i]! % REFERENCE_ALPHABET.length];
    }
    return `GH-${code}`;
}

export type BookingDetailRecord = Prisma.BookingGetPayload<{
    include: {
        guest: { select: { id: true; name: true; email: true } };
        property: {
            include: {
                city: { include: { country: true } };
                owner: { select: { id: true; name: true; email: true; suspendedAt: true } };
                images: true;
            };
        };
        review: { include: { author: { select: { name: true } } } };
    };
}>;

export function serializeReview(
    review: NonNullable<BookingDetailRecord['review']>,
): Review {
    const first =
        review.author.name.trim().split(/\s+/)[0] || review.author.name;

    return {
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        author: first,
        created_at: review.createdAt ? review.createdAt.toISOString() : null,
        host_reply: review.hostReply,
        replied_at: review.repliedAt ? review.repliedAt.toISOString() : null,
    };
}

export function serializeBooking(
    record: BookingDetailRecord,
    viewer: { id: number; role: string },
    options?: { includeReview?: boolean },
): Booking {
    const status = record.status as BookingStatus;
    const isGuest = record.userId === viewer.id;
    const isActualHost = record.property.userId === viewer.id;
    const isAdmin = viewer.role === 'admin';
    const isHostPerspective = isActualHost || (isAdmin && !isGuest);
    const canView = isGuest || isActualHost || isAdmin;

    const revealAddress =
        isHostPerspective ||
        status === 'confirmed' ||
        status === 'completed';

    const today = todayIso();
    const checkInIso = toIsoDate(record.checkIn);
    const now = new Date();
    const reviewDeadlineDate = new Date(
        record.checkOut.getTime() + env.booking.reviewWindowDays * 86_400_000,
    );

    const cover = record.property.images[0];
    const coverUrl = cover
        ? resolveThumbnailUrl(
              cover.thumbnailPath,
              cover.path,
              cover.cloudinaryPublicId,
          )
        : null;

    const rawAddress = [
        record.property.address,
        [record.property.postalCode, record.property.city?.name]
            .filter(Boolean)
            .join(' '),
    ]
        .filter(Boolean)
        .join(', ');

    const refundIfCancelled = calculateRefundAmount(
        {
            totalPrice: record.totalPrice,
            paidAt: record.paidAt,
            checkIn: checkInIso,
            refundedAmount: record.refundedAmount,
            guestUserId: record.userId,
        },
        viewer.id,
        {
            fullRefundDays: env.booking.fullRefundDays,
            lateRefundRate: env.booking.lateRefundRate,
            referenceDateIso: today,
        },
    );

    const canRespond = (isActualHost || isAdmin) && status === 'pending';
    const canPay =
        isGuest &&
        status === 'awaiting_payment' &&
        (record.expiresAt === null || record.expiresAt.getTime() > now.getTime());
    const canCancel =
        canView &&
        canBookingTransitionTo(status, 'cancelled') &&
        checkInIso > today;
    const canMessage = isGuest || isActualHost;
    const canReview =
        status === 'completed' &&
        isGuest &&
        reviewDeadlineDate.getTime() > now.getTime() &&
        !record.review;
    const canReplyReview =
        status === 'completed' &&
        isActualHost &&
        Boolean(record.review && record.review.hostReply === null);

    return {
        reference: record.reference,
        status,
        status_label: BOOKING_STATUS_LABELS[status] ?? status,
        is_instant: (record.bookingMode as BookingMode) === 'instant',
        check_in: checkInIso,
        check_out: toIsoDate(record.checkOut),
        nights: record.nights,
        guests: record.guests,
        price_per_night: record.pricePerNight,
        lodging_total: record.nights * record.pricePerNight,
        cleaning_fee: record.cleaningFee,
        service_fee: record.serviceFee,
        total_price: record.totalPrice,
        special_requests: record.specialRequests,
        cancellation_reason: record.cancellationReason,
        expires_at: record.expiresAt ? record.expiresAt.toISOString() : null,
        paid_at: record.paidAt ? record.paidAt.toISOString() : null,
        refunded_amount: record.refundedAmount,
        refund_if_cancelled: refundIfCancelled,
        refund_policy: describeRefundPolicy(
            env.booking.fullRefundDays,
            env.booking.lateRefundRate,
        ),
        created_at: record.createdAt ? record.createdAt.toISOString() : null,
        property: {
            slug: record.property.slug,
            title: record.property.title,
            city: record.property.city?.name ?? null,
            country: record.property.city?.country.name ?? null,
            cover_url: coverUrl,
            address: revealAddress && rawAddress ? rawAddress : null,
            check_in_time: record.property.checkInTime.slice(0, 5),
            check_out_time: record.property.checkOutTime.slice(0, 5),
        },
        guest: { name: record.guest.name },
        host: { name: record.property.owner.name },
        viewer: isHostPerspective ? 'host' : 'guest',
        ...(options?.includeReview
            ? { review: record.review ? serializeReview(record.review) : null }
            : {}),
        review_deadline:
            status === 'completed'
                ? parseDate(reviewWindowDeadlineIso(record.checkOut, env.booking.reviewWindowDays)).toISOString()
                : null,
        can: {
            respond: canRespond,
            cancel: canCancel,
            pay: canPay,
            message: canMessage,
            review: canReview,
            reply_review: canReplyReview,
        },
    };
}

export async function createBookingForProperty(input: {
    propertyId: number;
    guestId: number;
    checkInIso: string;
    checkOutIso: string;
    guests: number;
    specialRequests?: string | null;
}): Promise<{ id: number; reference: string; mode: BookingMode }> {
    const start = parseDate(input.checkInIso);
    const end = parseDate(input.checkOutIso);
    const nights = diffInDays(input.checkInIso, input.checkOutIso);
    if (nights < 1) {
        throw new DomainError('Les dates de séjour sont invalides.');
    }

    const result = await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT id FROM properties WHERE id = ${input.propertyId} FOR UPDATE`;

        const property = await tx.property.findUnique({
            where: { id: input.propertyId },
            include: { owner: { select: { id: true, suspendedAt: true } } },
        });

        if (
            !property ||
            property.status !== 'published' ||
            property.owner.suspendedAt !== null
        ) {
            throw new DomainError(
                'Ce logement n’est pas disponible à la réservation.',
            );
        }

        if (property.userId === input.guestId) {
            throw new DomainError(
                'Vous ne pouvez pas réserver votre propre logement.',
                403,
            );
        }

        if (input.guests < 1 || input.guests > property.maxGuests) {
            throw new DomainError(
                `Ce logement accepte au maximum ${property.maxGuests} voyageur(s).`,
            );
        }

        if (nights < property.minNights) {
            throw new DomainError(
                `La durée minimale du séjour est de ${property.minNights} nuit(s).`,
            );
        }

        if (property.maxNights !== null && nights > property.maxNights) {
            throw new DomainError(
                `La durée maximale du séjour est de ${property.maxNights} nuit(s).`,
            );
        }

        const [overlappingBooking, overlappingBlock] = await Promise.all([
            tx.booking.findFirst({
                where: {
                    propertyId: property.id,
                    status: { in: BLOCKING_BOOKING_STATUSES },
                    checkIn: { lt: end },
                    checkOut: { gt: start },
                },
                select: { id: true },
            }),
            tx.blockedPeriod.findFirst({
                where: {
                    propertyId: property.id,
                    startsOn: { lt: end },
                    endsOn: { gt: start },
                },
                select: { id: true },
            }),
        ]);

        if (overlappingBooking || overlappingBlock) {
            throw new DomainError(
                'Ces dates ne sont plus disponibles. Veuillez choisir un autre créneau.',
                409,
            );
        }

        const quote = quotePrice({
            pricePerNight: property.pricePerNight,
            cleaningFee: property.cleaningFee,
            checkIn: input.checkInIso,
            checkOut: input.checkOutIso,
            serviceFeeRate: env.booking.serviceFeeRate,
        });

        const mode = property.bookingMode as BookingMode;
        const isInstant = mode === 'instant';
        const now = new Date();
        const expiresAt = isInstant
            ? new Date(now.getTime() + env.booking.instantPaymentMinutes * 60_000)
            : new Date(now.getTime() + env.booking.hostResponseHours * 3_600_000);

        const booking = await tx.booking.create({
            data: {
                reference: generateBookingReference(),
                propertyId: property.id,
                userId: input.guestId,
                checkIn: start,
                checkOut: end,
                guests: input.guests,
                nights: quote.nights,
                pricePerNight: quote.price_per_night,
                cleaningFee: quote.cleaning_fee,
                serviceFee: quote.service_fee,
                totalPrice: quote.total_price,
                bookingMode: mode,
                status: isInstant ? 'awaiting_payment' : 'pending',
                specialRequests: input.specialRequests?.trim() || null,
                expiresAt,
            },
        });

        return { id: booking.id, reference: booking.reference, mode };
    });

    if (result.mode === 'instant') {
        await notifyBookingAwaitingPayment(result.id);
    } else {
        await notifyBookingRequested(result.id);
    }

    return result;
}

export async function approvePendingBooking(
    bookingReference: string,
    actor: { id: number; role: string },
): Promise<void> {
    const updatedId = await prisma.$transaction(async (tx) => {
        const booking = await tx.booking.findUnique({
            where: { reference: bookingReference },
            include: { property: { select: { id: true, userId: true } } },
        });

        if (!booking) {
            throw new DomainError('Réservation introuvable.', 404);
        }

        if (booking.property.userId !== actor.id && actor.role !== 'admin') {
            throw new DomainError('Action non autorisée.', 403);
        }

        const status = booking.status as BookingStatus;
        if (
            status !== 'pending' ||
            !canBookingTransitionTo(status, 'awaiting_payment')
        ) {
            throw new DomainError('Cette demande ne peut plus être acceptée.');
        }

        await tx.$executeRaw`SELECT id FROM properties WHERE id = ${booking.propertyId} FOR UPDATE`;

        const available = await isPropertyAvailableBetween(
            booking.propertyId,
            toIsoDate(booking.checkIn),
            toIsoDate(booking.checkOut),
            booking.id,
        );
        if (!available) {
            throw new DomainError(
                'Ces dates entrent en conflit avec une autre réservation ou une période bloquée.',
                409,
            );
        }

        const now = new Date();
        await tx.booking.update({
            where: { id: booking.id },
            data: {
                status: 'awaiting_payment',
                approvedAt: now,
                expiresAt: new Date(
                    now.getTime() + env.booking.approvedPaymentHours * 3_600_000,
                ),
            },
        });

        return booking.id;
    });

    await notifyBookingAwaitingPayment(updatedId);
}

export async function declinePendingBooking(
    bookingReference: string,
    actor: { id: number; role: string },
    reason?: string | null,
): Promise<void> {
    const booking = await prisma.booking.findUnique({
        where: { reference: bookingReference },
        include: { property: { select: { userId: true } } },
    });

    if (!booking) {
        throw new DomainError('Réservation introuvable.', 404);
    }

    if (booking.property.userId !== actor.id && actor.role !== 'admin') {
        throw new DomainError('Action non autorisée.', 403);
    }

    const status = booking.status as BookingStatus;
    if (status !== 'pending' || !canBookingTransitionTo(status, 'declined')) {
        throw new DomainError('Cette demande ne peut plus être refusée.');
    }

    await prisma.booking.update({
        where: { id: booking.id },
        data: {
            status: 'declined',
            cancellationReason: reason?.trim() || null,
            cancelledBy: actor.id,
            cancelledAt: new Date(),
            expiresAt: null,
        },
    });

    await notifyBookingDeclined(booking.id);
}

export async function cancelExistingBooking(
    bookingReference: string,
    actor: { id: number; role: string },
    reason?: string | null,
): Promise<void> {
    const booking = await prisma.booking.findUnique({
        where: { reference: bookingReference },
        include: { property: { select: { userId: true } } },
    });

    if (!booking) {
        throw new DomainError('Réservation introuvable.', 404);
    }

    const isGuest = booking.userId === actor.id;
    const isHost = booking.property.userId === actor.id;
    const isAdmin = actor.role === 'admin';

    if (!isGuest && !isHost && !isAdmin) {
        throw new DomainError('Action non autorisée.', 403);
    }

    const status = booking.status as BookingStatus;
    if (
        !canBookingTransitionTo(status, 'cancelled') ||
        toIsoDate(booking.checkIn) <= todayIso()
    ) {
        throw new DomainError('Cette réservation ne peut plus être annulée.');
    }

    const refundAmount = calculateRefundAmount(
        {
            totalPrice: booking.totalPrice,
            paidAt: booking.paidAt,
            checkIn: toIsoDate(booking.checkIn),
            refundedAmount: booking.refundedAmount,
            guestUserId: booking.userId,
        },
        actor.id,
        {
            fullRefundDays: env.booking.fullRefundDays,
            lateRefundRate: env.booking.lateRefundRate,
        },
    );

    let refundPatch: {
        stripeRefundId?: string;
        refundedAmount?: number;
        refundedAt?: Date;
    } = {};

    if (refundAmount > 0 && booking.stripePaymentIntentId) {
        const stripeRefundId = await refundPayment(
            booking.stripePaymentIntentId,
            refundAmount,
            `cancel-${booking.reference}`,
        );
        refundPatch = {
            stripeRefundId,
            refundedAmount: booking.refundedAmount + refundAmount,
            refundedAt: new Date(),
        };
    }

    await prisma.booking.update({
        where: { id: booking.id },
        data: {
            ...refundPatch,
            status: 'cancelled',
            cancellationReason: reason?.trim() || null,
            cancelledBy: actor.id,
            cancelledAt: new Date(),
            expiresAt: null,
        },
    });

    const cancelledByRole = isGuest ? 'guest' : isHost ? 'host' : 'admin';
    await notifyBookingCancelled(booking.id, cancelledByRole);
}

export async function confirmBookingPayment(
    checkout: PaidCheckout,
): Promise<{ bookingId: number; reference: string; status: 'confirmed' | 'refund' | 'already-recorded' } | null> {
    const outcome = await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT id FROM bookings WHERE reference = ${checkout.bookingReference} FOR UPDATE`;

        const booking = await tx.booking.findUnique({
            where: { reference: checkout.bookingReference },
        });

        if (!booking) {
            console.warn(
                'Paiement Stripe pour une réservation inconnue :',
                checkout.bookingReference,
            );
            return null;
        }

        if (booking.stripePaymentIntentId === checkout.paymentIntentId) {
            return {
                bookingId: booking.id,
                reference: booking.reference,
                result: 'already-recorded' as const,
            };
        }

        const now = new Date();
        if (
            booking.status !== 'awaiting_payment' ||
            checkout.amountTotal !== booking.totalPrice
        ) {
            await tx.booking.update({
                where: { id: booking.id },
                data: {
                    stripeCheckoutSessionId: checkout.sessionId,
                    stripePaymentIntentId: checkout.paymentIntentId,
                    paidAt: now,
                },
            });

            return {
                bookingId: booking.id,
                reference: booking.reference,
                result: 'refund' as const,
            };
        }

        await tx.booking.update({
            where: { id: booking.id },
            data: {
                stripeCheckoutSessionId: checkout.sessionId,
                stripePaymentIntentId: checkout.paymentIntentId,
                paidAt: now,
                status: 'confirmed',
                confirmedAt: now,
                expiresAt: null,
            },
        });

        return {
            bookingId: booking.id,
            reference: booking.reference,
            result: 'confirmed' as const,
        };
    });

    if (!outcome) {
        return null;
    }

    if (outcome.result === 'confirmed') {
        await notifyBookingConfirmed(outcome.bookingId);
    } else if (outcome.result === 'refund') {
        const refundId = await refundPayment(
            checkout.paymentIntentId,
            checkout.amountTotal,
            `late-payment-${checkout.paymentIntentId}`,
        );
        await prisma.booking.update({
            where: { id: outcome.bookingId },
            data: {
                refundedAmount: checkout.amountTotal,
                stripeRefundId: refundId,
                refundedAt: new Date(),
            },
        });
        await notifyBookingPaymentRefunded(outcome.bookingId);
    }

    return {
        bookingId: outcome.bookingId,
        reference: outcome.reference,
        status: outcome.result,
    };
}

export async function publishBookingReview(input: {
    bookingReference: string;
    guestId: number;
    rating: number;
    comment: string;
}): Promise<void> {
    const { reviewId } = await prisma.$transaction(async (tx) => {
        const booking = await tx.booking.findUnique({
            where: { reference: input.bookingReference },
            include: { review: { select: { id: true } } },
        });

        if (!booking || booking.userId !== input.guestId) {
            throw new DomainError('Action non autorisée.', 403);
        }

        const deadline = parseDate(
            reviewWindowDeadlineIso(booking.checkOut, env.booking.reviewWindowDays),
        );
        if (
            booking.status !== 'completed' ||
            deadline.getTime() <= Date.now() ||
            booking.review
        ) {
            throw new DomainError(
                'Vous ne pouvez plus publier d’avis pour cette réservation.',
            );
        }

        const review = await tx.review.create({
            data: {
                bookingId: booking.id,
                propertyId: booking.propertyId,
                userId: input.guestId,
                rating: input.rating,
                comment: input.comment.trim(),
            },
        });

        const aggregate = await tx.review.aggregate({
            where: { propertyId: booking.propertyId },
            _count: { _all: true },
            _avg: { rating: true },
        });

        await tx.property.update({
            where: { id: booking.propertyId },
            data: {
                reviewsCount: aggregate._count._all,
                ratingAverage: aggregate._avg.rating,
            },
        });

        return { reviewId: review.id };
    });

    await notifyReviewReceived(reviewId);
}

export async function replyToBookingReview(input: {
    bookingReference: string;
    hostId: number;
    hostReply: string;
}): Promise<void> {
    const booking = await prisma.booking.findUnique({
        where: { reference: input.bookingReference },
        include: {
            property: { select: { userId: true } },
            review: true,
        },
    });

    if (!booking || booking.property.userId !== input.hostId) {
        throw new DomainError('Action non autorisée.', 403);
    }

    if (
        booking.status !== 'completed' ||
        !booking.review ||
        booking.review.hostReply !== null
    ) {
        throw new DomainError('Vous ne pouvez plus répondre à cet avis.');
    }

    await prisma.review.update({
        where: { id: booking.review.id },
        data: {
            hostReply: input.hostReply.trim(),
            repliedAt: new Date(),
        },
    });
}

export async function runMaintenanceCron(): Promise<{
    expired: number;
    completed: number;
    prunedNotifications: number;
}> {
    const now = new Date();
    const todayStart = parseDate(todayIso());

    const stalePending = await prisma.booking.findMany({
        where: {
            status: { in: ['pending', 'awaiting_payment'] },
            expiresAt: { lt: now },
        },
        select: { id: true },
    });

    let expired = 0;
    for (const row of stalePending) {
        const res = await prisma.booking.updateMany({
            where: {
                id: row.id,
                status: { in: ['pending', 'awaiting_payment'] },
            },
            data: { status: 'expired' },
        });
        if (res.count > 0) {
            expired += 1;
            await notifyBookingExpired(row.id);
        }
    }

    const finishedStays = await prisma.booking.findMany({
        where: {
            status: 'confirmed',
            checkOut: { lt: todayStart },
        },
        select: { id: true },
    });

    let completed = 0;
    for (const row of finishedStays) {
        const res = await prisma.booking.updateMany({
            where: { id: row.id, status: 'confirmed' },
            data: { status: 'completed' },
        });
        if (res.count > 0) {
            completed += 1;
            await notifyReviewRequested(row.id);
        }
    }

    const cutoff = new Date(now.getTime() - 90 * 86_400_000);
    const pruned = await prisma.notification.deleteMany({
        where: {
            readAt: { lt: cutoff, not: null },
        },
    });

    return {
        expired,
        completed,
        prunedNotifications: pruned.count,
    };
}
