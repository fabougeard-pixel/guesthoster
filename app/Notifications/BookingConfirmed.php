<?php

namespace App\Notifications;

use App\Models\Booking;
use App\Notifications\Concerns\SentInApp;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Number;

/**
 * Sent to both parties once the stay is paid.
 */
class BookingConfirmed extends Notification implements ShouldQueue
{
    use Queueable, SentInApp;

    /**
     * @param  'guest'|'host'  $recipient
     */
    public function __construct(public Booking $booking, public string $recipient)
    {
        $this->afterCommit();
    }

    public function toMail(object $notifiable): MailMessage
    {
        $booking = $this->booking->loadMissing(['property.city', 'guest']);
        $property = $booking->property;
        $stay = 'du '.$booking->check_in->translatedFormat('j F Y').' au '.$booking->check_out->translatedFormat('j F Y');
        $total = Number::currency($booking->total_price / 100, 'EUR', 'fr');

        if ($this->recipient === 'host') {
            return (new MailMessage)
                ->subject("Réservation confirmée · {$booking->reference}")
                ->greeting('Bonjour,')
                ->line("{$booking->guest->name} a réglé son séjour à « {$property->title} » {$stay} ({$booking->guests} voyageur(s)).")
                ->line('Les dates sont désormais réservées dans votre calendrier.')
                ->action('Voir la réservation', route('bookings.show', $booking));
        }

        return (new MailMessage)
            ->subject("Votre séjour est confirmé · {$property->title}")
            ->greeting('Bonjour '.$booking->guest->name.',')
            ->line("Paiement de {$total} reçu : votre séjour à « {$property->title} » {$stay} est confirmé.")
            ->line("Adresse : {$property->address}, {$property->postal_code} {$property->city?->name}")
            ->line('Arrivée à partir de '.substr($property->check_in_time, 0, 5).', départ avant '.substr($property->check_out_time, 0, 5).'.')
            ->action('Voir ma réservation', route('bookings.show', $booking));
    }

    /**
     * @return array{title: string, body: string, url: string}
     */
    protected function inApp(object $notifiable): array
    {
        $booking = $this->booking->loadMissing(['property', 'guest']);

        return [
            'title' => 'Réservation confirmée',
            'body' => $this->recipient === 'host'
                ? "{$booking->guest->name} a réglé son séjour à « {$booking->property->title} »."
                : "Votre séjour à « {$booking->property->title} » est confirmé.",
            'url' => route('bookings.show', $booking),
        ];
    }
}
