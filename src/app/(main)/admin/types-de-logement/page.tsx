import type { Metadata } from 'next';
import { ErrorView } from '@/components/error-view';
import { requireAdminAccess } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import type { AdminPropertyType } from '@/types';
import { AdminPropertyTypesClient } from './admin-property-types-client';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Types de logement · Administration',
};

export default async function AdminPropertyTypesPage() {
    const admin = await requireAdminAccess('/admin/types-de-logement');
    if (!admin) {
        return <ErrorView status={403} />;
    }

    const rows = await prisma.propertyType.findMany({
        include: { _count: { select: { properties: true } } },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    const propertyTypes: AdminPropertyType[] = rows.map((row) => ({
        id: row.id,
        slug: row.slug,
        name: row.name,
        is_active: row.isActive,
        sort_order: row.sortOrder,
        properties: row._count.properties,
    }));

    return <AdminPropertyTypesClient propertyTypes={propertyTypes} />;
}

