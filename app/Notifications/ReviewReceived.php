<?php

namespace App\Notifications;

use App\Models\Review;
use App\Notifications\Concerns\SentInApp;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Sent to the host when a guest reviews their stay.
 */
class ReviewReceived extends Notification implements ShouldQueue
{
    use Queueable, SentInApp;

    public function __construct(public Review $review)
    {
        $this->afterCommit();
    }

    public function toMail(object $notifiable): MailMessage
    {
        $review = $this->review->loadMissing(['property', 'author', 'booking']);

        return (new MailMessage)
            ->subject("Nouvel avis ({$review->rating}/5) · {$review->property->title}")
            ->greeting('Bonjour,')
            ->line("{$review->author->firstName()} a laissé un avis sur « {$review->property->title} » : {$review->rating}/5.")
            ->line('« '.str($review->comment)->limit(300).' »')
            ->line('Vous pouvez y répondre publiquement depuis la page de la réservation.')
            ->action('Répondre à l’avis', route('bookings.show', $review->booking));
    }

    /**
     * @return array{title: string, body: string, url: string}
     */
    protected function inApp(object $notifiable): array
    {
        $review = $this->review->loadMissing(['property', 'author', 'booking']);

        return [
            'title' => "Nouvel avis : {$review->rating}/5",
            'body' => "{$review->author->firstName()} a noté son séjour à « {$review->property->title} ».",
            'url' => route('bookings.show', $review->booking),
        ];
    }
}
