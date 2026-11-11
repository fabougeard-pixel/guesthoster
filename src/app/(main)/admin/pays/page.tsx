import type { Metadata } from 'next';
import { ErrorView } from '@/components/error-view';
import { requireAdminAccess } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import type { AdminCountry } from '@/types';
import { AdminCountriesClient } from './admin-countries-client';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Pays · Administration',
};

export default async function AdminCountriesPage() {
    const admin = await requireAdminAccess('/admin/pays');
    if (!admin) {
        return <ErrorView status={403} />;
    }

    const rows = await prisma.country.findMany({
        include: { _count: { select: { cities: true } } },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    const countries: AdminCountry[] = rows.map((row) => ({
        id: row.id,
        name: row.name,
        code: row.code,
        flag_emoji: row.flagEmoji,
        is_active: row.isActive,
        sort_order: row.sortOrder,
        cities: row._count.cities,
    }));

    return <AdminCountriesClient countries={countries} />;
}

