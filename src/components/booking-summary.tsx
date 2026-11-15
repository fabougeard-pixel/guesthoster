import Link from 'next/link';
import type { ReactNode } from 'react';
import { BookingStatusBadge } from '@/components/booking-status-badge';
import { BookingTransferActions } from '@/components/booking-transfer-actions';
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
    const isHost = booking.viewer === 'host';
    const isBankTransfer = booking.payment_method === 'bank_transfer';
    const isAwaitingTransfer =
        booking.status === 'awaiting_payment' && isBankTransfer;

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
                            className="hover:underline"
                        >
                            {booking.property.title}
                        </Link>
                    </h3>
                    <BookingStatusBadge
                        status={booking.status}
                        label={booking.status_label}
                    />
                    {isBankTransfer && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-800 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800">
                            <span>💳</span>
                            <span>
                                {booking.transfer_type === 'instant'
                                    ? 'Virement instantané'
                                    : 'Virement SEPA'}
                            </span>
                        </span>
                    )}
                    {booking.transfer_receipt_url && (
                        <a
                            href={booking.transfer_receipt_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800 border border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                        >
                            <span>📄</span>
                            <span>Justificatif joint</span>
                        </a>
                    )}
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
                    {isHost
                        ? `${booking.guest.name} · `
                        : `${booking.property.city ?? ''} · `}
                    {formatPrice(booking.total_price)} · {booking.reference}
                </p>
            </div>
            {(actions || (isHost && isAwaitingTransfer)) && (
                <div className="relative flex flex-wrap items-center gap-2 self-start sm:self-center">
                    {actions}
                    {!actions && isHost && isAwaitingTransfer && (
                        <BookingTransferActions booking={booking} compact />
                    )}
                </div>
            )}
        </Card>
    );
}

