<?php

namespace App\Notifications;

use App\Models\Booking;
use App\Notifications\Concerns\SentInApp;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Sent to the guest when the host turns a request down.
 */
class BookingDeclined extends Notification implements ShouldQueue
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

        $message = (new MailMessage)
            ->subject("Demande non retenue · {$booking->property->title}")
            ->greeting('Bonjour '.$booking->guest->name.',')
            ->line("L’hôte n’a pas pu accepter votre demande pour « {$booking->property->title} » {$stay}.");

        if (filled($booking->cancellation_reason)) {
            $message->line('Message de l’hôte : '.$booking->cancellation_reason);
        }

        return $message
            ->line('Aucun montant ne vous a été débité.')
            ->action('Trouver un autre logement', route('properties.index', ['check_in' => $booking->check_in->toDateString(), 'check_out' => $booking->check_out->toDateString(), 'guests' => $booking->guests]));
    }

    /**
     * @return array{title: string, body: string, url: string}
     */
    protected function inApp(object $notifiable): array
    {
        $booking = $this->booking->loadMissing('property');

        return [
            'title' => 'Demande non retenue',
            'body' => "L’hôte n’a pas pu accepter votre demande pour « {$booking->property->title} ».",
            'url' => route('bookings.show', $booking),
        ];
    }
}
