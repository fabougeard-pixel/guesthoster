<?php

namespace App\Console\Commands;

use App\Enums\BookingStatus;
use App\Models\Booking;
use App\Notifications\BookingExpired;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('bookings:expire')]
#[Description('Expire les demandes sans réponse et les réservations non payées dans les délais')]
class ExpireBookings extends Command
{
    public function handle(): int
    {
        $expired = 0;

        Booking::query()
            ->whereIn('status', [BookingStatus::Pending, BookingStatus::AwaitingPayment])
            ->where('expires_at', '<=', now())
            ->with(['guest', 'property'])
            ->chunkById(100, function ($bookings) use (&$expired): void {
                foreach ($bookings as $booking) {
                    $booking->transitionTo(BookingStatus::Expired);
                    $booking->guest->notify(new BookingExpired($booking));
                    $expired++;
                }
            });

        $this->info("{$expired} réservation(s) expirée(s).");

        return self::SUCCESS;
    }
}
