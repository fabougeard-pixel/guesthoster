<?php

namespace App\Payments;

/**
 * A completed and paid checkout, as reported by the provider.
 */
final readonly class PaidCheckout
{
    public function __construct(
        public string $sessionId,
        public string $bookingReference,
        public string $paymentIntentId,
        public int $amountTotal,
    ) {}
}
