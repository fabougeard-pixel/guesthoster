import type { Metadata } from 'next';
import {
    AMENITY_CATEGORY_LABELS,
    type AmenityCategory,
} from '@/lib/domain/enums';
import { prisma } from '@/lib/prisma';
import type { AdminAmenity } from '@/types';
import { AdminAmenitiesClient } from './admin-amenities-client';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Équipements · Administration',
};

export default async function AdminAmenitiesPage() {
    const rows = await prisma.amenity.findMany({
        include: { _count: { select: { properties: true } } },
        orderBy: [
            { category: 'asc' },
            { sortOrder: 'asc' },
            { name: 'asc' },
        ],
    });

    const amenities: AdminAmenity[] = rows.map((row) => ({
        id: row.id,
        slug: row.slug,
        name: row.name,
        category: row.category,
        category_label:
            AMENITY_CATEGORY_LABELS[row.category as AmenityCategory] ??
            row.category,
        icon: row.icon,
        sort_order: row.sortOrder,
        properties: row._count.properties,
    }));

    return <AdminAmenitiesClient amenities={amenities} />;
}

