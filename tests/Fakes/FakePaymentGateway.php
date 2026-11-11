<?php

namespace Tests\Fakes;

use App\Models\Booking;
use App\Payments\CheckoutSession;
use App\Payments\PaidCheckout;
use App\Payments\PaymentGateway;
use App\Payments\PaymentUnavailable;

/**
 * In-memory payment provider for tests.
 */
class FakePaymentGateway implements PaymentGateway
{
    /** @var list<array{booking: string, success: string, cancel: string}> */
    public array $checkouts = [];

    /** @var array<string, PaidCheckout> */
    public array $paidSessions = [];

    /** @var list<array{payment_intent: string, amount: int, key: string}> */
    public array $refunds = [];

    public bool $unavailable = false;

    public function createCheckout(Booking $booking, string $successUrl, string $cancelUrl): CheckoutSession
    {
        $this->failIfUnavailable();
        $this->checkouts[] = ['booking' => $booking->reference, 'success' => $successUrl, 'cancel' => $cancelUrl];

        return new CheckoutSession('cs_test_'.count($this->checkouts), 'https://checkout.stripe.test/pay/cs_test_'.count($this->checkouts));
    }

    public function findPaidCheckout(string $sessionId): ?PaidCheckout
    {
        $this->failIfUnavailable();

        return $this->paidSessions[$sessionId] ?? null;
    }

    public function refund(string $paymentIntentId, int $amount, string $idempotencyKey): string
    {
        $this->failIfUnavailable();
        $this->refunds[] = ['payment_intent' => $paymentIntentId, 'amount' => $amount, 'key' => $idempotencyKey];

        return 're_test_'.count($this->refunds);
    }

    public function markPaid(Booking $booking, string $sessionId = 'cs_test_1', ?int $amount = null): void
    {
        $this->paidSessions[$sessionId] = new PaidCheckout($sessionId, $booking->reference, 'pi_'.$booking->reference, $amount ?? $booking->total_price);
    }

    private function failIfUnavailable(): void
    {
        if ($this->unavailable) {
            throw new PaymentUnavailable('Le service de paiement est momentanément indisponible.');
        }
    }
}
