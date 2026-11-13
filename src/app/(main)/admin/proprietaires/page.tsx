import type { Metadata } from 'next';
import type { Prisma } from '@prisma/client';
import { AdminLayout } from '@/components/layouts/admin-layout';
import { ErrorView } from '@/components/error-view';
import { requireAdminAccess } from '@/lib/auth/session';
import { buildPaginated } from '@/lib/domain/properties';
import { prisma } from '@/lib/prisma';
import { firstParam, parsePageParam } from '@/lib/search-params';
import { AdminOwnersClient, type ManagedOwner } from './admin-owners-client';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Propriétaires en gestion · Administration',
};

export default async function AdminOwnersPage({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const admin = await requireAdminAccess('/admin/proprietaires');
    if (!admin) {
        return <ErrorView status={403} />;
    }

    const sp = await searchParams;
    const search = firstParam(sp.search).trim();
    const page = parsePageParam(sp.page);
    const perPage = 25;

    // Récupérer les utilisateurs ayant le rôle host ou possédant au moins 1 logement
    const where: Prisma.UserWhereInput = {
        OR: [
            { role: 'host' },
            { properties: { some: {} } },
        ],
        ...(search
            ? {
                  AND: [
                      {
                          OR: [
                              { name: { contains: search, mode: 'insensitive' } },
                              { email: { contains: search, mode: 'insensitive' } },
                          ],
                      },
                  ],
              }
            : {}),
    };

    const [total, rows, totalPropertiesCount] = await Promise.all([
        prisma.user.count({ where }),
        prisma.user.findMany({
            where,
            orderBy: [{ createdAt: 'desc' }],
            skip: (page - 1) * perPage,
            take: perPage,
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true,
                suspendedAt: true,
                _count: {
                    select: { properties: true },
                },
            },
        }),
        prisma.property.count(),
    ]);

    const items: ManagedOwner[] = rows.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        created_at: u.createdAt ? u.createdAt.toISOString() : '',
        suspended_at: u.suspendedAt ? u.suspendedAt.toISOString() : null,
        properties_count: u._count.properties,
    }));

    const paginator = buildPaginated(
        items,
        total,
        page,
        perPage,
        '/admin/proprietaires',
        {
            search: search || undefined,
        },
    );

    return (
        <AdminLayout>
            <AdminOwnersClient
                owners={paginator}
                totalPropertiesCount={totalPropertiesCount}
                filters={{ search }}
            />
        </AdminLayout>
    );
}

