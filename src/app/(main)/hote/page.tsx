import type { Metadata } from 'next';
import Link from 'next/link';
import { buttonClasses } from '@/components/button';
import { Card } from '@/components/card';
import { requireVerifiedUser } from '@/lib/auth/session';
import {
    PROPERTY_STATUS_LABELS,
    type PropertyStatus,
    type RentalDuration,
} from '@/lib/domain/enums';
import { resolveThumbnailUrl } from '@/lib/domain/properties';
import { parseDate, todayIso } from '@/lib/format';
import { prisma } from '@/lib/prisma';
import { HostPropertiesClient } from './host-properties-client';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Mes logements',
};

export default async function HostDashboardPage() {
    const user = await requireVerifiedUser();
    const todayDate = parseDate(todayIso());

    const rows = await prisma.property.findMany({
        where: user.role === 'admin' ? {} : { userId: user.id },
        include: {
            city: { select: { name: true } },
            images: {
                where: { processedAt: { not: null } },
                orderBy: { position: 'asc' },
                take: 1,
            },
            bookings: {
                where: {
                    status: 'confirmed',
                    checkOut: { gt: todayDate },
                },
                select: { id: true },
            },
        },
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
    });

    const properties = rows.map((row) => {
        const status = row.status as PropertyStatus;
        const cover = row.images[0];
        return {
            id: row.id,
            slug: row.slug,
            title: row.title,
            rental_duration: row.rentalDuration as RentalDuration,
            city: row.city?.name ?? null,
            status,
            status_label: PROPERTY_STATUS_LABELS[status] ?? status,
            price_per_night: row.pricePerNight,
            monthly_rent: row.monthlyRent,
            cover_url: cover
                ? resolveThumbnailUrl(
                    cover.thumbnailPath,
                    cover.path,
                    cover.cloudinaryPublicId,
                )
                : null,
            upcoming_bookings: row.bookings.length,
        };
    });

    const stats = {
        published: properties.filter((p) => p.status === 'published').length,
        pending: properties.filter((p) => p.status === 'pending').length,
        drafts: properties.filter(
            (p) => p.status === 'draft' || p.status === 'rejected',
        ).length,
        upcoming_bookings: properties.reduce(
            (sum, p) => sum + p.upcoming_bookings,
            0,
        ),
    };

    const tiles = [
        { label: 'En ligne', value: stats.published },
        { label: 'En validation', value: stats.pending },
        { label: 'Brouillons à compléter', value: stats.drafts },
        { label: 'Séjours à venir', value: stats.upcoming_bookings },
    ];

    return (
        <>
            <div className="flex flex-wrap items-center justify-between gap-4">
                <h1 className="text-2xl font-semibold">Mes logements</h1>
                <Link href="/hote/logements/nouveau" className={buttonClasses()}>
                    Ajouter un logement
                </Link>
            </div>

            <dl className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
                {tiles.map((tile) => (
                    <Card key={tile.label} className="p-5">
                        <dt className="text-sm text-zinc-500 dark:text-zinc-400">
                            {tile.label}
                        </dt>
                        <dd className="mt-1 text-3xl font-semibold">
                            {tile.value}
                        </dd>
                    </Card>
                ))}
            </dl>

            {properties.length === 0 ? (
                <Card className="mt-8 px-6 py-16 text-center">
                    <p className="font-medium">
                        Vous n’avez pas encore de logement.
                    </p>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        Décrivez votre logement en quelques étapes, nous le
                        validons puis il apparaît dans les recherches.
                    </p>
                    <Link
                        href="/hote/logements/nouveau"
                        className={buttonClasses({ className: 'mt-6' })}
                    >
                        Créer mon premier logement
                    </Link>
                </Card>
            ) : (
                <HostPropertiesClient properties={properties} />
            )}
        </>
    );
}

