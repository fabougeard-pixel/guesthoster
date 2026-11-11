import type { Metadata } from 'next';
import Link from 'next/link';
import type { Prisma } from '@prisma/client';
import { BookingResponse } from '@/components/booking-response';
import { BookingSummary } from '@/components/booking-summary';
import { Card } from '@/components/card';
import { Pagination } from '@/components/pagination';
import { requireVerifiedUser } from '@/lib/auth/session';
import { serializeBooking } from '@/lib/domain/bookings';
import { buildPaginated } from '@/lib/domain/properties';
import { parseDate, todayIso } from '@/lib/format';
import { prisma } from '@/lib/prisma';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Réservations reçues',
};

type HostBookingFilter = 'demandes' | 'a-venir' | 'historique';

const emptyMessages: Record<HostBookingFilter, string> = {
    demandes: 'Aucune demande en attente.',
    'a-venir': 'Aucun séjour à venir.',
    historique: 'Aucune réservation passée.',
};

export default async function HostBookingsPage({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const user = await requireVerifiedUser();
    const sp = await searchParams;
    const rawFilter = Array.isArray(sp.filtre) ? sp.filtre[0] : sp.filtre;
    const filter: HostBookingFilter =
        rawFilter === 'a-venir' || rawFilter === 'historique'
            ? rawFilter
            : 'demandes';

    const rawPage = Array.isArray(sp.page) ? sp.page[0] : sp.page;
    const page =
        rawPage && /^\d+$/.test(rawPage)
            ? Math.max(1, Number.parseInt(rawPage, 10))
            : 1;
    const perPage = 15;
    const todayDate = parseDate(todayIso());

    const baseWhere: Prisma.BookingWhereInput = {
        property: { userId: user.id },
    };

    const requestsWhere: Prisma.BookingWhereInput = {
        ...baseWhere,
        status: 'pending',
    };

    const upcomingWhere: Prisma.BookingWhereInput = {
        ...baseWhere,
        status: { in: ['awaiting_payment', 'confirmed'] },
        checkOut: { gt: todayDate },
    };

    const historyWhere: Prisma.BookingWhereInput = {
        ...baseWhere,
        OR: [
            { status: { in: ['declined', 'cancelled', 'expired', 'completed'] } },
            {
                status: { in: ['awaiting_payment', 'confirmed'] },
                checkOut: { lte: todayDate },
            },
        ],
    };

    const activeWhere =
        filter === 'demandes'
            ? requestsWhere
            : filter === 'a-venir'
              ? upcomingWhere
              : historyWhere;

    const [demandesCount, upcomingCount, total, rows] = await Promise.all([
        prisma.booking.count({ where: requestsWhere }),
        prisma.booking.count({ where: upcomingWhere }),
        prisma.booking.count({ where: activeWhere }),
        prisma.booking.findMany({
            where: activeWhere,
            include: {
                guest: { select: { id: true, name: true, email: true } },
                property: {
                    include: {
                        city: { include: { country: true } },
                        owner: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                suspendedAt: true,
                            },
                        },
                        images: {
                            where: { processedAt: { not: null } },
                            orderBy: { position: 'asc' },
                            take: 1,
                        },
                    },
                },
                review: { include: { author: { select: { name: true } } } },
            },
            orderBy:
                filter === 'a-venir'
                    ? [{ checkIn: 'asc' }, { id: 'desc' }]
                    : [{ createdAt: 'desc' }, { id: 'desc' }],
            skip: (page - 1) * perPage,
            take: perPage,
        }),
    ]);

    const filters: {
        value: HostBookingFilter;
        label: string;
        count: number | null;
    }[] = [
        { value: 'demandes', label: 'Demandes en attente', count: demandesCount },
        { value: 'a-venir', label: 'À venir', count: upcomingCount },
        { value: 'historique', label: 'Historique', count: null },
    ];

    const bookings = buildPaginated(
        rows.map((row) => serializeBooking(row, user)),
        total,
        page,
        perPage,
        '/hote/reservations',
        filter !== 'demandes' ? { filtre: filter } : undefined,
    );

    return (
        <>
            <h1 className="text-2xl font-semibold">Réservations reçues</h1>

            <nav
                aria-label="Filtrer les réservations"
                className="mt-6 flex gap-2 border-b border-zinc-200 dark:border-zinc-800"
            >
                {filters.map((item) => (
                    <Link
                        key={item.value}
                        href={`/hote/reservations?filtre=${item.value}`}
                        aria-current={
                            item.value === filter ? 'page' : undefined
                        }
                        className={cn(
                            '-mb-px border-b-2 px-3 py-2 text-sm font-medium',
                            item.value === filter
                                ? 'border-primary-600 text-zinc-900 dark:text-zinc-100'
                                : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100',
                        )}
                    >
                        {item.label}
                        {item.count !== null && item.count > 0 && (
                            <span className="ml-2 rounded-full bg-zinc-100 px-2 py-0.5 text-xs dark:bg-zinc-800">
                                {item.count}
                            </span>
                        )}
                    </Link>
                ))}
            </nav>

            <div className="mt-6">
                {bookings.data.length === 0 ? (
                    <Card className="px-6 py-12 text-center text-zinc-600 dark:text-zinc-400">
                        {emptyMessages[filter]}
                    </Card>
                ) : (
                    <>
                        <div className="flex flex-col gap-4">
                            {bookings.data.map((booking) => (
                                <BookingSummary
                                    key={booking.reference}
                                    booking={booking}
                                    actions={
                                        booking.can.respond ? (
                                            <BookingResponse booking={booking} />
                                        ) : undefined
                                    }
                                />
                            ))}
                        </div>
                        <Pagination
                            paginator={bookings}
                            noun="réservation"
                        />
                    </>
                )}
            </div>
        </>
    );
}

