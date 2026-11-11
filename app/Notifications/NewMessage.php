<?php

namespace App\Notifications;

use App\Models\Message;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Str;

/**
 * E-mail sent a few minutes after a message, only if it is still unread and is
 * the latest of the burst: one e-mail per conversation burst, none if the
 * recipient is already chatting.
 */
class NewMessage extends Notification implements ShouldQueue
{
    use Queueable;

    public const DELAY_MINUTES = 10;

    public function __construct(public Message $message)
    {
        $this->afterCommit();
        $this->delay(now()->addMinutes(self::DELAY_MINUTES));
    }

    /**
     * @return list<string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function shouldSend(object $notifiable, string $channel): bool
    {
        $message = $this->message->fresh();

        return $message !== null
            && $message->read_at === null
            && ! Message::query()
                ->where('booking_id', $message->booking_id)
                ->where('user_id', $message->user_id)
                ->where('id', '>', $message->id)
                ->exists();
    }

    public function toMail(object $notifiable): MailMessage
    {
        $message = $this->message->loadMissing(['sender', 'booking.property']);

        return (new MailMessage)
            ->subject("Nouveau message de {$message->sender->name}")
            ->greeting('Bonjour,')
            ->line("{$message->sender->name} vous a écrit au sujet de « {$message->booking->property->title} » :")
            ->line('« '.Str::limit($message->body, 300).' »')
            ->action('Répondre', route('messages.show', $message->booking));
    }
}
