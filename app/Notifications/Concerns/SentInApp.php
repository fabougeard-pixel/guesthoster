<?php

namespace App\Notifications\Concerns;

use Illuminate\Notifications\Messages\BroadcastMessage;

/**
 * Sends a notification by e-mail, stores it for the in-app notification centre
 * and pushes it live on the user's private channel.
 */
trait SentInApp
{
    /**
     * What the notification centre shows: a title, a short text and the page to open.
     *
     * @return array{title: string, body: string, url: string}
     */
    abstract protected function inApp(object $notifiable): array;

    /**
     * @return list<string>
     */
    public function via(object $notifiable): array
    {
        return ['mail', 'database', 'broadcast'];
    }

    /**
     * @return array{title: string, body: string, url: string}
     */
    public function toArray(object $notifiable): array
    {
        return $this->inApp($notifiable);
    }

    public function toBroadcast(object $notifiable): BroadcastMessage
    {
        return new BroadcastMessage($this->inApp($notifiable));
    }

    public function broadcastType(): string
    {
        return 'app.notification';
    }
}
