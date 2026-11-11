<?php

namespace App\Payments;

use App\Models\Booking;
use Carbon\CarbonImmutable;
use Stripe\Checkout\Session;
use Stripe\Exception\ApiErrorException;
use Stripe\StripeClient;

/**
 * Stripe Checkout (hosted payment page) and refunds, through stripe-php only.
 */
class StripePaymentGateway implements PaymentGateway
{
    private ?StripeClient $client = null;

    public function __construct(
        private ?string $secret,
        private string $currency = 'eur',
    ) {}

    public function createCheckout(Booking $booking, string $successUrl, string $cancelUrl): CheckoutSession
    {
        $booking->loadMissing(['property', 'guest']);

        // Stripe accepts an expiry between 30 minutes and 24 hours from now.
        $expiresAt = CarbonImmutable::now()->addHours(24)
            ->min($booking->expires_at ?? CarbonImmutable::now()->addHours(24))
            ->max(CarbonImmutable::now()->addMinutes(31));

        $session = $this->call(fn (StripeClient $stripe): Session => $stripe->checkout->sessions->create([
            'mode' => 'payment',
            'locale' => 'fr',
            'customer_email' => $booking->guest->email,
            'client_reference_id' => $booking->reference,
            'metadata' => ['booking_reference' => $booking->reference],
            'payment_intent_data' => ['metadata' => ['booking_reference' => $booking->reference]],
            'line_items' => [[
                'quantity' => 1,
                'price_data' => [
                    'currency' => $this->currency,
                    'unit_amount' => $booking->total_price,
                    'product_data' => [
                        'name' => "Séjour · {$booking->property->title}",
                        'description' => sprintf(
                            'Du %s au %s · %d nuit(s) · réservation %s',
                            $booking->check_in->translatedFormat('j F Y'),
                            $booking->check_out->translatedFormat('j F Y'),
                            $booking->nights,
                            $booking->reference,
                        ),
                    ],
                ],
            ]],
            'expires_at' => $expiresAt->getTimestamp(),
            'success_url' => $successUrl,
            'cancel_url' => $cancelUrl,
        ], ['idempotency_key' => "checkout-{$booking->reference}-".$expiresAt->getTimestamp()]));

        return new CheckoutSession($session->id, (string) $session->url);
    }

    public function findPaidCheckout(string $sessionId): ?PaidCheckout
    {
        $session = $this->call(fn (StripeClient $stripe): Session => $stripe->checkout->sessions->retrieve($sessionId));

        return self::paidCheckoutFrom($session);
    }

    public function refund(string $paymentIntentId, int $amount, string $idempotencyKey): string
    {
        return $this->call(fn (StripeClient $stripe): string => $stripe->refunds->create(
            ['payment_intent' => $paymentIntentId, 'amount' => $amount],
            ['idempotency_key' => $idempotencyKey],
        )->id);
    }

    /**
     * Reads a Checkout session (from the API or a webhook event).
     */
    public static function paidCheckoutFrom(Session $session): ?PaidCheckout
    {
        $reference = $session->metadata['booking_reference'] ?? $session->client_reference_id;
        $paymentIntent = $session->payment_intent;

        if ($session->payment_status !== 'paid' || ! is_string($reference) || $paymentIntent === null) {
            return null;
        }

        return new PaidCheckout(
            sessionId: $session->id,
            bookingReference: $reference,
            paymentIntentId: is_string($paymentIntent) ? $paymentIntent : $paymentIntent->id,
            amountTotal: (int) $session->amount_total,
        );
    }

    /**
     * @template TResult
     *
     * @param  callable(StripeClient): TResult  $callback
     * @return TResult
     *
     * @throws PaymentUnavailable
     */
    private function call(callable $callback): mixed
    {
        if (blank($this->secret)) {
            throw new PaymentUnavailable('Le paiement en ligne n’est pas configuré (STRIPE_SECRET manquant).');
        }

        try {
            return $callback($this->client ??= new StripeClient($this->secret));
        } catch (ApiErrorException $exception) {
            report($exception);

            throw new PaymentUnavailable('Le service de paiement est momentanément indisponible.', previous: $exception);
        }
    }
}
