<?php

namespace Database\Factories;

use App\Models\Booking;
use App\Models\Review;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Review>
 */
class ReviewFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'booking_id' => Booking::factory()->completed(),
            'rating' => fake()->numberBetween(3, 5),
            'comment' => fake()->paragraph(),
        ];
    }

    public function configure(): static
    {
        return $this->afterMaking(function (Review $review): void {
            $review->property_id = $review->booking->property_id;
            $review->user_id = $review->booking->user_id;
        });
    }

    public function replied(): static
    {
        return $this->state(fn (array $attributes) => [
            'host_reply' => 'Merci beaucoup, au plaisir de vous accueillir à nouveau !',
            'replied_at' => now(),
        ]);
    }
}
