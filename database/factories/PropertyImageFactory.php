<?php

namespace Database\Factories;

use App\Models\Property;
use App\Models\PropertyImage;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PropertyImage>
 */
class PropertyImageFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'property_id' => Property::factory(),
            'path' => 'properties/'.fake()->uuid().'.webp',
            'thumbnail_path' => null,
            'original_path' => null,
            'alt' => null,
            'position' => 0,
            'processed_at' => now(),
        ];
    }

    /**
     * Uploaded but not processed yet.
     */
    public function unprocessed(): static
    {
        return $this->state(fn (array $attributes) => [
            'path' => null,
            'original_path' => 'property-uploads/'.fake()->uuid().'.jpg',
            'processed_at' => null,
        ]);
    }

    /**
     * Remote placeholder picture, handy for demo data without local files.
     */
    public function placeholder(): static
    {
        return $this->state(fn (array $attributes) => [
            'path' => 'https://picsum.photos/seed/'.fake()->unique()->bothify('gh-####??').'/1200/800',
        ]);
    }
}
