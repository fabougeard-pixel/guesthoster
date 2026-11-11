import { redirect } from 'next/navigation';
import { requireVerifiedUser } from '@/lib/auth/session';
import { confirmBookingPayment } from '@/lib/domain/bookings';
import { findPaidCheckout, isStripeConfigured } from '@/lib/services/stripe';

export const dynamic = 'force-dynamic';

export default async function BookingPaymentReturnPage({
    params,
    searchParams,
}: {
    params: Promise<{ reference: string }>;
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    await requireVerifiedUser();
    const [{ reference }, sp] = await Promise.all([params, searchParams]);
    const sessionId =
        typeof sp.session_id === 'string' ? sp.session_id.trim() : '';

    let confirmed = false;

    if (sessionId && isStripeConfigured()) {
        try {
            const paid = await findPaidCheckout(sessionId);
            if (paid && paid.bookingReference === reference) {
                const outcome = await confirmBookingPayment(paid);
                confirmed = outcome?.status === 'confirmed';
            }
        } catch (error) {
            console.warn('Retour Stripe Checkout :', error);
        }
    }

    redirect(
        confirmed
            ? `/reservations/${reference}?paid=1`
            : `/reservations/${reference}`,
    );
}

