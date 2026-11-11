import type { Metadata } from 'next';
import { PROPERTY_SORT_OPTIONS } from '@/lib/domain/enums';
import {
    parseSearchFilters,
    searchPublishedProperties,
} from '@/lib/domain/properties';
import { prisma } from '@/lib/prisma';
import { CatalogClient } from './catalog-client';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
    const sp = await searchParams;
    const filters = parseSearchFilters(sp);
    const cityLabel = filters.destination
        ? `${filters.destination.charAt(0).toUpperCase()}${filters.destination.slice(1)}`
        : null;
    const heading =
        filters.rental_duration === 'long_term'
            ? cityLabel
                ? `Locations longue durée à ${cityLabel}`
                : 'Locations longue durée'
            : cityLabel
              ? `Logements à ${cityLabel}`
              : 'Tous les logements';

    return {
        title: heading,
        description: `${heading} : comparez les prix, les équipements et les disponibilités, puis réservez en ligne sur GuestHoster.`,
    };
}

export default async function PropertiesPage({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const sp = await searchParams;
    const filters = parseSearchFilters(sp);
    const rawPage = Array.isArray(sp.page) ? sp.page[0] : sp.page;
    const page = rawPage && /^\d+$/.test(rawPage) ? Number.parseInt(rawPage, 10) : 1;

    const [{ properties, total }, types, amenities, cities] = await Promise.all([
        searchPublishedProperties(filters, page, 12),
        prisma.propertyType.findMany({
            where: { isActive: true },
            orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
            select: { slug: true, name: true },
        }),
        prisma.amenity.findMany({
            orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
            select: { slug: true, name: true },
        }),
        prisma.city.findMany({
            where: { isActive: true },
            orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
            select: { name: true },
        }),
    ]);

    const cityLabel = filters.destination
        ? `${filters.destination.charAt(0).toUpperCase()}${filters.destination.slice(1)}`
        : null;
    const heading =
        filters.rental_duration === 'long_term'
            ? cityLabel
                ? `Locations longue durée à ${cityLabel}`
                : 'Locations longue durée'
            : cityLabel
              ? `Logements à ${cityLabel}`
              : 'Tous les logements';

    return (
        <CatalogClient
            properties={properties}
            total={total}
            filters={filters}
            heading={heading}
            options={{
                types: types.map((t) => ({ value: t.slug, label: t.name })),
                sorts: PROPERTY_SORT_OPTIONS,
                amenities,
                destinations: cities.map((c) => c.name),
            }}
        />
    );
}

