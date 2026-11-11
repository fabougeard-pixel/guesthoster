import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import type { AdminPropertyType } from '@/types';
import { AdminPropertyTypesClient } from './admin-property-types-client';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Types de logement · Administration',
};

export default async function AdminPropertyTypesPage() {
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

