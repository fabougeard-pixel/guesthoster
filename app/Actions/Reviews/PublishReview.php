<?php

namespace App\Actions\Reviews;

use App\Models\Booking;
use App\Models\Review;
use App\Notifications\ReviewReceived;
use Illuminate\Support\Facades\DB;

/**
 * Record the guest's review of a completed stay and refresh the listing's rating.
 * Eligibility is checked beforehand by BookingPolicy::review; the unique booking_id guards against doubles.
 */
class PublishReview
{
    public function handle(Booking $booking, int $rating, string $comment): Review
    {
        $review = DB::transaction(function () use ($booking, $rating, $comment): Review {
            $review = new Review(['rating' => $rating, 'comment' => $comment]);
            $review->forceFill([
                'booking_id' => $booking->id,
                'property_id' => $booking->property_id,
                'user_id' => $booking->user_id,
            ])->save();

            $booking->property->refreshRating();

            return $review;
        });

        $booking->property->owner->notify(new ReviewReceived($review));

        return $review;
    }
}
