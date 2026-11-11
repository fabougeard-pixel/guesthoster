<?php

namespace Database\Factories;

use App\Models\City;
use App\Models\Country;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<City>
 */
class CityFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = fake()->unique()->city();

        return [
            'country_id' => Country::factory(),
            'name' => $name,
            'slug' => Str::slug($name),
            'latitude' => fake()->latitude(42, 51),
            'longitude' => fake()->longitude(-4, 8),
            'is_popular' => false,
            'is_active' => true,
            'sort_order' => 0,
        ];
    }

    public function popular(): static
    {
        return $this->state(fn (array $attributes) => ['is_popular' => true]);
    }

    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => ['is_active' => false]);
    }
}
