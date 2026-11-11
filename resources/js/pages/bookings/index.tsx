import { Head, Link } from '@inertiajs/react';
import { buttonClasses } from '@/components/button';
import { BookingSummary } from '@/components/booking-summary';
import { Card, Container } from '@/components/card';
import { todayIso } from '@/lib/format';
import { index as searchProperties } from '@/routes/properties';
import type { Booking } from '@/types';

const activeStatuses = ['pending', 'awaiting_payment', 'confirmed'];

export default function Trips({ bookings }: { bookings: Booking[] }) {
    const today = todayIso();
    const upcoming = bookings
        .filter(
            (booking) =>
                activeStatuses.includes(booking.status) &&
                booking.check_out > today,
        )
        .reverse();
    const others = bookings.filter((booking) => !upcoming.includes(booking));

    return (
        <>
            <Head title="Mes voyages" />
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
                                href={searchProperties()}
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
        </>
    );
}
