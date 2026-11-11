<?php

namespace Database\Factories;

use App\Enums\AmenityCategory;
use App\Models\Amenity;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Amenity>
 */
class AmenityFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = fake()->unique()->bothify('Équipement ####');

        return [
            'slug' => Str::slug($name),
            'name' => $name,
            'category' => fake()->randomElement(AmenityCategory::cases()),
            'icon' => null,
            'sort_order' => 0,
        ];
    }
}
