<?php

namespace App\Actions\Bookings;

use App\Enums\BookingStatus;
use App\Models\Booking;
use App\Notifications\BookingConfirmed;
use App\Notifications\BookingPaymentRefunded;
use App\Payments\PaidCheckout;
use App\Payments\PaymentGateway;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Records a successful payment, from the webhook or from the return page,
 * whichever comes first. A payment arriving after the booking expired or was
 * cancelled is refunded in full, since the dates are no longer held.
 */
class ConfirmBookingPayment
{
    public function __construct(private PaymentGateway $payments) {}

    public function handle(PaidCheckout $checkout): ?Booking
    {
        $outcome = DB::transaction(function () use ($checkout): ?array {
            $booking = Booking::query()->where('reference', $checkout->bookingReference)->lockForUpdate()->first();

            if ($booking === null) {
                Log::warning('Paiement Stripe pour une réservation inconnue.', ['reference' => $checkout->bookingReference]);

                return null;
            }

            if ($booking->stripe_payment_intent_id === $checkout->paymentIntentId) {
                return [$booking, 'already-recorded'];
            }

            $booking->forceFill([
                'stripe_checkout_session_id' => $checkout->sessionId,
                'stripe_payment_intent_id' => $checkout->paymentIntentId,
                'paid_at' => now(),
            ]);

            if ($booking->status !== BookingStatus::AwaitingPayment || $checkout->amountTotal !== $booking->total_price) {
                $booking->save();

                return [$booking, 'refund'];
            }

            $booking->transitionTo(BookingStatus::Confirmed);

            return [$booking, 'confirmed'];
        });

        if ($outcome === null) {
            return null;
        }

        [$booking, $result] = $outcome;
        $booking->loadMissing(['guest', 'property.owner']);

        if ($result === 'confirmed') {
            $booking->guest->notify(new BookingConfirmed($booking, 'guest'));
            $booking->property->owner->notify(new BookingConfirmed($booking, 'host'));
        }

        if ($result === 'refund') {
            $this->refundLatePayment($booking, $checkout);
        }

        return $booking;
    }

    private function refundLatePayment(Booking $booking, PaidCheckout $checkout): void
    {
        Log::notice('Paiement reçu pour une réservation qui ne l’attendait plus : remboursement.', [
            'reference' => $booking->reference,
            'status' => $booking->status->value,
        ]);

        $refundId = $this->payments->refund($checkout->paymentIntentId, $checkout->amountTotal, "late-payment-{$checkout->paymentIntentId}");

        $booking->forceFill([
            'refunded_amount' => $checkout->amountTotal,
            'stripe_refund_id' => $refundId,
            'refunded_at' => now(),
        ])->save();

        $booking->guest->notify(new BookingPaymentRefunded($booking));
    }
}
