import type { Metadata } from 'next';
import type { Prisma } from '@prisma/client';
import { ErrorView } from '@/components/error-view';
import { requireAdminAccess } from '@/lib/auth/session';
import {
    BOOKING_MODE_LABELS,
    PROPERTY_STATUS_LABELS,
    PROPERTY_STATUSES,
    type BookingMode,
    type PropertyStatus,
} from '@/lib/domain/enums';
import {
    buildPaginated,
    resolveThumbnailUrl,
} from '@/lib/domain/properties';
import { prisma } from '@/lib/prisma';
import { firstParam, parsePageParam } from '@/lib/search-params';
import type { AdminProperty } from '@/types';
import { AdminPropertiesClient } from './admin-properties-client';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Annonces · Administration',
};

export default async function AdminPropertiesPage({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const admin = await requireAdminAccess('/admin/logements');
    if (!admin) {
        return <ErrorView status={403} />;
    }

    const sp = await searchParams;
    const search = firstParam(sp.search).trim();
    const rawStatus = firstParam(sp.status).trim();
    const status = (PROPERTY_STATUSES as readonly string[]).includes(rawStatus)
        ? (rawStatus as PropertyStatus)
        : '';
    const page = parsePageParam(sp.page);
    const perPage = 20;

    const where: Prisma.PropertyWhereInput = {
        ...(status ? { status } : {}),
        ...(search
            ? {
                  OR: [
                      { title: { contains: search, mode: 'insensitive' } },
                      { slug: { contains: search, mode: 'insensitive' } },
                      {
                          city: {
                              name: { contains: search, mode: 'insensitive' },
                          },
                      },
                      {
                          owner: {
                              name: { contains: search, mode: 'insensitive' },
                          },
                      },
                      {
                          owner: {
                              email: { contains: search, mode: 'insensitive' },
                          },
                      },
                  ],
              }
            : {}),
    };

    const [groupedCounts, total, rows] = await Promise.all([
        prisma.property.groupBy({
            by: ['status'],
            _count: { _all: true },
        }),
        prisma.property.count({ where }),
        prisma.property.findMany({
            where,
            include: {
                propertyType: { select: { name: true } },
                city: { select: { name: true } },
                owner: {
                    select: { name: true, email: true, suspendedAt: true },
                },
                images: {
                    orderBy: { position: 'asc' },
                    take: 1,
                    select: {
                        thumbnailPath: true,
                        path: true,
                        cloudinaryPublicId: true,
                    },
                },
                _count: { select: { images: true } },
            },
            orderBy: [
                { submittedAt: 'desc' },
                { updatedAt: 'desc' },
                { id: 'desc' },
            ],
            skip: (page - 1) * perPage,
            take: perPage,
        }),
    ]);

    const countMap = new Map(
        groupedCounts.map((entry) => [entry.status, entry._count._all]),
    );
    const totalAll = groupedCounts.reduce(
        (sum, entry) => sum + entry._count._all,
        0,
    );

    const statusTabs = [
        { value: '', label: 'Toutes', count: totalAll },
        ...PROPERTY_STATUSES.map((value) => ({
            value,
            label: PROPERTY_STATUS_LABELS[value],
            count: countMap.get(value) ?? 0,
        })),
    ];

    const items: AdminProperty[] = rows.map((row) => {
        const propertyStatus = row.status as PropertyStatus;
        const bookingMode = row.bookingMode as BookingMode;
        const cover = row.images[0];

        return {
            id: row.id,
            slug: row.slug,
            title: row.title,
            type: row.propertyType.name,
            booking_mode: BOOKING_MODE_LABELS[bookingMode] ?? row.bookingMode,
            cover_url: cover
                ? resolveThumbnailUrl(
                      cover.thumbnailPath,
                      cover.path,
                      cover.cloudinaryPublicId,
                  )
                : null,
            city: row.city?.name ?? null,
            price_per_night: row.pricePerNight,
            photos: row._count.images,
            status: propertyStatus,
            status_label: PROPERTY_STATUS_LABELS[propertyStatus] ?? row.status,
            rejection_reason: row.rejectionReason,
            host: {
                name: row.owner.name,
                email: row.owner.email,
                suspended: Boolean(row.owner.suspendedAt),
            },
            submitted_at: row.submittedAt?.toISOString() ?? null,
            published_at: row.publishedAt?.toISOString() ?? null,
        };
    });

    const paginator = buildPaginated(
        items,
        total,
        page,
        perPage,
        '/admin/logements',
        {
            status: status || undefined,
            search: search || undefined,
        },
    );

    return (
        <AdminPropertiesClient
            properties={paginator}
            statusTabs={statusTabs}
            filters={{ search, status }}
        />
    );
}

