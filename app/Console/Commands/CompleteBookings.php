<?php

namespace App\Console\Commands;

use App\Enums\BookingStatus;
use App\Models\Booking;
use App\Notifications\ReviewRequested;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('bookings:complete')]
#[Description('Marque comme terminés les séjours confirmés dont la date de départ est passée et invite les voyageurs à donner leur avis')]
class CompleteBookings extends Command
{
    public function handle(): int
    {
        $completed = 0;

        Booking::query()
            ->where('status', BookingStatus::Confirmed)
            ->where('check_out', '<=', today()->toDateString())
            ->with('guest')
            ->chunkById(100, function ($bookings) use (&$completed): void {
                foreach ($bookings as $booking) {
                    $booking->transitionTo(BookingStatus::Completed);
                    $booking->guest->notify(new ReviewRequested($booking));
                    $completed++;
                }
            });

        $this->info("{$completed} séjour(s) terminé(s).");

        return self::SUCCESS;
    }
}
