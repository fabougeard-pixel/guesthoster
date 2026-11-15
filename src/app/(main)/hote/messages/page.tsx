import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge, Card } from '@/components/card';
import { getEffectiveHostContext } from '@/lib/auth/managed-host';
import {
    BOOKING_STATUS_LABELS,
    type BookingStatus,
} from '@/lib/domain/enums';
import { resolveThumbnailUrl } from '@/lib/domain/properties';
import { prisma } from '@/lib/prisma';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Messages & Chat · Espace hôte & propriétaire',
};

function formatWhen(iso: Date | string | null) {
    if (!iso) {
        return '';
    }
    const date = typeof iso === 'string' ? new Date(iso) : iso;
    const sameDay = date.toDateString() === new Date().toDateString();

    return new Intl.DateTimeFormat(
        'fr-FR',
        sameDay
            ? { hour: '2-digit', minute: '2-digit' }
            : { day: 'numeric', month: 'short' },
    ).format(date);
}

export default async function HostMessagesPage({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const hostContext = await getEffectiveHostContext();
    const activeHost = hostContext.activeHost;
    const targetUserId = activeHost ? activeHost.id : hostContext.user.id;

    const sp = await searchParams;
    const rawFilter = Array.isArray(sp.filtre) ? sp.filtre[0] : sp.filtre;
    const filter = rawFilter === 'unread' || rawFilter === 'bookings' || rawFilter === 'inquiries' ? rawFilter : 'all';

    const [bookings, inquiries] = await Promise.all([
        prisma.booking.findMany({
            where: {
                property: { userId: targetUserId },
                messages: { some: {} },
            },
            include: {
                guest: { select: { id: true, name: true, email: true } },
                property: {
                    select: {
                        id: true,
                        title: true,
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
            orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        }),
        prisma.propertyInquiry.findMany({
            where: {
                OR: [
                    { hostId: targetUserId },
                    { property: { userId: targetUserId } },
                ],
            },
            include: {
                guest: { select: { id: true, name: true, email: true } },
                property: {
                    select: {
                        id: true,
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
            orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        }),
    ]);

    const bookingConversations = bookings.map((b) => {
        const latest = b.messages[0];
        const cover = b.property.images[0];
        const coverUrl = cover
            ? resolveThumbnailUrl(
                cover.thumbnailPath,
                cover.path,
                cover.cloudinaryPublicId,
            )
            : null;
        const unread = b.messages.filter(
            (m) => m.userId !== targetUserId && m.readAt === null,
        ).length;
        const status = b.status as BookingStatus;

        return {
            id: `booking-${b.id}`,
            href: `/messages/${b.reference}`,
            type: 'booking' as const,
            typeLabel: 'Séjour réservé',
            propertyTitle: b.property.title,
            coverUrl,
            counterpartName: b.guest.name,
            counterpartEmail: b.guest.email,
            statusLabel: BOOKING_STATUS_LABELS[status] ?? status,
            statusTone: (status === 'confirmed' ? 'success' : status === 'pending' ? 'warning' : 'neutral') as 'success' | 'warning' | 'neutral',
            lastMessage: latest?.body ?? null,
            lastMessageMine: latest ? latest.userId === targetUserId : false,
            lastMessageAt: latest?.createdAt ?? b.updatedAt,
            unread,
        };
    });

    const inquiryConversations = inquiries.map((inq) => {
        const latest = inq.messages[0];
        const cover = inq.property.images[0];
        const coverUrl = cover
            ? resolveThumbnailUrl(
                cover.thumbnailPath,
                cover.path,
                cover.cloudinaryPublicId,
            )
            : null;
        const unread = inq.messages.filter(
            (m) => m.senderId !== targetUserId && m.readAt === null,
        ).length;

        const isSupportHandled = inq.supportRequested;

        return {
            id: `inquiry-${inq.id}`,
            href: hostContext.isAdmin
                ? `/admin/messages/${inq.reference}`
                : `/logements/${inq.property.slug}`,
            type: 'inquiry' as const,
            typeLabel: isSupportHandled ? 'Support Client (Paiement)' : 'Question voyageur (Chat)',
            propertyTitle: inq.property.title,
            coverUrl,
            counterpartName: inq.guest.name,
            counterpartEmail: inq.guest.email,
            statusLabel: isSupportHandled ? 'Support Guest Hoster' : inq.status === 'open' ? 'En cours' : 'Clôturée',
            statusTone: (isSupportHandled ? 'warning' : inq.status === 'open' ? 'primary' : 'neutral') as 'warning' | 'primary' | 'neutral',
            lastMessage: latest?.body ?? null,
            lastMessageMine: latest ? latest.senderId === targetUserId : false,
            lastMessageAt: latest?.createdAt ?? inq.updatedAt,
            unread,
        };
    });

    let conversations = [...bookingConversations, ...inquiryConversations].sort((a, b) => {
        const timeA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
        const timeB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
        return timeB - timeA;
    });

    const totalUnread = conversations.reduce((sum, c) => sum + c.unread, 0);

    if (filter === 'unread') {
        conversations = conversations.filter((c) => c.unread > 0);
    } else if (filter === 'bookings') {
        conversations = conversations.filter((c) => c.type === 'booking');
    } else if (filter === 'inquiries') {
        conversations = conversations.filter((c) => c.type === 'inquiry');
    }

    const pageHeading =
        hostContext.isAdmin && activeHost
            ? `Messages & Échanges — ${activeHost.name}`
            : 'Messages & Conciergerie';

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                    <h1 className="text-2xl font-semibold">{pageHeading}</h1>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        {hostContext.isAdmin && activeHost
                            ? `Fils de discussion et questions voyageurs strictement isolés pour ${activeHost.name}`
                            : 'Tous vos échanges directs avec les voyageurs concernant vos logements et séjours.'}
                    </p>
                </div>
            </div>

            {/* Onglets de filtrage */}
            <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200 pb-3 dark:border-zinc-800">
                <Link
                    href="/hote/messages"
                    className={cn(
                        'rounded-xl px-3 py-1.5 text-xs font-semibold transition',
                        filter === 'all'
                            ? 'bg-primary-50 text-primary-700 dark:bg-primary-950/60 dark:text-primary-300'
                            : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800',
                    )}
                >
                    Tous les échanges ({bookingConversations.length + inquiryConversations.length})
                </Link>

                <Link
                    href="/hote/messages?filtre=unread"
                    className={cn(
                        'flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition',
                        filter === 'unread'
                            ? 'bg-primary-50 text-primary-700 dark:bg-primary-950/60 dark:text-primary-300'
                            : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800',
                    )}
                >
                    <span>Non lus</span>
                    {totalUnread > 0 && (
                        <span className="rounded-full bg-red-600 px-1.5 py-0.2 text-[10px] font-bold text-white">
                            {totalUnread}
                        </span>
                    )}
                </Link>

                <Link
                    href="/hote/messages?filtre=bookings"
                    className={cn(
                        'rounded-xl px-3 py-1.5 text-xs font-semibold transition',
                        filter === 'bookings'
                            ? 'bg-primary-50 text-primary-700 dark:bg-primary-950/60 dark:text-primary-300'
                            : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800',
                    )}
                >
                    Réservations ({bookingConversations.length})
                </Link>

                <Link
                    href="/hote/messages?filtre=inquiries"
                    className={cn(
                        'rounded-xl px-3 py-1.5 text-xs font-semibold transition',
                        filter === 'inquiries'
                            ? 'bg-primary-50 text-primary-700 dark:bg-primary-950/60 dark:text-primary-300'
                            : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800',
                    )}
                >
                    Questions préalables / Chat ({inquiryConversations.length})
                </Link>
            </div>

            {conversations.length === 0 ? (
                <Card className="px-6 py-12 text-center text-zinc-500 dark:text-zinc-400">
                    <p className="font-medium">
                        {filter === 'unread'
                            ? 'Aucun message non lu pour cet hôte.'
                            : 'Aucune conversation trouvée dans cette section.'}
                    </p>
                    <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                        Dès qu’un voyageur envoie un message ou pose une question sur un logement de {activeHost?.name ?? 'votre compte'}, la discussion apparaîtra ici.
                    </p>
                </Card>
            ) : (
                <div className="grid gap-3">
                    {conversations.map((c) => (
                        <Card
                            key={c.id}
                            className={cn(
                                'p-4 transition hover:border-zinc-300 dark:hover:border-zinc-700',
                                c.unread > 0 && 'border-primary-300 bg-primary-50/20 dark:border-primary-800 dark:bg-primary-950/10',
                            )}
                        >
                            <Link
                                href={c.href}
                                className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="size-12 shrink-0 overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800">
                                        {c.coverUrl && (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                src={c.coverUrl}
                                                alt=""
                                                className="size-full object-cover"
                                            />
                                        )}
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                                                {c.counterpartName}
                                            </span>
                                            <Badge tone={c.statusTone}>
                                                {c.statusLabel}
                                            </Badge>
                                            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                                                {c.typeLabel}
                                            </span>
                                        </div>

                                        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400 truncate">
                                            {c.propertyTitle} · {c.counterpartEmail}
                                        </p>

                                        {c.lastMessage && (
                                            <p
                                                className={cn(
                                                    'mt-1 line-clamp-1 text-xs',
                                                    c.unread > 0
                                                        ? 'font-bold text-zinc-900 dark:text-zinc-100'
                                                        : 'text-zinc-600 dark:text-zinc-400',
                                                )}
                                            >
                                                {c.lastMessageMine && 'Vous : '}
                                                {c.lastMessage}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                                    <span className="text-xs text-zinc-400 whitespace-nowrap">
                                        {formatWhen(c.lastMessageAt)}
                                    </span>

                                    {c.unread > 0 && (
                                        <span className="inline-flex items-center justify-center rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-xs">
                                            {c.unread} non lu(s)
                                        </span>
                                    )}

                                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 dark:text-primary-400">
                                        Accéder →
                                    </span>
                                </div>
                            </Link>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
