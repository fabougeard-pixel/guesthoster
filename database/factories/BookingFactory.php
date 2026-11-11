<?php

namespace Database\Factories;

use App\Enums\BookingStatus;
use App\Models\Booking;
use App\Models\Property;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * Prices are derived from the related property when it is given explicitly
 * (`Booking::factory()->for($property)`), otherwise from default amounts.
 *
 * @extends Factory<Booking>
 */
class BookingFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $checkIn = CarbonImmutable::today()->addDays(fake()->numberBetween(7, 90));

        return [
            'property_id' => Property::factory()->published(),
            'user_id' => User::factory(),
            'check_in' => $checkIn,
            'check_out' => $checkIn->addDays(fake()->numberBetween(1, 7)),
            'guests' => fake()->numberBetween(1, 4),
            'nights' => 0,
            'price_per_night' => 0,
            'cleaning_fee' => 0,
            'service_fee' => 0,
            'total_price' => 0,
            'booking_mode' => 'request',
            'status' => BookingStatus::Pending,
            'special_requests' => null,
        ];
    }

    public function configure(): static
    {
        return $this->afterMaking(function (Booking $booking): void {
            $property = $booking->property;
            $booking->nights = (int) $booking->check_in->diffInDays($booking->check_out);
            $booking->price_per_night = $booking->price_per_night ?: $property->price_per_night;
            $booking->cleaning_fee = $booking->cleaning_fee ?: $property->cleaning_fee;
            $booking->booking_mode = $property->booking_mode;
            $booking->guests = min($booking->guests, $property->max_guests);
            $booking->service_fee = $booking->service_fee
                ?: (int) round(($booking->nights * $booking->price_per_night + $booking->cleaning_fee) * (float) config('booking.service_fee_rate'));
            $booking->total_price = $booking->total_price
                ?: $booking->nights * $booking->price_per_night + $booking->cleaning_fee + $booking->service_fee;
        });
    }

    /**
     * Stay on explicit dates.
     */
    public function between(string $checkIn, string $checkOut): static
    {
        return $this->state(fn (array $attributes) => [
            'check_in' => CarbonImmutable::parse($checkIn),
            'check_out' => CarbonImmutable::parse($checkOut),
        ]);
    }

    public function awaitingPayment(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => BookingStatus::AwaitingPayment,
            'approved_at' => now(),
            'expires_at' => now()->addDay(),
        ]);
    }

    public function confirmed(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => BookingStatus::Confirmed,
            'approved_at' => now()->subHour(),
            'confirmed_at' => now(),
            'paid_at' => now(),
        ]);
    }

    public function cancelled(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => BookingStatus::Cancelled,
            'cancelled_at' => now(),
        ]);
    }

    public function declined(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => BookingStatus::Declined,
            'cancelled_at' => now(),
        ]);
    }

    public function completed(): static
    {
        return $this->state(function (array $attributes) {
            $checkIn = CarbonImmutable::today()->subDays(fake()->numberBetween(10, 60));

            return [
                'status' => BookingStatus::Completed,
                'check_in' => $checkIn,
                'check_out' => $checkIn->addDays(fake()->numberBetween(1, 7)),
                'approved_at' => $checkIn->subDays(14),
                'confirmed_at' => $checkIn->subDays(14),
                'paid_at' => $checkIn->subDays(14),
            ];
        });
    }
}
