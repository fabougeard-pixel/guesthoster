<?php

namespace App\Notifications;

use App\Models\Booking;
use App\Notifications\Concerns\SentInApp;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Sent to the guest when a booking is accepted (or booked instantly) and awaits payment.
 */
class BookingAwaitingPayment extends Notification implements ShouldQueue
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
            ->subject("Finalisez votre réservation · {$booking->property->title}")
            ->greeting('Bonjour '.$booking->guest->name.',')
            ->line("Votre séjour à « {$booking->property->title} » {$stay} est prêt à être confirmé.")
            ->line('Réglez votre réservation avant le '.$booking->expires_at?->translatedFormat('j F à H:i').' pour bloquer définitivement vos dates.')
            ->action('Voir ma réservation', route('bookings.show', $booking));
    }

    /**
     * @return array{title: string, body: string, url: string}
     */
    protected function inApp(object $notifiable): array
    {
        $booking = $this->booking->loadMissing('property');

        return [
            'title' => 'Réglez votre séjour',
            'body' => "Vos dates à « {$booking->property->title} » sont bloquées jusqu’au {$booking->expires_at?->translatedFormat('j F à H:i')}.",
            'url' => route('bookings.show', $booking),
        ];
    }
}
