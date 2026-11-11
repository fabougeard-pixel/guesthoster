<?php

namespace App\Notifications;

use App\Models\Property;
use App\Notifications\Concerns\SentInApp;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Sent to the host when an admin approves their listing.
 */
class PropertyPublished extends Notification implements ShouldQueue
{
    use Queueable, SentInApp;

    public function __construct(public Property $property)
    {
        $this->afterCommit();
    }

    public function toMail(object $notifiable): MailMessage
    {
        $property = $this->property->loadMissing('owner');

        return (new MailMessage)
            ->subject("Votre logement est en ligne · {$property->title}")
            ->greeting('Bonjour '.$property->owner->name.',')
            ->line("Bonne nouvelle : « {$property->title} » a été validé et apparaît désormais dans les recherches.")
            ->line('Pensez à tenir votre calendrier à jour pour éviter les demandes sur des dates indisponibles.')
            ->action('Voir l’annonce', route('properties.show', $property));
    }

    /**
     * @return array{title: string, body: string, url: string}
     */
    protected function inApp(object $notifiable): array
    {
        return [
            'title' => 'Logement en ligne',
            'body' => "« {$this->property->title} » a été validé et apparaît dans les recherches.",
            'url' => route('properties.show', $this->property),
        ];
    }
}
