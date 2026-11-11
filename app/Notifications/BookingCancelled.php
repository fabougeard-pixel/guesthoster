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
 * Sent to the parties who did not cancel the booking themselves.
 */
class BookingCancelled extends Notification implements ShouldQueue
{
    use Queueable, SentInApp;

    /**
     * @param  'guest'|'host'|'admin'  $cancelledBy
     */
    public function __construct(public Booking $booking, public string $cancelledBy)
    {
        $this->afterCommit();
    }

    public function toMail(object $notifiable): MailMessage
    {
        $booking = $this->booking->loadMissing(['property', 'guest']);
        $stay = 'du '.$booking->check_in->translatedFormat('j F Y').' au '.$booking->check_out->translatedFormat('j F Y');

        $who = match ($this->cancelledBy) {
            'guest' => 'le voyageur',
            'host' => 'l’hôte',
            default => 'l’équipe GuestHoster',
        };

        $message = (new MailMessage)
            ->subject("Réservation annulée · {$booking->reference}")
            ->greeting('Bonjour,')
            ->line("La réservation {$booking->reference} pour « {$booking->property->title} » {$stay} a été annulée par {$who}.");

        if (filled($booking->cancellation_reason)) {
            $message->line('Motif : '.$booking->cancellation_reason);
        }

        if ($booking->refunded_amount > 0) {
            $message->line('Remboursement : '.Number::currency($booking->refunded_amount / 100, 'EUR', 'fr').' sur le moyen de paiement utilisé.');
        }

        return $message->action('Voir la réservation', route('bookings.show', $booking));
    }

    /**
     * @return array{title: string, body: string, url: string}
     */
    protected function inApp(object $notifiable): array
    {
        $booking = $this->booking->loadMissing('property');

        return [
            'title' => 'Réservation annulée',
            'body' => "La réservation {$booking->reference} pour « {$booking->property->title} » a été annulée.",
            'url' => route('bookings.show', $booking),
        ];
    }
}
