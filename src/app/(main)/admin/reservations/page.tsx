import type { Metadata } from 'next';
import type { Prisma } from '@prisma/client';
import {
    BOOKING_MODE_LABELS,
    BOOKING_STATUS_LABELS,
    BOOKING_STATUSES,
    type BookingMode,
    type BookingStatus,
} from '@/lib/domain/enums';
import { buildPaginated } from '@/lib/domain/properties';
import { toIsoDate } from '@/lib/format';
import { prisma } from '@/lib/prisma';
import { firstParam, parsePageParam } from '@/lib/search-params';
import type { AdminBooking } from '@/types';
import { AdminBookingsClient } from './admin-bookings-client';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Réservations · Administration',
};

export default async function AdminBookingsPage({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const sp = await searchParams;
    const search = firstParam(sp.search).trim();
    const rawStatus = firstParam(sp.status).trim();
    const status = (BOOKING_STATUSES as readonly string[]).includes(rawStatus)
        ? (rawStatus as BookingStatus)
        : '';
    const page = parsePageParam(sp.page);
    const perPage = 25;

    const where: Prisma.BookingWhereInput = {
        ...(status ? { status } : {}),
        ...(search
            ? {
                  OR: [
                      { reference: { contains: search, mode: 'insensitive' } },
                      {
                          property: {
                              title: { contains: search, mode: 'insensitive' },
                          },
                      },
                      {
                          property: {
                              owner: {
                                  name: { contains: search, mode: 'insensitive' },
                              },
                          },
                      },
                      {
                          guest: {
                              name: { contains: search, mode: 'insensitive' },
                          },
                      },
                      {
                          guest: {
                              email: { contains: search, mode: 'insensitive' },
                          },
                      },
                  ],
              }
            : {}),
    };

    const [total, rows] = await Promise.all([
        prisma.booking.count({ where }),
        prisma.booking.findMany({
            where,
            include: {
                property: {
                    select: {
                        title: true,
                        owner: { select: { name: true } },
                    },
                },
                guest: { select: { name: true, email: true } },
            },
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            skip: (page - 1) * perPage,
            take: perPage,
        }),
    ]);

    const items: AdminBooking[] = rows.map((row) => {
        const bookingStatus = row.status as BookingStatus;
        const bookingMode = row.bookingMode as BookingMode;

        return {
            reference: row.reference,
            status: bookingStatus,
            status_label: BOOKING_STATUS_LABELS[bookingStatus] ?? row.status,
            mode_label: BOOKING_MODE_LABELS[bookingMode] ?? row.bookingMode,
            check_in: toIsoDate(row.checkIn),
            check_out: toIsoDate(row.checkOut),
            guests: row.guests,
            total_price: row.totalPrice,
            service_fee: row.serviceFee,
            refunded_amount: row.refundedAmount,
            paid: Boolean(row.paidAt),
            property: row.property.title,
            host: row.property.owner.name,
            guest: {
                name: row.guest.name,
                email: row.guest.email,
            },
            created_at: row.createdAt?.toISOString() ?? null,
        };
    });

    const paginator = buildPaginated(
        items,
        total,
        page,
        perPage,
        '/admin/reservations',
        {
            search: search || undefined,
            status: status || undefined,
        },
    );

    return (
        <AdminBookingsClient
            bookings={paginator}
            filters={{ search, status }}
        />
    );
}

