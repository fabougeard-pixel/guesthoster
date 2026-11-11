<?php

namespace App\Actions\Bookings;

use App\Enums\BookingStatus;
use App\Models\Booking;
use App\Models\User;
use App\Notifications\BookingDeclined;

class DeclineBooking
{
    public function handle(Booking $booking, User $host, ?string $reason = null): void
    {
        $booking->forceFill(['cancellation_reason' => $reason, 'cancelled_by' => $host->id]);
        $booking->transitionTo(BookingStatus::Declined);

        $booking->guest->notify(new BookingDeclined($booking));
    }
}
