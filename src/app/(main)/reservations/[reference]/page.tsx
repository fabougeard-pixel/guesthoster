import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ErrorView } from '@/components/error-view';
import { requireVerifiedUser } from '@/lib/auth/session';
import { serializeBooking } from '@/lib/domain/bookings';
import { prisma } from '@/lib/prisma';
import { BookingShowClient } from './booking-show-client';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
    params,
}: {
    params: Promise<{ reference: string }>;
}): Promise<Metadata> {
    const { reference } = await params;
    return { title: `Réservation ${reference}` };
}

export default async function BookingShowPage({
    params,
    searchParams,
}: {
    params: Promise<{ reference: string }>;
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const user = await requireVerifiedUser();
    const [{ reference }, sp] = await Promise.all([params, searchParams]);

    const record = await prisma.booking.findUnique({
        where: { reference },
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
    });

    if (!record) {
        notFound();
    }

    const canView =
        record.userId === user.id ||
        record.property.userId === user.id ||
        user.role === 'admin';

    if (!canView) {
        return <ErrorView status={403} />;
    }

    const booking = serializeBooking(record, user, { includeReview: true });
    return (
        <BookingShowClient booking={booking} justPaid={sp.paid === '1'} />
    );
}

