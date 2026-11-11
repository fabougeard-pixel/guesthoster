<?php

namespace App\Http\Resources;

use App\Enums\BookingStatus;
use App\Models\Booking;
use App\Payments\RefundPolicy;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Gate;

/**
 * A booking as seen by the current user (guest, host or admin).
 * Requires `property.city.country`, `property.coverImage`, `property.owner` and `guest`; `review.author` on the detail page.
 * The exact address is only given to the guest once the booking is confirmed.
 *
 * @mixin Booking
 */
class BookingResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $user = $request->user();
        $property = $this->property;
        $isHost = $user !== null && ($property->user_id === $user->id || ($user->isAdmin() && $this->user_id !== $user->id));
        $revealAddress = $isHost || in_array($this->status, [BookingStatus::Confirmed, BookingStatus::Completed], true);

        return [
            'reference' => $this->reference,
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'is_instant' => $this->booking_mode->value === 'instant',
            'check_in' => $this->check_in->toDateString(),
            'check_out' => $this->check_out->toDateString(),
            'nights' => $this->nights,
            'guests' => $this->guests,
            'price_per_night' => $this->price_per_night,
            'lodging_total' => $this->nights * $this->price_per_night,
            'cleaning_fee' => $this->cleaning_fee,
            'service_fee' => $this->service_fee,
            'total_price' => $this->total_price,
            'special_requests' => $this->special_requests,
            'cancellation_reason' => $this->cancellation_reason,
            'expires_at' => $this->expires_at?->toIso8601String(),
            'paid_at' => $this->paid_at?->toIso8601String(),
            'refunded_amount' => $this->refunded_amount,
            'refund_if_cancelled' => $user !== null ? app(RefundPolicy::class)->amountFor($this->resource, $user) : 0,
            'refund_policy' => app(RefundPolicy::class)->summary(),
            'created_at' => $this->created_at?->toIso8601String(),
            'property' => [
                'slug' => $property->slug,
                'title' => $property->title,
                'city' => $property->city?->name,
                'country' => $property->city?->country->name,
                'cover_url' => $property->coverImage?->thumbnail_url,
                'address' => $revealAddress ? trim("{$property->address}, {$property->postal_code} {$property->city?->name}", ' ,') : null,
                'check_in_time' => substr($property->check_in_time, 0, 5),
                'check_out_time' => substr($property->check_out_time, 0, 5),
            ],
            'guest' => ['name' => $this->guest->name],
            'host' => ['name' => $property->owner->name],
            'viewer' => $isHost ? 'host' : 'guest',
            'review' => $this->whenLoaded('review', fn (): ?array => $this->review?->toPublicArray()),
            'review_deadline' => $this->status === BookingStatus::Completed ? $this->reviewDeadline()->toIso8601String() : null,
            'can' => [
                'respond' => $user !== null && Gate::forUser($user)->allows('respond', $this->resource),
                'cancel' => $user !== null && Gate::forUser($user)->allows('cancel', $this->resource),
                'pay' => $user !== null && Gate::forUser($user)->allows('pay', $this->resource),
                'message' => $user !== null && Gate::forUser($user)->allows('message', $this->resource),
                'review' => $user !== null && Gate::forUser($user)->allows('review', $this->resource),
                'reply_review' => $user !== null && Gate::forUser($user)->allows('replyToReview', $this->resource),
            ],
        ];
    }
}
