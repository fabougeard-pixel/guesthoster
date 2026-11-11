<?php

use App\Models\Booking;
use App\Notifications\BookingAwaitingPayment;
use App\Notifications\BookingCancelled;
use App\Notifications\BookingDeclined;
use App\Notifications\BookingExpired;
use App\Notifications\BookingRequested;
use Illuminate\Notifications\Notification;

test('booking emails render in french', function (Closure $notification, string $expected) {
    $booking = Booking::factory()->create([
        'check_in' => '2027-07-14',
        'check_out' => '2027-07-18',
        'expires_at' => now()->addDay(),
        'cancellation_reason' => 'Imprévu familial',
    ]);

    /** @var Notification $mail */
    $mail = $notification($booking);
    $html = (string) $mail->toMail($booking->guest)->render();

    expect($html)->toContain('14 juillet 2027')
        ->toContain($expected)
        ->toContain(e($booking->property->title));
})->with([
    'request' => [fn (Booking $booking) => new BookingRequested($booking), 'souhaite réserver'],
    'awaiting payment' => [fn (Booking $booking) => new BookingAwaitingPayment($booking), 'Réglez votre réservation'],
    'declined' => [fn (Booking $booking) => new BookingDeclined($booking), 'Imprévu familial'],
    'cancelled' => [fn (Booking $booking) => new BookingCancelled($booking, 'host'), 'annulée par l’hôte'],
    'expired' => [fn (Booking $booking) => new BookingExpired($booking), 'a expiré'],
]);
