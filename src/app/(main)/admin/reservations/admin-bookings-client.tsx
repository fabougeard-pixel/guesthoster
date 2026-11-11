'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BOOKING_STATUS_OPTIONS } from '@/lib/domain/enums';
import { formatDate, formatPrice, plural } from '@/lib/format';
import {
    DataTable,
    FilterBar,
    buildFilterUrl,
} from '@/components/admin/filters';
import { BookingStatusBadge } from '@/components/booking-status-badge';
import { Select } from '@/components/form';
import { Pagination } from '@/components/pagination';
import type { AdminBooking, Paginated } from '@/types';

type Props = {
    bookings: Paginated<AdminBooking>;
    filters: {
        search: string;
        status: string;
    };
};

export function AdminBookingsClient({ bookings, filters }: Props) {
    const router = useRouter();

    function applyFilter(next: Partial<Props['filters']>) {
        const merged = { ...filters, ...next };
        router.push(
            buildFilterUrl('/admin/reservations', {
                search: merged.search || undefined,
                status: merged.status || undefined,
            }),
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">
                    Réservations
                </h1>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    Suivi global des demandes, séjours et encaissements.
                </p>
            </div>

            <FilterBar
                key={`${filters.search}:${filters.status}`}
                search={filters.search}
                placeholder="Référence, logement, voyageur ou hôte…"
                onSearch={(search) => applyFilter({ search })}
            >
                <Select
                    aria-label="Filtrer par statut"
                    className="sm:w-56"
                    value={filters.status}
                    onChange={(event) => applyFilter({ status: event.target.value })}
                >
                    <option value="">Tous les statuts</option>
                    {BOOKING_STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </Select>
            </FilterBar>

            <DataTable
                head={[
                    'Référence',
                    'Logement & hôte',
                    'Voyageur',
                    'Séjour',
                    'Montant',
                    'Statut',
                ]}
                empty={
                    bookings.data.length === 0
                        ? 'Aucune réservation correspondante.'
                        : false
                }
            >
                {bookings.data.map((booking) => (
                    <tr key={booking.reference}>
                        <td className="px-4 py-3 whitespace-nowrap">
                            <Link
                                href={`/reservations/${booking.reference}`}
                                className="font-mono text-xs font-semibold text-primary-700 hover:underline dark:text-primary-400"
                            >
                                {booking.reference}
                            </Link>
                            <p className="mt-0.5 text-xs text-zinc-500">
                                {booking.mode_label}
                            </p>
                        </td>
                        <td className="px-4 py-3">
                            <p className="font-medium text-zinc-900 dark:text-zinc-100">
                                {booking.property}
                            </p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                Hôte : {booking.host}
                            </p>
                        </td>
                        <td className="px-4 py-3">
                            <p className="font-medium text-zinc-900 dark:text-zinc-100">
                                {booking.guest.name}
                            </p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                {booking.guest.email}
                            </p>
                        </td>
                        <td className="px-4 py-3 text-xs whitespace-nowrap text-zinc-600 dark:text-zinc-300">
                            <p>
                                {formatDate(booking.check_in)} →{' '}
                                {formatDate(booking.check_out)}
                            </p>
                            <p className="text-zinc-500 dark:text-zinc-400">
                                {plural(booking.guests, 'voyageur')}
                            </p>
                        </td>
                        <td className="px-4 py-3 text-xs whitespace-nowrap tabular-nums">
                            <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                                {formatPrice(booking.total_price)}
                            </p>
                            <p className="text-zinc-500 dark:text-zinc-400">
                                {booking.paid ? 'Payée' : 'Non payée'}
                                {booking.refunded_amount > 0
                                    ? ` · ${formatPrice(booking.refunded_amount)} remboursés`
                                    : ''}
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

            <Pagination
                paginator={bookings}
                noun="réservation"
                nounPlural="réservations"
            />
        </div>
    );
}

