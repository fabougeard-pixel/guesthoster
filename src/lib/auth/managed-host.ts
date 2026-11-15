import { cookies } from 'next/headers';
import type { User as PrismaUser } from '@prisma/client';
import { requireVerifiedUser } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';

export type ManagedHostItem = {
    id: number;
    name: string;
    email: string;
    avatar_url: string | null;
    host_type: string;
    account_type: 'individual' | 'company';
    company_name: string | null;
    role: string;
    is_host: boolean;
    is_owner: boolean;
    properties_count: number;
    short_term_count: number;
    long_term_count: number;
    pending_bookings_count: number;
    upcoming_visits_count: number;
    unread_messages_count: number;
    notifications_count: number;
};

export type HostContext = {
    user: PrismaUser;
    isAdmin: boolean;
    isManaging: boolean;
    activeHost: ManagedHostItem | null;
    allHosts: ManagedHostItem[];
};

export async function getEffectiveHostContext(): Promise<HostContext> {
    const user = await requireVerifiedUser();
    const isAdminUser = user.role === 'admin';

    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);

    if (!isAdminUser) {
        // Hôte standard : isolation stricte, aucun accès aux autres profils
        const [pendingBookings, upcomingVisits, unreadBookingMsgs, unreadInquiries, properties] = await Promise.all([
            prisma.booking.count({
                where: {
                    property: { userId: user.id },
                    OR: [
                        { status: 'pending' },
                        { status: 'awaiting_payment', paymentMethod: 'bank_transfer' },
                    ],
                },
            }),
            prisma.propertyVisit.count({
                where: {
                    property: { userId: user.id },
                    status: { in: ['confirmed', 'pending'] },
                    visitDate: { gte: todayDate },
                },
            }),
            prisma.message.count({
                where: {
                    booking: { property: { userId: user.id } },
                    userId: { not: user.id },
                    readAt: null,
                },
            }),
            prisma.propertyInquiryMessage.count({
                where: {
                    inquiry: { hostId: user.id },
                    senderId: { not: user.id },
                    readAt: null,
                },
            }),
            prisma.property.findMany({
                where: { userId: user.id },
                select: { rentalDuration: true },
            }),
        ]);

        const shortTerm = properties.filter((p) => p.rentalDuration === 'short_term').length;
        const longTerm = properties.filter((p) => p.rentalDuration === 'long_term').length;
        const totalNotifs = pendingBookings + upcomingVisits + unreadBookingMsgs + unreadInquiries;

        const selfHost: ManagedHostItem = {
            id: user.id,
            name: user.name,
            email: user.email,
            avatar_url: user.avatarUrl,
            host_type: 'Hôte Standard',
            account_type: 'individual',
            company_name: null,
            role: user.role,
            is_host: shortTerm > 0 || longTerm === 0,
            is_owner: longTerm > 0,
            properties_count: properties.length,
            short_term_count: shortTerm,
            long_term_count: longTerm,
            pending_bookings_count: pendingBookings,
            upcoming_visits_count: upcomingVisits,
            unread_messages_count: unreadBookingMsgs + unreadInquiries,
            notifications_count: totalNotifs,
        };

        return {
            user,
            isAdmin: false,
            isManaging: false,
            activeHost: selfHost,
            allHosts: [selfHost],
        };
    }

    // Administrateur : récupérer tous les hôtes & propriétaires enregistrés
    const rawHosts = await prisma.user.findMany({
        where: {
            OR: [
                { role: 'host' },
                { properties: { some: {} } },
            ],
            suspendedAt: null,
        },
        select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            hostType: true,
            accountType: true,
            companyName: true,
            role: true,
            properties: {
                select: {
                    id: true,
                    rentalDuration: true,
                },
            },
        },
        orderBy: [{ name: 'asc' }],
    });

    const hostIds = rawHosts.map((h) => h.id);

    const [pendingBookingsByProperty, upcomingVisitsByProperty, unreadBookingMsgsByHost, unreadInquiryMsgsByHost] = await Promise.all([
        prisma.booking.groupBy({
            by: ['propertyId'],
            where: {
                property: { userId: { in: hostIds } },
                OR: [
                    { status: 'pending' },
                    { status: 'awaiting_payment', paymentMethod: 'bank_transfer' },
                ],
            },
            _count: { _all: true },
        }),
        prisma.propertyVisit.groupBy({
            by: ['propertyId'],
            where: {
                property: { userId: { in: hostIds } },
                status: { in: ['confirmed', 'pending'] },
                visitDate: { gte: todayDate },
            },
            _count: { _all: true },
        }),
        prisma.message.findMany({
            where: {
                booking: { property: { userId: { in: hostIds } } },
                readAt: null,
            },
            select: {
                userId: true,
                booking: { select: { property: { select: { userId: true } } } },
            },
        }),
        prisma.propertyInquiryMessage.findMany({
            where: {
                inquiry: { hostId: { in: hostIds } },
                readAt: null,
            },
            select: {
                senderId: true,
                inquiry: { select: { hostId: true } },
            },
        }),
    ]);

    // Mapper les logements vers leurs propriétaires respectifs
    const propToHostMap = new Map<number, number>();
    for (const h of rawHosts) {
        for (const p of h.properties) {
            propToHostMap.set(p.id, h.id);
        }
    }

    const pendingCountMap = new Map<number, number>();
    for (const item of pendingBookingsByProperty) {
        const hId = propToHostMap.get(item.propertyId);
        if (hId) {
            pendingCountMap.set(hId, (pendingCountMap.get(hId) ?? 0) + item._count._all);
        }
    }

    const visitsCountMap = new Map<number, number>();
    for (const item of upcomingVisitsByProperty) {
        const hId = propToHostMap.get(item.propertyId);
        if (hId) {
            visitsCountMap.set(hId, (visitsCountMap.get(hId) ?? 0) + item._count._all);
        }
    }

    const unreadMsgMap = new Map<number, number>();
    for (const msg of unreadBookingMsgsByHost) {
        const ownerId = msg.booking.property.userId;
        if (msg.userId !== ownerId) {
            unreadMsgMap.set(ownerId, (unreadMsgMap.get(ownerId) ?? 0) + 1);
        }
    }
    for (const inqMsg of unreadInquiryMsgsByHost) {
        const hId = inqMsg.inquiry.hostId;
        if (inqMsg.senderId !== hId) {
            unreadMsgMap.set(hId, (unreadMsgMap.get(hId) ?? 0) + 1);
        }
    }

    const allHosts: ManagedHostItem[] = rawHosts.map((h) => {
        const shortTerm = h.properties.filter((p) => p.rentalDuration === 'short_term').length;
        const longTerm = h.properties.filter((p) => p.rentalDuration === 'long_term').length;
        const pending = pendingCountMap.get(h.id) ?? 0;
        const visits = visitsCountMap.get(h.id) ?? 0;
        const unread = unreadMsgMap.get(h.id) ?? 0;
        const totalNotifs = pending + visits + unread;

        // Définition Hôte (courte durée) vs Propriétaire (longue durée / bailleur)
        const isOwner = longTerm > 0 || h.accountType === 'company' || Boolean(h.hostType?.toLowerCase().includes('propriétaire'));
        const isHost = shortTerm > 0 || (longTerm === 0 && !h.hostType?.toLowerCase().includes('propriétaire'));

        return {
            id: h.id,
            name: h.name,
            email: h.email,
            avatar_url: h.avatarUrl,
            host_type: h.hostType ?? 'Hôte Standard',
            account_type: (h.accountType as 'individual' | 'company') ?? 'individual',
            company_name: h.companyName,
            role: h.role,
            is_host: isHost || (!isHost && !isOwner),
            is_owner: isOwner || (!isHost && !isOwner),
            properties_count: h.properties.length,
            short_term_count: shortTerm,
            long_term_count: longTerm,
            pending_bookings_count: pending,
            upcoming_visits_count: visits,
            unread_messages_count: unread,
            notifications_count: totalNotifs,
        };
    });

    // Lecture du cookie administrateur pour l'hôte actif
    const cookieStore = await cookies();
    const cookieHostIdStr = cookieStore.get('gh_managed_host_id')?.value;
    const cookieHostId = cookieHostIdStr ? Number(cookieHostIdStr) : null;

    let activeHost = allHosts.find((h) => h.id === cookieHostId) ?? null;

    // Si aucun sélectionné en cookie, sélectionner le premier avec notifications ou le premier hôte
    if (!activeHost && allHosts.length > 0) {
        const withNotifs = allHosts.find((h) => h.notifications_count > 0);
        activeHost = withNotifs ?? allHosts[0];
    }

    return {
        user,
        isAdmin: true,
        isManaging: true,
        activeHost,
        allHosts,
    };
}
