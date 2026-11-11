import Stripe from 'stripe';
import { env } from '@/lib/env';
import { formatLongDateFr } from '@/lib/format';

export type PaidCheckout = {
    sessionId: string;
    bookingReference: string;
    paymentIntentId: string;
    amountTotal: number;
};

let stripeClient: Stripe | null = null;

export function getStripeClient(): Stripe {
    const secret = env.stripeSecret;
    if (!secret) {
        throw new Error(
            'Le paiement Stripe n’est pas configuré sur ce serveur.',
        );
    }

    if (!stripeClient) {
        stripeClient = new Stripe(secret);
    }

    return stripeClient;
}

export function isStripeConfigured(): boolean {
    return Boolean(env.stripeSecret);
}

export async function createCheckoutSession({
    booking,
    successUrl,
    cancelUrl,
}: {
    booking: {
        reference: string;
        totalPrice: number;
        nights: number;
        checkIn: string;
        checkOut: string;
        expiresAt: Date | null;
        guestEmail: string;
        propertyTitle: string;
    };
    successUrl: string;
    cancelUrl: string;
}): Promise<{ id: string; url: string }> {
    const stripe = getStripeClient();

    const nowSec = Math.floor(Date.now() / 1000);
    const minExp = nowSec + 31 * 60;
    const maxExp = nowSec + 24 * 60 * 60;
    const targetExp = booking.expiresAt
        ? Math.floor(booking.expiresAt.getTime() / 1000)
        : maxExp;
    const expiresAt = Math.max(minExp, Math.min(maxExp, targetExp));

    const session = await stripe.checkout.sessions.create(
        {
            mode: 'payment',
            locale: 'fr',
            customer_email: booking.guestEmail,
            client_reference_id: booking.reference,
            metadata: { booking_reference: booking.reference },
            payment_intent_data: {
                metadata: { booking_reference: booking.reference },
            },
            line_items: [
                {
                    quantity: 1,
                    price_data: {
                        currency: env.stripeCurrency,
                        unit_amount: booking.totalPrice,
                        product_data: {
                            name: `Séjour · ${booking.propertyTitle}`,
                            description: `Du ${formatLongDateFr(booking.checkIn)} au ${formatLongDateFr(booking.checkOut)} · ${booking.nights} nuit(s) · réservation ${booking.reference}`,
                        },
                    },
                },
            ],
            expires_at: expiresAt,
            success_url: successUrl,
            cancel_url: cancelUrl,
        },
        {
            idempotencyKey: `checkout-${booking.reference}-${expiresAt}`,
        },
    );

    if (!session.url) {
        throw new Error('Stripe Checkout URL manquante.');
    }

    return { id: session.id, url: session.url };
}

export function paidCheckoutFromSession(
    session: Stripe.Checkout.Session,
): PaidCheckout | null {
    const reference =
        session.metadata?.booking_reference ?? session.client_reference_id;
    const paymentIntent = session.payment_intent;

    if (
        session.payment_status !== 'paid' ||
        typeof reference !== 'string' ||
        !paymentIntent
    ) {
        return null;
    }

    const paymentIntentId =
        typeof paymentIntent === 'string' ? paymentIntent : paymentIntent.id;

    return {
        sessionId: session.id,
        bookingReference: reference,
        paymentIntentId,
        amountTotal: Number(session.amount_total ?? 0),
    };
}

export async function findPaidCheckout(
    sessionId: string,
): Promise<PaidCheckout | null> {
    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    return paidCheckoutFromSession(session);
}

export async function refundPayment(
    paymentIntentId: string,
    amount: number,
    idempotencyKey: string,
): Promise<string> {
    const stripe = getStripeClient();
    const refund = await stripe.refunds.create(
        {
            payment_intent: paymentIntentId,
            amount,
        },
        { idempotencyKey },
    );

    return refund.id;
}

export function constructStripeWebhookEvent(
    rawBody: string,
    signature: string,
): Stripe.Event {
    const webhookSecret = env.stripeWebhookSecret;
    if (!webhookSecret) {
        throw new Error('STRIPE_WEBHOOK_SECRET non configuré.');
    }

    return getStripeClient().webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret,
    );
}

