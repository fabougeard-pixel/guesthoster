import { Head, InfiniteScroll, Link } from '@inertiajs/react';
import { BookingResponse } from '@/components/booking-response';
import { BookingSummary } from '@/components/booking-summary';
import { Card } from '@/components/card';
import { cn } from '@/lib/utils';
import { index } from '@/routes/host/bookings';
import type { Booking } from '@/types';

type Props = {
    filter: string;
    filters: { value: string; label: string; count: number | null }[];
    bookings: { data: Booking[] };
};

const emptyMessages: Record<string, string> = {
    demandes: 'Aucune demande en attente.',
    'a-venir': 'Aucun séjour à venir.',
    historique: 'Aucune réservation passée.',
};

export default function HostBookings({ filter, filters, bookings }: Props) {
    return (
        <>
            <Head title="Réservations reçues" />
            <h1 className="text-2xl font-semibold">Réservations reçues</h1>

            <nav
                aria-label="Filtrer les réservations"
                className="mt-6 flex gap-2 border-b border-zinc-200 dark:border-zinc-800"
            >
                {filters.map((item) => (
                    <Link
                        key={item.value}
                        href={index({ query: { filtre: item.value } })}
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
                    <InfiniteScroll
                        data="bookings"
                        onlyNext
                        className="flex flex-col gap-4"
                    >
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
                    </InfiniteScroll>
                )}
            </div>
        </>
    );
}
