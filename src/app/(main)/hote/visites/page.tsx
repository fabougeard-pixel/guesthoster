import type { Metadata } from 'next';
import type { Prisma } from '@prisma/client';
import { getEffectiveHostContext } from '@/lib/auth/managed-host';
import { resolveThumbnailUrl } from '@/lib/domain/properties';
import { buildPaginated } from '@/lib/domain/properties';
import { prisma } from '@/lib/prisma';
import { firstParam, parsePageParam } from '@/lib/search-params';
import type { PropertyVisit } from '@/types';
import { HostVisitsClient } from './host-visits-client';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Visites de logements · Espace Propriétaire & Hôte',
};

export default async function HostVisitsPage({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const hostContext = await getEffectiveHostContext();
    const activeHost = hostContext.activeHost;
    const targetUserId = activeHost ? activeHost.id : hostContext.user.id;

    const sp = await searchParams;
    const search = firstParam(sp.search).trim();
    const rawStatus = firstParam(sp.status).trim();
    const status =
        rawStatus === 'upcoming' ||
        rawStatus === 'completed' ||
        rawStatus === 'cancelled'
            ? rawStatus
            : 'upcoming';

    const page = parsePageParam(sp.page);
    const perPage = 15;

    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);

    const baseWhere: Prisma.PropertyVisitWhereInput = {
        property: { userId: targetUserId },
        ...(search
            ? {
                  OR: [
                      { reference: { contains: search, mode: 'insensitive' } },
                      { name: { contains: search, mode: 'insensitive' } },
                      { email: { contains: search, mode: 'insensitive' } },
                      { phone: { contains: search, mode: 'insensitive' } },
                      { property: { title: { contains: search, mode: 'insensitive' } } },
                  ],
              }
            : {}),
    };

    let statusWhere: Prisma.PropertyVisitWhereInput = {};
    if (status === 'upcoming') {
        statusWhere = {
            status: { in: ['confirmed', 'pending'] },
            visitDate: { gte: todayDate },
        };
    } else if (status === 'completed') {
        statusWhere = {
            OR: [
                { status: 'completed' },
                {
                    status: 'confirmed',
                    visitDate: { lt: todayDate },
                },
            ],
        };
    } else if (status === 'cancelled') {
        statusWhere = {
            status: 'cancelled',
        };
    }

    const where: Prisma.PropertyVisitWhereInput = {
        ...baseWhere,
        ...statusWhere,
    };

    const [
        total,
        rows,
        upcomingCount,
        completedCount,
        cancelledCount,
        allCount,
    ] = await Promise.all([
        prisma.propertyVisit.count({ where }),
        prisma.propertyVisit.findMany({
            where,
            orderBy: [{ visitDate: status === 'upcoming' ? 'asc' : 'desc' }, { id: 'desc' }],
            skip: (page - 1) * perPage,
            take: perPage,
            include: {
                property: {
                    select: {
                        id: true,
                        title: true,
                        slug: true,
                        monthlyRent: true,
                        city: { select: { name: true } },
                        images: {
                            where: { processedAt: { not: null } },
                            orderBy: { position: 'asc' },
                            take: 1,
                        },
                    },
                },
            },
        }),
        prisma.propertyVisit.count({
            where: {
                ...baseWhere,
                status: { in: ['confirmed', 'pending'] },
                visitDate: { gte: todayDate },
            },
        }),
        prisma.propertyVisit.count({
            where: {
                ...baseWhere,
                OR: [
                    { status: 'completed' },
                    {
                        status: 'confirmed',
                        visitDate: { lt: todayDate },
                    },
                ],
            },
        }),
        prisma.propertyVisit.count({
            where: {
                ...baseWhere,
                status: 'cancelled',
            },
        }),
        prisma.propertyVisit.count({
            where: baseWhere,
        }),
    ]);

    const items: PropertyVisit[] = rows.map((v) => {
        const cover = v.property.images[0];
        const isPastConfirmed =
            v.status === 'confirmed' && new Date(v.visitDate) < todayDate;
        const computedStatus = isPastConfirmed ? 'completed' : v.status;

        return {
            id: v.id,
            reference: v.reference,
            property_id: v.propertyId,
            property_title: v.property.title,
            property_slug: v.property.slug,
            property_cover_url: cover
                ? resolveThumbnailUrl(
                      cover.thumbnailPath,
                      cover.path,
                      cover.cloudinaryPublicId,
                  )
                : null,
            property_city: v.property.city?.name ?? null,
            monthly_rent: v.property.monthlyRent,
            name: v.name,
            email: v.email,
            phone: v.phone,
            visit_date: v.visitDate.toISOString().slice(0, 10),
            time_slot: v.timeSlot,
            candidate_notes: v.candidateNotes,
            visit_fee: v.visitFee,
            payment_method: v.paymentMethod,
            payment_status: v.paymentStatus,
            status: computedStatus,
            confirmed_at: v.confirmedAt ? v.confirmedAt.toISOString() : null,
            cancelled_at: v.cancelledAt ? v.cancelledAt.toISOString() : null,
            created_at: v.createdAt ? v.createdAt.toISOString() : null,
        };
    });

    const paginated = buildPaginated(items, total, page, perPage, '/hote/visites', {
        search: search || undefined,
        status: status || undefined,
    });

    const statusTabs = [
        { value: 'upcoming', label: 'À venir', count: upcomingCount },
        { value: 'completed', label: 'Effectuées', count: completedCount },
        { value: 'cancelled', label: 'Annulées', count: cancelledCount },
        { value: '', label: 'Toutes', count: allCount },
    ];

    return (
        <HostVisitsClient
            visits={paginated}
            statusTabs={statusTabs}
            filters={{
                search,
                status,
            }}
            activeHostName={activeHost ? activeHost.name : null}
        />
    );
}
