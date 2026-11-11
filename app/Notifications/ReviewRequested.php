<?php

namespace App\Notifications;

use App\Models\Booking;
use App\Notifications\Concerns\SentInApp;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Sent to the guest once their stay is over, inviting them to review it.
 */
class ReviewRequested extends Notification implements ShouldQueue
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
            ->subject("Comment s’est passé votre séjour ? · {$booking->property->title}")
            ->greeting('Bonjour '.$booking->guest->name.',')
            ->line("Nous espérons que votre séjour à « {$booking->property->title} » s’est bien passé.")
            ->line('Votre avis aide les autres voyageurs à choisir, et votre hôte à progresser. Vous avez jusqu’au '.$booking->reviewDeadline()->translatedFormat('j F').' pour le donner.')
            ->action('Donner mon avis', route('bookings.show', $booking));
    }

    /**
     * @return array{title: string, body: string, url: string}
     */
    protected function inApp(object $notifiable): array
    {
        $booking = $this->booking->loadMissing('property');

        return [
            'title' => 'Donnez votre avis',
            'body' => "Comment s’est passé votre séjour à « {$booking->property->title} » ?",
            'url' => route('bookings.show', $booking),
        ];
    }
}
