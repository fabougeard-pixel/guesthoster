<?php

namespace App\Notifications;

use App\Models\Booking;
use App\Notifications\Concerns\SentInApp;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Sent to the host when a guest asks to book a listing in request mode.
 */
class BookingRequested extends Notification implements ShouldQueue
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
            ->subject("Nouvelle demande de réservation · {$booking->property->title}")
            ->greeting('Bonjour,')
            ->line("{$booking->guest->name} souhaite réserver « {$booking->property->title} » {$stay} pour {$booking->guests} voyageur(s).")
            ->line('Acceptez ou refusez la demande avant le '.$booking->expires_at?->translatedFormat('j F à H:i').', faute de quoi elle expirera.')
            ->action('Répondre à la demande', route('host.bookings.index'));
    }

    /**
     * @return array{title: string, body: string, url: string}
     */
    protected function inApp(object $notifiable): array
    {
        $booking = $this->booking->loadMissing(['property', 'guest']);

        return [
            'title' => 'Nouvelle demande de réservation',
            'body' => "{$booking->guest->name} souhaite réserver « {$booking->property->title} » du {$booking->check_in->translatedFormat('j M')} au {$booking->check_out->translatedFormat('j M')}.",
            'url' => route('bookings.show', $booking),
        ];
    }
}
