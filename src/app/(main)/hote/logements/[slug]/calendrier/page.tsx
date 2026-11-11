import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ErrorView } from '@/components/error-view';
import { requireVerifiedUser } from '@/lib/auth/session';
import {
    BLOCKING_BOOKING_STATUSES,
    BOOKING_STATUS_LABELS,
    type BookingStatus,
} from '@/lib/domain/enums';
import { parseDate, todayIso, toIsoDate } from '@/lib/format';
import { prisma } from '@/lib/prisma';
import { PropertyCalendarClient } from './property-calendar-client';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await params;
    const property = await prisma.property.findUnique({
        where: { slug },
        select: { title: true },
    });
    return {
        title: property ? `Calendrier · ${property.title}` : 'Calendrier',
    };
}

export default async function PropertyCalendarPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const user = await requireVerifiedUser();
    const { slug } = await params;
    const todayDate = parseDate(todayIso());

    const property = await prisma.property.findUnique({
        where: { slug },
        include: {
            bookings: {
                where: {
                    status: { in: BLOCKING_BOOKING_STATUSES },
                    checkOut: { gt: todayDate },
                },
                orderBy: { checkIn: 'asc' },
                select: {
                    reference: true,
                    checkIn: true,
                    checkOut: true,
                    status: true,
                },
            },
            blockedPeriods: {
                where: { endsOn: { gt: todayDate } },
                orderBy: { startsOn: 'asc' },
                select: {
                    id: true,
                    startsOn: true,
                    endsOn: true,
                    reason: true,
                },
            },
        },
    });

    if (!property) {
        notFound();
    }

    if (property.userId !== user.id && user.role !== 'admin') {
        return <ErrorView status={403} />;
    }

    return (
        <PropertyCalendarClient
            property={{ slug: property.slug, title: property.title }}
            bookings={property.bookings.map((b) => {
                const status = b.status as BookingStatus;
                return {
                    reference: b.reference,
                    start: toIsoDate(b.checkIn),
                    end: toIsoDate(b.checkOut),
                    status_label: BOOKING_STATUS_LABELS[status] ?? status,
                };
            })}
            blockedPeriods={property.blockedPeriods.map((p) => ({
                id: p.id,
                start: toIsoDate(p.startsOn),
                end: toIsoDate(p.endsOn),
                reason: p.reason,
            }))}
        />
    );
}

