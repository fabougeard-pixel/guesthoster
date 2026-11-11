<?php

namespace App\Actions\Bookings;

use App\Enums\BookingStatus;
use App\Models\Booking;
use App\Notifications\BookingAwaitingPayment;

/**
 * The host accepts a request: the guest now has a limited time to pay.
 */
class ApproveBooking
{
    public function handle(Booking $booking): void
    {
        $booking->expires_at = CreateBooking::deadline(
            $booking->check_in,
            now()->addHours((int) config('booking.approved_payment_hours')),
        );
        $booking->transitionTo(BookingStatus::AwaitingPayment);

        $booking->guest->notify(new BookingAwaitingPayment($booking));
    }
}
