<?php

namespace App\Payments;

use App\Models\Booking;

/**
 * Payment provider used by bookings. Stripe in production, a fake in tests.
 */
interface PaymentGateway
{
    /**
     * @throws PaymentUnavailable
     */
    public function createCheckout(Booking $booking, string $successUrl, string $cancelUrl): CheckoutSession;

    /**
     * The checkout session if it has been paid, null otherwise.
     *
     * @throws PaymentUnavailable
     */
    public function findPaidCheckout(string $sessionId): ?PaidCheckout;

    /**
     * Refunds part or all of a payment and returns the refund identifier.
     *
     * @throws PaymentUnavailable
     */
    public function refund(string $paymentIntentId, int $amount, string $idempotencyKey): string;
}
