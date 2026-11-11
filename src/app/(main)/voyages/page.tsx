import type { Metadata } from 'next';
import Link from 'next/link';
import { BookingSummary } from '@/components/booking-summary';
import { buttonClasses } from '@/components/button';
import { Card, Container } from '@/components/card';
import { requireVerifiedUser } from '@/lib/auth/session';
import { serializeBooking } from '@/lib/domain/bookings';
import { todayIso } from '@/lib/format';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Mes voyages',
};

const activeStatuses = ['pending', 'awaiting_payment', 'confirmed'];

export default async function TripsPage() {
    const user = await requireVerifiedUser();

    const rows = await prisma.booking.findMany({
        where: { userId: user.id },
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
        orderBy: [{ checkIn: 'desc' }, { id: 'desc' }],
    });

    const bookings = rows.map((row) => serializeBooking(row, user));
    const today = todayIso();

    const upcoming = bookings
        .filter(
            (booking) =>
                activeStatuses.includes(booking.status) &&
                booking.check_out > today,
        )
        .reverse();

    const upcomingRefs = new Set(upcoming.map((b) => b.reference));
    const others = bookings.filter((b) => !upcomingRefs.has(b.reference));

    return (
        <Container className="flex flex-col gap-10 py-10">
            <h1 className="text-2xl font-semibold">Mes voyages</h1>

            <section
                className="flex flex-col gap-4"
                aria-labelledby="upcoming"
            >
                <h2 id="upcoming" className="text-lg font-semibold">
                    À venir
                </h2>
                {upcoming.length === 0 ? (
                    <Card className="px-6 py-12 text-center">
                        <p className="font-medium">
                            Aucun voyage prévu pour l’instant.
                        </p>
                        <Link
                            href="/logements"
                            className={buttonClasses({ className: 'mt-5' })}
                        >
                            Trouver un logement
                        </Link>
                    </Card>
                ) : (
                    upcoming.map((booking) => (
                        <BookingSummary
                            key={booking.reference}
                            booking={booking}
                        />
                    ))
                )}
            </section>

            {others.length > 0 && (
                <section
                    className="flex flex-col gap-4"
                    aria-labelledby="history"
                >
                    <h2 id="history" className="text-lg font-semibold">
                        Passés et annulés
                    </h2>
                    {others.map((booking) => (
                        <BookingSummary
                            key={booking.reference}
                            booking={booking}
                        />
                    ))}
                </section>
            )}
        </Container>
    );
}

