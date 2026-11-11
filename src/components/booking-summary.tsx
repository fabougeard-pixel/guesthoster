import Link from 'next/link';
import type { ReactNode } from 'react';
import { BookingStatusBadge } from '@/components/booking-status-badge';
import { Badge, Card } from '@/components/card';
import { formatDate, formatPrice, plural } from '@/lib/format';
import type { Booking } from '@/types';

export function BookingSummary({
    booking,
    actions,
}: {
    booking: Booking;
    actions?: ReactNode;
}) {
    return (
        <Card className="relative flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
            <div className="aspect-4/3 w-full shrink-0 overflow-hidden rounded-xl bg-zinc-100 sm:w-32 dark:bg-zinc-800">
                {booking.property.cover_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={booking.property.cover_url}
                        alt=""
                        className="size-full object-cover"
                    />
                )}
            </div>
            <div className="flex flex-1 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium">
                        <Link
                            href={`/reservations/${booking.reference}`}
                            className="after:absolute after:inset-0"
                        >
                            {booking.property.title}
                        </Link>
                    </h3>
                    <BookingStatusBadge
                        status={booking.status}
                        label={booking.status_label}
                    />
                    {booking.rental_duration === 'long_term' && (
                        <Badge tone="secondary">Longue durée</Badge>
                    )}
                </div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    {booking.rental_duration === 'long_term'
                        ? `Entrée le ${formatDate(booking.check_in)} · ${booking.advance_rent_months} mois d'avance · ${plural(booking.guests, 'occupant')}`
                        : `${formatDate(booking.check_in)} → ${formatDate(booking.check_out)} · ${plural(booking.nights, 'nuit')} · ${plural(booking.guests, 'voyageur')}`}
                </p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {booking.viewer === 'host'
                        ? `${booking.guest.name} · `
                        : `${booking.property.city ?? ''} · `}
                    {formatPrice(booking.total_price)} · {booking.reference}
                </p>
            </div>
            {actions && <div className="relative flex gap-2">{actions}</div>}
        </Card>
    );
}

