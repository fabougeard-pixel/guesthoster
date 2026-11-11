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
 * Sent to the guest when a payment arrived too late and was given back.
 */
class BookingPaymentRefunded extends Notification implements ShouldQueue
{
    use Queueable, SentInApp;

    public function __construct(public Booking $booking)
    {
        $this->afterCommit();
    }

    public function toMail(object $notifiable): MailMessage
    {
        $booking = $this->booking->loadMissing(['property', 'guest']);

        return (new MailMessage)
            ->subject("Paiement remboursé · {$booking->reference}")
            ->greeting('Bonjour '.$booking->guest->name.',')
            ->line("Votre paiement pour « {$booking->property->title} » est arrivé alors que la réservation n’était plus active ({$booking->status->label()}).")
            ->line('Nous vous avons remboursé '.Number::currency($booking->refunded_amount / 100, 'EUR', 'fr').'. Le montant apparaîtra sur votre compte sous quelques jours.')
            ->action('Relancer une recherche', route('properties.index'));
    }

    /**
     * @return array{title: string, body: string, url: string}
     */
    protected function inApp(object $notifiable): array
    {
        $booking = $this->booking->loadMissing('property');

        return [
            'title' => 'Paiement remboursé',
            'body' => 'Votre paiement pour « '.$booking->property->title.' » vous a été remboursé ('.Number::currency($booking->refunded_amount / 100, 'EUR', 'fr').').',
            'url' => route('bookings.show', $booking),
        ];
    }
}
