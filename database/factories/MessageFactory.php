<?php

namespace Database\Factories;

use App\Models\Booking;
use App\Models\Message;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * Sent by the guest of the booking unless a sender is given.
 *
 * @extends Factory<Message>
 */
class MessageFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'booking_id' => Booking::factory(),
            'user_id' => fn (array $attributes) => Booking::query()->whereKey($attributes['booking_id'])->value('user_id'),
            'body' => fake()->sentence(12),
            'read_at' => null,
        ];
    }

    public function read(): static
    {
        return $this->state(fn (array $attributes) => ['read_at' => now()]);
    }
}
