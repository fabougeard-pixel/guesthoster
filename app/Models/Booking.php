<?php

namespace App\Models;

use App\Casts\DateOnly;
use App\Enums\BookingMode;
use App\Enums\BookingStatus;
use App\Exceptions\InvalidStatusTransition;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Database\Factories\BookingFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\RouteKey;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Str;

/**
 * A stay booked by a guest. Prices are frozen at booking time and stored in cents.
 *
 * @property int $id
 * @property string $reference
 * @property int $property_id
 * @property int $user_id
 * @property CarbonImmutable $check_in
 * @property CarbonImmutable $check_out
 * @property int $guests
 * @property int $nights
 * @property int $price_per_night
 * @property int $cleaning_fee
 * @property int $service_fee
 * @property int $total_price
 * @property BookingMode $booking_mode
 * @property BookingStatus $status
 * @property string|null $special_requests
 * @property string|null $cancellation_reason
 * @property int|null $cancelled_by
 * @property CarbonImmutable|null $approved_at
 * @property CarbonImmutable|null $confirmed_at
 * @property CarbonImmutable|null $cancelled_at
 * @property CarbonImmutable|null $expires_at
 * @property string|null $stripe_checkout_session_id
 * @property string|null $stripe_payment_intent_id
 * @property CarbonImmutable|null $paid_at
 * @property int $refunded_amount
 * @property string|null $stripe_refund_id
 * @property CarbonImmutable|null $refunded_at
 * @property CarbonImmutable|null $created_at
 * @property CarbonImmutable|null $updated_at
 * @property-read Property $property
 * @property-read Review|null $review
 * @property-read User $guest
 */
#[Fillable(['check_in', 'check_out', 'guests', 'special_requests'])]
#[RouteKey('reference')]
class Booking extends Model
{
    /** @use HasFactory<BookingFactory> */
    use HasFactory;

    protected static function booted(): void
    {
        static::creating(function (Booking $booking): void {
            if (blank($booking->reference)) {
                $booking->reference = static::generateReference();
            }
        });
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'check_in' => DateOnly::class,
            'check_out' => DateOnly::class,
            'guests' => 'integer',
            'nights' => 'integer',
            'price_per_night' => 'integer',
            'cleaning_fee' => 'integer',
            'service_fee' => 'integer',
            'total_price' => 'integer',
            'booking_mode' => BookingMode::class,
            'status' => BookingStatus::class,
            'approved_at' => 'datetime',
            'confirmed_at' => 'datetime',
            'cancelled_at' => 'datetime',
            'expires_at' => 'datetime',
            'paid_at' => 'datetime',
            'refunded_amount' => 'integer',
            'refunded_at' => 'datetime',
        ];
    }

    /**
     * Unique, human friendly reference such as "GH-7K2M9QXA".
     */
    public static function generateReference(): string
    {
        do {
            $reference = 'GH-'.Str::upper(Str::random(8));
        } while (static::query()->where('reference', $reference)->exists());

        return $reference;
    }

    /**
     * @return BelongsTo<Property, $this>
     */
    public function property(): BelongsTo
    {
        return $this->belongsTo(Property::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function guest(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function canceller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cancelled_by');
    }

    /**
     * @return HasOne<Review, $this>
     */
    public function review(): HasOne
    {
        return $this->hasOne(Review::class);
    }

    /**
     * Last moment the guest may review this stay.
     */
    public function reviewDeadline(): CarbonImmutable
    {
        return $this->check_out->addDays((int) config('booking.review_window_days'))->endOfDay();
    }

    /**
     * @return HasMany<Message, $this>
     */
    public function messages(): HasMany
    {
        return $this->hasMany(Message::class);
    }

    /**
     * Whether the user is the guest or the host of this booking.
     */
    public function involves(User $user): bool
    {
        return $this->user_id === $user->id || $this->property->user_id === $user->id;
    }

    /**
     * The other party of the conversation.
     */
    public function counterpartOf(User $user): User
    {
        return $this->user_id === $user->id ? $this->property->owner : $this->guest;
    }

    /**
     * Bookings intersecting the half-open range [$checkIn, $checkOut):
     * a stay ending on a given day does not conflict with one starting that day.
     *
     * @param  Builder<self>  $query
     */
    #[Scope]
    protected function overlapping(Builder $query, CarbonInterface $checkIn, CarbonInterface $checkOut): void
    {
        $query->where('check_in', '<', $checkOut->toDateString())
            ->where('check_out', '>', $checkIn->toDateString());
    }

    /**
     * Bookings currently holding their dates.
     *
     * @param  Builder<self>  $query
     */
    #[Scope]
    protected function blocking(Builder $query): void
    {
        $query->whereIn('status', BookingStatus::blocking());
    }

    public function isPaid(): bool
    {
        return $this->paid_at !== null;
    }

    /**
     * Move the booking to a new status, stamping the matching timestamp.
     *
     * @throws InvalidStatusTransition
     */
    public function transitionTo(BookingStatus $status): void
    {
        if (! $this->status->canTransitionTo($status)) {
            throw InvalidStatusTransition::between($this->status, $status);
        }

        $this->status = $status;

        match ($status) {
            BookingStatus::AwaitingPayment => $this->approved_at ??= now(),
            BookingStatus::Confirmed => $this->confirmed_at = now(),
            BookingStatus::Cancelled, BookingStatus::Declined => $this->cancelled_at = now(),
            default => null,
        };

        $this->save();
    }
}
