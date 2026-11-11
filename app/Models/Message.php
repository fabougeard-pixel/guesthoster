<?php

namespace App\Models;

use Carbon\CarbonImmutable;
use Database\Factories\MessageFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A message in the conversation attached to a booking, between its guest and its host.
 *
 * @property int $id
 * @property int $booking_id
 * @property int $user_id
 * @property string $body
 * @property CarbonImmutable|null $read_at
 * @property CarbonImmutable|null $created_at
 * @property CarbonImmutable|null $updated_at
 * @property-read Booking $booking
 * @property-read User $sender
 */
#[Fillable(['body'])]
class Message extends Model
{
    /** @use HasFactory<MessageFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return ['read_at' => 'datetime'];
    }

    /**
     * @return BelongsTo<Booking, $this>
     */
    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Messages the given user has received but not read yet, across all their bookings.
     *
     * @param  Builder<self>  $query
     */
    #[Scope]
    protected function unreadBy(Builder $query, User $user): void
    {
        $query->whereNull('read_at')
            ->where('user_id', '!=', $user->id)
            ->whereHas('booking', fn (Builder $booking) => $booking
                ->where('user_id', $user->id)
                ->orWhereHas('property', fn (Builder $property) => $property->where('user_id', $user->id)));
    }

    /**
     * @return array{id: int, body: string, sender_id: int, created_at: string|null, read_at: string|null}
     */
    public function toBroadcastArray(): array
    {
        return [
            'id' => $this->id,
            'body' => $this->body,
            'sender_id' => $this->user_id,
            'created_at' => $this->created_at?->toIso8601String(),
            'read_at' => $this->read_at?->toIso8601String(),
        ];
    }
}
