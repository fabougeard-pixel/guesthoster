<?php

namespace Database\Factories;

use App\Enums\BookingMode;
use App\Enums\PropertyStatus;
use App\Models\City;
use App\Models\Property;
use App\Models\PropertyImage;
use App\Models\PropertyType;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Property>
 */
class PropertyFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $typeName = fake()->randomElement(['Appartement', 'Maison', 'Gîte', 'Studio', 'Villa']);
        $maxGuests = fake()->numberBetween(1, 10);

        return [
            'user_id' => User::factory()->host(),
            'city_id' => City::factory(),
            'title' => $typeName.' '.fake()->randomElement(['lumineux', 'cosy', 'au calme', 'avec vue', 'familial', 'design', 'de charme']).' '.fake()->randomElement(['en centre-ville', 'près de la plage', 'proche des transports', 'avec terrasse', 'au cœur du quartier historique']),
            'description' => fake()->paragraphs(3, true),
            'property_type_id' => fn (): int => PropertyType::query()->firstOrCreate(
                ['slug' => Str::slug($typeName)],
                ['name' => $typeName],
            )->id,
            'status' => PropertyStatus::Draft,
            'booking_mode' => fake()->randomElement(BookingMode::cases()),
            'address' => fake()->streetAddress(),
            'postal_code' => fake()->postcode(),
            'latitude' => fake()->latitude(42, 51),
            'longitude' => fake()->longitude(-4, 8),
            'max_guests' => $maxGuests,
            'bedrooms' => $typeName === 'Studio' ? 0 : fake()->numberBetween(1, max(1, intdiv($maxGuests, 2))),
            'beds' => max(1, intdiv($maxGuests + 1, 2)),
            'bathrooms' => fake()->numberBetween(1, 3),
            'price_per_night' => fake()->numberBetween(35, 400) * 100,
            'cleaning_fee' => fake()->randomElement([0, 2000, 3500, 5000]),
            'min_nights' => fake()->randomElement([1, 1, 2, 3]),
            'max_nights' => null,
            'check_in_time' => '15:00',
            'check_out_time' => '11:00',
        ];
    }

    public function pending(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => PropertyStatus::Pending,
            'submitted_at' => now(),
        ]);
    }

    public function published(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => PropertyStatus::Published,
            'submitted_at' => now()->subDays(2),
            'published_at' => now()->subDay(),
        ]);
    }

    public function rejected(string $reason = 'Les photos ne correspondent pas au logement.'): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => PropertyStatus::Rejected,
            'submitted_at' => now()->subDay(),
            'rejection_reason' => $reason,
        ]);
    }

    public function archived(): static
    {
        return $this->state(fn (array $attributes) => ['status' => PropertyStatus::Archived]);
    }

    public function instant(): static
    {
        return $this->state(fn (array $attributes) => ['booking_mode' => BookingMode::Instant]);
    }

    public function onRequest(): static
    {
        return $this->state(fn (array $attributes) => ['booking_mode' => BookingMode::Request]);
    }

    /**
     * Attach remote placeholder pictures.
     */
    public function withImages(int $count = 5): static
    {
        return $this->has(
            PropertyImage::factory()->placeholder()->count($count)->sequence(fn ($sequence) => ['position' => $sequence->index]),
            'images',
        );
    }
}
