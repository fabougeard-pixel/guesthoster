<?php

namespace App\Notifications;

use App\Models\Booking;
use App\Notifications\Concerns\SentInApp;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Sent to the guest when a request was not answered or a booking not paid in time.
 */
class BookingExpired extends Notification implements ShouldQueue
{
    use Queueable, SentInApp;

    public function __construct(public Booking $booking)
    {
        $this->afterCommit();
    }

    public function toMail(object $notifiable): MailMessage
    {
        $booking = $this->booking->loadMissing(['property', 'guest']);
        $stay = 'du '.$booking->check_in->translatedFormat('j F Y').' au '.$booking->check_out->translatedFormat('j F Y');

        return (new MailMessage)
            ->subject("Réservation expirée · {$booking->property->title}")
            ->greeting('Bonjour '.$booking->guest->name.',')
            ->line("Votre réservation pour « {$booking->property->title} » {$stay} a expiré : les dates ont été libérées.")
            ->action('Relancer une recherche', route('properties.index'));
    }

    /**
     * @return array{title: string, body: string, url: string}
     */
    protected function inApp(object $notifiable): array
    {
        $booking = $this->booking->loadMissing('property');

        return [
            'title' => 'Réservation expirée',
            'body' => "Votre réservation pour « {$booking->property->title} » a expiré et les dates ont été libérées.",
            'url' => route('bookings.show', $booking),
        ];
    }
}
