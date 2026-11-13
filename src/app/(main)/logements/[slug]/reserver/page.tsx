import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import {
    getPlatformPaymentSettings,
    listEnabledPaymentMethods,
} from '@/lib/domain/platform-settings';
import { quoteLongTermUpfront, quotePrice } from '@/lib/domain/pricing';
import {
    isPropertyAvailableBetween,
    serializePropertyCard,
} from '@/lib/domain/properties';
import { describeRefundPolicy } from '@/lib/domain/refund-policy';
import { env } from '@/lib/env';
import { addDays, isValidIsoDate, plural, todayIso } from '@/lib/format';
import { prisma } from '@/lib/prisma';
import { BookingCreateClient } from './booking-create-client';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await params;
    const property = await prisma.property.findUnique({
        where: { slug },
        select: { bookingMode: true },
    });

    return {
        title:
            property?.bookingMode === 'instant'
                ? 'Confirmer la réservation'
                : 'Demande de réservation',
    };
}

export default async function BookingCreatePage({
    params,
    searchParams,
}: {
    params: Promise<{ slug: string }>;
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const user = await getCurrentUser();
    const { slug } = await params;
    const sp = await searchParams;

    const property = await prisma.property.findUnique({
        where: { slug },
        include: {
            owner: { select: { id: true, suspendedAt: true } },
            city: { include: { country: true } },
            propertyType: true,
            images: {
                where: { processedAt: { not: null } },
                orderBy: { position: 'asc' },
                take: 1,
            },
        },
    });

    if (
        !property ||
        property.status !== 'published' ||
        property.owner.suspendedAt !== null
    ) {
        notFound();
    }

    const checkIn = Array.isArray(sp.check_in) ? sp.check_in[0] : sp.check_in;
    const rawCheckOut = Array.isArray(sp.check_out)
        ? sp.check_out[0]
        : sp.check_out;
    const isLongTerm = property.rentalDuration === 'long_term';

    if (isLongTerm) {
        if (!isValidIsoDate(checkIn) || checkIn < todayIso()) {
            redirect(`/logements/${property.slug}`);
        }
    } else if (
        !isValidIsoDate(checkIn) ||
        !isValidIsoDate(rawCheckOut) ||
        checkIn < todayIso() ||
        rawCheckOut <= checkIn
    ) {
        redirect(`/logements/${property.slug}`);
    }

    const checkOut = isLongTerm
        ? isValidIsoDate(rawCheckOut) && rawCheckOut > checkIn
            ? rawCheckOut
            : addDays(checkIn, Math.max(1, property.advanceRentMonths) * 30)
        : rawCheckOut!;

    const rawGuests = Number(
        Array.isArray(sp.guests) ? sp.guests[0] : sp.guests,
    );
    const guests =
        Number.isFinite(rawGuests) &&
            rawGuests >= 1 &&
            rawGuests <= property.maxGuests
            ? rawGuests
            : property.maxGuests || 1;

    const [isAvailable] = await Promise.all([
        isPropertyAvailableBetween(property.id, checkIn, checkOut),
    ]);

    const quote = isLongTerm
        ? {
            rental_duration: 'long_term' as const,
            ...quoteLongTermUpfront({
                monthlyRent: property.monthlyRent,
                securityDeposit: property.securityDeposit,
                monthlyCharges: property.monthlyCharges,
                chargesIncluded: property.chargesIncluded,
                advanceRentMonths: property.advanceRentMonths,
            }),
        }
        : {
            rental_duration: 'short_term' as const,
            ...quotePrice({
                pricePerNight: property.pricePerNight,
                cleaningFee: property.cleaningFee,
                checkIn,
                checkOut,
                serviceFeeRate: env.booking.serviceFeeRate,
            }),
        };

    const isInstant = property.bookingMode === 'instant';
    const paymentDelay = isInstant
        ? env.booking.instantPaymentMinutes % 60 === 0
            ? plural(env.booking.instantPaymentMinutes / 60, 'heure')
            : plural(env.booking.instantPaymentMinutes, 'minute')
        : plural(env.booking.approvedPaymentHours, 'heure');

    const card = serializePropertyCard(property);
    const paymentSettings = await getPlatformPaymentSettings();

    return (
        <BookingCreateClient
            currentUser={user}
            property={{
                ...card,
                is_owner: user ? property.userId === user.id : false,
                min_nights: property.minNights,
                max_nights: property.maxNights,
            }}
            stay={{ check_in: checkIn, check_out: checkOut, guests }}
            quote={quote}
            isAvailable={isAvailable}
            paymentDelay={paymentDelay}
            enabledMethods={listEnabledPaymentMethods(paymentSettings)}
            responseDelay={env.booking.hostResponseHours}
            refundPolicy={describeRefundPolicy(
                property.cancellationDays ?? env.booking.fullRefundDays,
                env.booking.lateRefundRate,
            )}
        />
    );
}

