import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { confirmBookingPayment } from '@/lib/domain/bookings';
import { prisma } from '@/lib/prisma';
import {
    constructStripeWebhookEvent,
    isStripeConfigured,
    paidCheckoutFromSession,
} from '@/lib/services/stripe';

export const runtime = 'nodejs';

export async function POST(request: Request) {
    if (!isStripeConfigured()) {
        return NextResponse.json(
            { error: 'Stripe non configuré.' },
            { status: 503 },
        );
    }

    const signature = request.headers.get('stripe-signature');
    if (!signature) {
        return NextResponse.json(
            { error: 'Signature Stripe manquante.' },
            { status: 400 },
        );
    }

    const rawBody = await request.text();

    let event: Stripe.Event;
    try {
        event = constructStripeWebhookEvent(rawBody, signature);
    } catch (error) {
        console.warn('Webhook Stripe invalide :', error);
        return NextResponse.json(
            { error: 'Signature Stripe invalide.' },
            { status: 400 },
        );
    }

    const existing = await prisma.stripeEvent.findUnique({
        where: { id: event.id },
        select: { id: true },
    });

    if (existing) {
        return NextResponse.json({ received: true, duplicate: true });
    }

    if (
        event.type === 'checkout.session.completed' ||
        event.type === 'checkout.session.async_payment_succeeded'
    ) {
        const session = event.data.object as Stripe.Checkout.Session;
        const paid = paidCheckoutFromSession(session);
        if (paid) {
            await confirmBookingPayment(paid);
        }
    }

    try {
        await prisma.stripeEvent.create({
            data: {
                id: event.id,
                type: event.type,
                processedAt: new Date(),
            },
        });
    } catch {
        // Enregistrement déjà créé par un appel concurrent
    }

    return NextResponse.json({ received: true });
}

