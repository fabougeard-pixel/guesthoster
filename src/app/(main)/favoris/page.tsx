import type { Metadata } from 'next';
import { requireAuthenticatedUser } from '@/lib/auth/session';
import { serializePropertyCard } from '@/lib/domain/properties';
import { prisma } from '@/lib/prisma';
import { FavoritesClient } from './favorites-client';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Mes favoris',
};

export default async function FavoritesPage() {
    const user = await requireAuthenticatedUser();

    const rows = await prisma.favorite.findMany({
        where: {
            userId: user.id,
            property: {
                status: 'published',
                owner: { is: { suspendedAt: null } },
            },
        },
        include: {
            property: {
                include: {
                    city: { include: { country: true } },
                    propertyType: true,
                    images: {
                        where: { processedAt: { not: null } },
                        orderBy: { position: 'asc' },
                        take: 1,
                    },
                },
            },
        },
        orderBy: { createdAt: 'desc' },
    });

    const properties = rows.map((row) => serializePropertyCard(row.property));

    return <FavoritesClient properties={properties} />;
}

