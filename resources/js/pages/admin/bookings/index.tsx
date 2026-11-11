import { Head, Link } from '@inertiajs/react';
import { applyFilters, DataTable, FilterBar } from '@/components/admin/filters';
import { BookingStatusBadge } from '@/components/booking-status-badge';
import { Select } from '@/components/form';
import { Pagination } from '@/components/pagination';
import { formatDate, formatPrice, plural } from '@/lib/format';
import { index } from '@/routes/admin/bookings';
import { show } from '@/routes/bookings';
import type { AdminBooking, BookingStatus, Option, Paginated } from '@/types';

type Props = {
    bookings: Paginated<AdminBooking>;
    filters: { status: BookingStatus | null; q: string | null };
    statuses: Option[];
};

export default function AdminBookings({ bookings, filters, statuses }: Props) {
    const filter = (query: Record<string, unknown>) =>
        applyFilters(index.url(), {
            statut: filters.status,
            q: filters.q,
            ...query,
        });

    return (
        <>
            <Head title="Réservations" />
            <h1 className="text-2xl font-semibold">Réservations</h1>

            <FilterBar
                search={filters.q}
                placeholder="Référence, voyageur, logement…"
                onSearch={(q) => filter({ q })}
                className="mt-6 mb-4"
            >
                <Select
                    aria-label="Statut"
                    value={filters.status ?? ''}
                    onChange={(event) => filter({ statut: event.target.value })}
                    className="sm:w-56"
                >
                    <option value="">Tous les statuts</option>
                    {statuses.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </Select>
            </FilterBar>

            <DataTable
                head={[
                    'Référence',
                    'Logement',
                    'Voyageur',
                    'Séjour',
                    'Montant',
                    'Statut',
                ]}
                empty={
                    bookings.data.length === 0 &&
                    'Aucune réservation ne correspond.'
                }
            >
                {bookings.data.map((booking) => (
                    <tr key={booking.reference}>
                        <td className="px-4 py-3 whitespace-nowrap">
                            <Link
                                href={show(booking.reference)}
                                className="font-mono font-medium text-primary-700 hover:underline dark:text-primary-400"
                            >
                                {booking.reference}
                            </Link>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                {booking.mode_label}
                            </p>
                        </td>
                        <td className="px-4 py-3">
                            <p className="font-medium">{booking.property}</p>
                            <p className="text-zinc-500 dark:text-zinc-400">
                                Hôte : {booking.host}
                            </p>
                        </td>
                        <td className="px-4 py-3">
                            <p>{booking.guest.name}</p>
                            <p className="text-zinc-500 dark:text-zinc-400">
                                {booking.guest.email}
                            </p>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                            {formatDate(booking.check_in, {
                                day: 'numeric',
                                month: 'short',
                            })}{' '}
                            → {formatDate(booking.check_out)}
                            <p className="text-zinc-500 dark:text-zinc-400">
                                {plural(booking.guests, 'voyageur')}
                            </p>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                            {formatPrice(booking.total_price)}
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                {booking.paid ? 'Payé' : 'Non payé'}
                                {booking.refunded_amount > 0 &&
                                    ` · ${formatPrice(booking.refunded_amount)} remboursés`}
                            </p>
                        </td>
                        <td className="px-4 py-3">
                            <BookingStatusBadge
                                status={booking.status}
                                label={booking.status_label}
                            />
                        </td>
                    </tr>
                ))}
            </DataTable>

            <Pagination paginator={bookings} noun="réservation" />
        </>
    );
}
