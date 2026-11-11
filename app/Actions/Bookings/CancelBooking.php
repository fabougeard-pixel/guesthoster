<?php

namespace App\Actions\Bookings;

use App\Enums\BookingStatus;
use App\Models\Booking;
use App\Models\User;
use App\Notifications\BookingCancelled;
use App\Payments\PaymentGateway;
use App\Payments\PaymentUnavailable;
use App\Payments\RefundPolicy;

/**
 * Cancellation by the guest, the host or an admin; every other party is told.
 * A paid booking is refunded according to the RefundPolicy before being cancelled.
 */
class CancelBooking
{
    public function __construct(
        private PaymentGateway $payments,
        private RefundPolicy $refunds,
    ) {}

    /**
     * @throws PaymentUnavailable when the refund cannot be issued: the booking is left untouched.
     */
    public function handle(Booking $booking, User $by, ?string $reason = null): void
    {
        $refund = $this->refunds->amountFor($booking, $by);

        if ($refund > 0 && $booking->stripe_payment_intent_id !== null) {
            $booking->forceFill([
                'stripe_refund_id' => $this->payments->refund($booking->stripe_payment_intent_id, $refund, "cancel-{$booking->reference}"),
                'refunded_amount' => $booking->refunded_amount + $refund,
                'refunded_at' => now(),
            ]);
        }

        $booking->forceFill(['cancellation_reason' => $reason, 'cancelled_by' => $by->id]);
        $booking->transitionTo(BookingStatus::Cancelled);

        $cancelledBy = match (true) {
            $by->is($booking->guest) => 'guest',
            $by->is($booking->property->owner) => 'host',
            default => 'admin',
        };
        $notification = new BookingCancelled($booking, $cancelledBy);

        collect([$booking->guest, $booking->property->owner])
            ->reject(fn (User $party): bool => $party->is($by))
            ->each(fn (User $party) => $party->notify($notification));
    }
}
