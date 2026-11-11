import type { Metadata } from 'next';
import type { Prisma } from '@prisma/client';
import { ErrorView } from '@/components/error-view';
import { requireAdminAccess } from '@/lib/auth/session';
import { buildPaginated } from '@/lib/domain/properties';
import { prisma } from '@/lib/prisma';
import { firstParam, parsePageParam } from '@/lib/search-params';
import type { AdminCity } from '@/types';
import { AdminCitiesClient } from './admin-cities-client';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Villes · Administration',
};

export default async function AdminCitiesPage({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const admin = await requireAdminAccess('/admin/villes');
    if (!admin) {
        return <ErrorView status={403} />;
    }

    const sp = await searchParams;
    const search = firstParam(sp.search).trim();
    const rawCountry = firstParam(sp.country).trim();
    const countryId = /^\d+$/.test(rawCountry)
        ? Number.parseInt(rawCountry, 10)
        : 0;
    const page = parsePageParam(sp.page);
    const perPage = 25;

    const where: Prisma.CityWhereInput = {
        ...(countryId > 0 ? { countryId } : {}),
        ...(search
            ? {
                  OR: [
                      { name: { contains: search, mode: 'insensitive' } },
                      {
                          country: {
                              name: { contains: search, mode: 'insensitive' },
                          },
                      },
                  ],
              }
            : {}),
    };

    const [countries, total, rows] = await Promise.all([
        prisma.country.findMany({
            select: { id: true, name: true },
            orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        }),
        prisma.city.count({ where }),
        prisma.city.findMany({
            where,
            include: {
                country: { select: { name: true } },
                _count: { select: { properties: true } },
            },
            orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
            skip: (page - 1) * perPage,
            take: perPage,
        }),
    ]);

    const items: AdminCity[] = rows.map((row) => ({
        id: row.id,
        country_id: row.countryId,
        country: row.country.name,
        name: row.name,
        latitude: row.latitude !== null ? Number(row.latitude) : null,
        longitude: row.longitude !== null ? Number(row.longitude) : null,
        is_popular: row.isPopular,
        is_active: row.isActive,
        sort_order: row.sortOrder,
        properties: row._count.properties,
    }));

    const paginator = buildPaginated(items, total, page, perPage, '/admin/villes', {
        search: search || undefined,
        country: countryId > 0 ? String(countryId) : undefined,
    });

    return (
        <AdminCitiesClient
            cities={paginator}
            countries={countries}
            filters={{
                search,
                country: countryId > 0 ? String(countryId) : '',
            }}
        />
    );
}

