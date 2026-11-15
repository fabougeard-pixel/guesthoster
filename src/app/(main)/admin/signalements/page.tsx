import type { Metadata } from 'next';
import type { Prisma } from '@prisma/client';
import { ErrorView } from '@/components/error-view';
import { requireAdminAccess } from '@/lib/auth/session';
import { resolveThumbnailUrl } from '@/lib/domain/properties';
import { buildPaginated } from '@/lib/domain/properties';
import { prisma } from '@/lib/prisma';
import { firstParam, parsePageParam } from '@/lib/search-params';
import { REPORT_REASON_LABELS } from '@/lib/domain/enums';
import type { AdminPropertyReport } from '@/types';
import { AdminReportsClient } from './admin-reports-client';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Signalements d’annonces · Administration',
};

export default async function AdminReportsPage({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const admin = await requireAdminAccess('/admin/signalements');
    if (!admin) {
        return <ErrorView status={403} />;
    }

    const sp = await searchParams;
    const search = firstParam(sp.search).trim();
    const rawStatus = firstParam(sp.status).trim();
    const status =
        rawStatus === 'pending' ||
        rawStatus === 'resolved' ||
        rawStatus === 'dismissed'
            ? rawStatus
            : '';

    const page = parsePageParam(sp.page);
    const perPage = 20;

    const where: Prisma.PropertyReportWhereInput = {
        ...(status ? { status } : {}),
        ...(search
            ? {
                  OR: [
                      {
                          property: {
                              title: { contains: search, mode: 'insensitive' },
                          },
                      },
                      {
                          property: {
                              owner: {
                                  name: { contains: search, mode: 'insensitive' },
                              },
                          },
                      },
                      {
                          reporterName: { contains: search, mode: 'insensitive' },
                      },
                      {
                          reporterEmail: { contains: search, mode: 'insensitive' },
                      },
                      {
                          details: { contains: search, mode: 'insensitive' },
                      },
                  ],
              }
            : {}),
    };

    const [groupedCounts, total, rows] = await Promise.all([
        prisma.propertyReport.groupBy({
            by: ['status'],
            _count: { _all: true },
        }),
        prisma.propertyReport.count({ where }),
        prisma.propertyReport.findMany({
            where,
            include: {
                property: {
                    select: {
                        id: true,
                        title: true,
                        slug: true,
                        status: true,
                        owner: {
                            select: { id: true, name: true, email: true },
                        },
                        images: {
                            where: { processedAt: { not: null } },
                            orderBy: { position: 'asc' },
                            take: 1,
                        },
                    },
                },
            },
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
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
        { value: '', label: 'Tous les signalements', count: totalAll },
        {
            value: 'pending',
            label: 'En attente de modération',
            count: countMap.get('pending') ?? 0,
        },
        {
            value: 'resolved',
            label: 'Traités / Anonymisés',
            count: countMap.get('resolved') ?? 0,
        },
        {
            value: 'dismissed',
            label: 'Classés sans suite',
            count: countMap.get('dismissed') ?? 0,
        },
    ];

    const items: AdminPropertyReport[] = rows.map((row) => {
        const cover = row.property.images[0];
        const coverUrl = cover
            ? resolveThumbnailUrl(
                  cover.thumbnailPath,
                  cover.path,
                  cover.cloudinaryPublicId,
              )
            : null;

        return {
            id: row.id,
            property_id: row.property.id,
            property_title: row.property.title,
            property_slug: row.property.slug,
            property_status: row.property.status,
            property_cover_url: coverUrl,
            host_id: row.property.owner.id,
            host_name: row.property.owner.name,
            host_email: row.property.owner.email,
            reporter_name: row.reporterName || 'Visiteur anonyme',
            reporter_email: row.reporterEmail || 'Non communiqué',
            reason: row.reason,
            reason_label: REPORT_REASON_LABELS[row.reason] ?? row.reason,
            details: row.details,
            status: row.status as 'pending' | 'resolved' | 'dismissed',
            admin_notes: row.adminNotes,
            created_at: row.createdAt?.toISOString() ?? null,
            resolved_at: row.resolvedAt?.toISOString() ?? null,
        };
    });

    const paginator = buildPaginated(
        items,
        total,
        page,
        perPage,
        '/admin/signalements',
        {
            search: search || undefined,
            status: status || undefined,
        },
    );

    return (
        <AdminReportsClient
            reports={paginator}
            statusTabs={statusTabs}
            filters={{ search, status }}
        />
    );
}
