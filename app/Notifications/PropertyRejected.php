<?php

namespace App\Notifications;

use App\Models\Property;
use App\Notifications\Concerns\SentInApp;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Sent to the host when an admin turns down their submission or takes their listing down.
 */
class PropertyRejected extends Notification implements ShouldQueue
{
    use Queueable, SentInApp;

    public function __construct(public Property $property, public bool $wasPublished = false)
    {
        $this->afterCommit();
    }

    public function toMail(object $notifiable): MailMessage
    {
        $property = $this->property->loadMissing('owner');

        return (new MailMessage)
            ->subject(($this->wasPublished ? 'Logement retiré du catalogue' : 'Logement à revoir')." · {$property->title}")
            ->greeting('Bonjour '.$property->owner->name.',')
            ->line($this->wasPublished
                ? "Notre équipe a retiré « {$property->title} » du catalogue."
                : "Notre équipe n’a pas pu valider « {$property->title} » en l’état.")
            ->line('Motif : '.$property->rejection_reason)
            ->line('Une fois les corrections faites, renvoyez le logement en validation depuis votre espace hôte. Les réservations déjà confirmées ne sont pas annulées.')
            ->action('Modifier le logement', route('host.properties.edit', $property));
    }

    /**
     * @return array{title: string, body: string, url: string}
     */
    protected function inApp(object $notifiable): array
    {
        return [
            'title' => $this->wasPublished ? 'Logement retiré du catalogue' : 'Logement à revoir',
            'body' => "« {$this->property->title} » : {$this->property->rejection_reason}",
            'url' => route('host.properties.edit', $this->property),
        ];
    }
}
