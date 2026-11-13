import type { Metadata } from 'next';
import Link from 'next/link';
import { Card, Container } from '@/components/card';
import { requireVerifiedUser } from '@/lib/auth/session';
import {
    BOOKING_STATUS_LABELS,
    type BookingStatus,
} from '@/lib/domain/enums';
import { resolveThumbnailUrl } from '@/lib/domain/properties';
import { prisma } from '@/lib/prisma';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Messages',
};

function formatWhen(iso: string) {
    const date = new Date(iso);
    const sameDay = date.toDateString() === new Date().toDateString();

    return new Intl.DateTimeFormat(
        'fr-FR',
        sameDay
            ? { hour: '2-digit', minute: '2-digit' }
            : { day: 'numeric', month: 'short' },
    ).format(date);
}

export default async function MessagesPage() {
    const user = await requireVerifiedUser();

    const [bookings, inquiries] = await Promise.all([
        prisma.booking.findMany({
            where: {
                OR: [{ userId: user.id }, { property: { userId: user.id } }],
                messages: { some: {} },
            },
            include: {
                guest: { select: { name: true } },
                property: {
                    select: {
                        title: true,
                        owner: { select: { name: true } },
                        images: {
                            where: { processedAt: { not: null } },
                            orderBy: { position: 'asc' },
                            take: 1,
                        },
                    },
                },
                messages: {
                    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
                    select: {
                        body: true,
                        userId: true,
                        readAt: true,
                        createdAt: true,
                    },
                },
            },
        }),
        prisma.propertyInquiry.findMany({
            where: user.role === 'admin'
                ? { OR: [{ guestId: user.id }, { hostId: user.id }, { isManagedByAdmin: true }] }
                : { OR: [{ guestId: user.id }, { hostId: user.id }] },
            include: {
                guest: { select: { name: true } },
                host: { select: { name: true } },
                property: {
                    select: {
                        title: true,
                        slug: true,
                        images: {
                            where: { processedAt: { not: null } },
                            orderBy: { position: 'asc' },
                            take: 1,
                        },
                    },
                },
                messages: {
                    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
                    take: 1,
                    select: {
                        body: true,
                        senderId: true,
                        readAt: true,
                        createdAt: true,
                    },
                },
            },
        }),
    ]);

    const bookingConversations = bookings.map((booking) => {
        const latest = booking.messages[0];
        const isGuest = booking.userId === user.id;
        const cover = booking.property.images[0];
        const coverUrl = cover
            ? resolveThumbnailUrl(
                cover.thumbnailPath,
                cover.path,
                cover.cloudinaryPublicId,
            )
            : null;
        const unread = booking.messages.filter(
            (m) => m.userId !== user.id && m.readAt === null,
        ).length;
        const status = booking.status as BookingStatus;

        return {
            href: `/messages/${booking.reference}`,
            property_title: booking.property.title,
            cover_url: coverUrl,
            counterpart: isGuest
                ? booking.property.owner.name
                : booking.guest.name,
            role: (isGuest ? 'guest' : 'host') as 'guest' | 'host',
            status_label: BOOKING_STATUS_LABELS[status] ?? status,
            last_message: latest?.body ?? null,
            last_message_mine: latest ? latest.userId === user.id : false,
            last_message_at: latest?.createdAt
                ? latest.createdAt.toISOString()
                : null,
            unread,
            is_inquiry: false,
        };
    });

    const inquiryConversations = inquiries.map((inq) => {
        const latest = inq.messages[0];
        const isGuest = inq.guestId === user.id;
        const cover = inq.property.images[0];
        const coverUrl = cover
            ? resolveThumbnailUrl(
                cover.thumbnailPath,
                cover.path,
                cover.cloudinaryPublicId,
            )
            : null;
        const unread = inq.messages.filter(
            (m) => m.senderId !== user.id && m.readAt === null,
        ).length;

        const counterpart = isGuest
            ? inq.host.name
            : inq.guest.name;

        return {
            href: user.role === 'admin' && inq.isManagedByAdmin
                ? `/admin/messages/${inq.reference}`
                : `/logements/${inq.property.slug}`,
            property_title: inq.property.title,
            cover_url: coverUrl,
            counterpart,
            role: (isGuest ? 'guest' : 'host') as 'guest' | 'host',
            status_label: inq.status === 'open' ? 'Chat en direct' : 'Clôturé',
            last_message: latest?.body ?? null,
            last_message_mine: latest ? latest.senderId === user.id : false,
            last_message_at: latest?.createdAt
                ? latest.createdAt.toISOString()
                : null,
            unread,
            is_inquiry: true,
        };
    });

    const conversations = [...bookingConversations, ...inquiryConversations].sort((a, b) =>
        (b.last_message_at ?? '').localeCompare(a.last_message_at ?? ''),
    );

    return (
        <Container className="max-w-3xl py-10">
            <h1 className="text-2xl font-semibold">Messages</h1>
            {conversations.length === 0 ? (
                <Card className="mt-8 px-6 py-12 text-center text-zinc-600 dark:text-zinc-400">
                    Aucune conversation pour l’instant. Vous pourrez écrire à
                    votre hôte, ou à vos voyageurs, depuis la page d’une
                    réservation.
                </Card>
            ) : (
                <ul className="mt-8 flex flex-col divide-y divide-zinc-200 rounded-2xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
                    {conversations.map((conversation, idx) => (
                        <li key={`${conversation.href}-${idx}`}>
                            <Link
                                href={conversation.href}
                                className="flex items-center gap-4 p-4 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900"
                            >
                                <div className="size-14 shrink-0 overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800">
                                    {conversation.cover_url && (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={conversation.cover_url}
                                            alt=""
                                            className="size-full object-cover"
                                        />
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-baseline justify-between gap-3">
                                        <p
                                            className={cn(
                                                'truncate',
                                                conversation.unread > 0
                                                    ? 'font-semibold'
                                                    : 'font-medium',
                                            )}
                                        >
                                            {conversation.counterpart}
                                            <span className="font-normal text-zinc-500 dark:text-zinc-400">
                                                {' '}
                                                ·{' '}
                                                {conversation.role === 'guest'
                                                    ? 'votre hôte'
                                                    : 'voyageur'}
                                            </span>
                                        </p>
                                        {conversation.last_message_at && (
                                            <time
                                                className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400"
                                                dateTime={
                                                    conversation.last_message_at
                                                }
                                            >
                                                {formatWhen(
                                                    conversation.last_message_at,
                                                )}
                                            </time>
                                        )}
                                    </div>
                                    <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">
                                        {conversation.property_title} ·{' '}
                                        {conversation.status_label}
                                    </p>
                                    <p
                                        className={cn(
                                            'truncate text-sm',
                                            conversation.unread > 0
                                                ? 'font-medium text-zinc-900 dark:text-zinc-100'
                                                : 'text-zinc-600 dark:text-zinc-400',
                                        )}
                                    >
                                        {conversation.last_message_mine &&
                                            'Vous : '}
                                        {conversation.last_message}
                                    </p>
                                </div>
                                {conversation.unread > 0 && (
                                    <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-primary-600 px-1.5 text-xs font-semibold text-white">
                                        <span className="sr-only">
                                            Non lus :{' '}
                                        </span>
                                        {conversation.unread}
                                    </span>
                                )}
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </Container>
    );
}

