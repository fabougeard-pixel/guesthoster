import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ErrorView } from '@/components/error-view';
import { requireVerifiedUser } from '@/lib/auth/session';
import {
    BOOKING_STATUS_LABELS,
    type BookingStatus,
} from '@/lib/domain/enums';
import { toIsoDate } from '@/lib/format';
import { prisma } from '@/lib/prisma';
import { ConversationClient } from './conversation-client';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Messages',
};

export default async function ConversationPage({
    params,
}: {
    params: Promise<{ reference: string }>;
}) {
    const user = await requireVerifiedUser();
    const { reference } = await params;

    const booking = await prisma.booking.findUnique({
        where: { reference },
        include: {
            guest: { select: { name: true } },
            property: {
                select: {
                    userId: true,
                    title: true,
                    owner: { select: { name: true } },
                },
            },
            messages: {
                orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
            },
        },
    });

    if (!booking) {
        notFound();
    }

    const isGuest = booking.userId === user.id;
    const isHost = booking.property.userId === user.id;
    if (!isGuest && !isHost) {
        return <ErrorView status={403} />;
    }

    await prisma.message.updateMany({
        where: {
            bookingId: booking.id,
            userId: { not: user.id },
            readAt: null,
        },
        data: { readAt: new Date() },
    });

    const status = booking.status as BookingStatus;

    return (
        <ConversationClient
            conversation={{
                reference: booking.reference,
                property_title: booking.property.title,
                check_in: toIsoDate(booking.checkIn),
                check_out: toIsoDate(booking.checkOut),
                status_label: BOOKING_STATUS_LABELS[status] ?? status,
                counterpart: isGuest
                    ? booking.property.owner.name
                    : booking.guest.name,
            }}
            messages={booking.messages.map((m) => ({
                id: m.id,
                body: m.body,
                sender_id: m.userId,
                created_at: m.createdAt ? m.createdAt.toISOString() : null,
                read_at: m.readAt ? m.readAt.toISOString() : null,
            }))}
            currentUserId={user.id}
        />
    );
}

