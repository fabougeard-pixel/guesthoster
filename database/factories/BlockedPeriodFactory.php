<?php

namespace Database\Factories;

use App\Models\BlockedPeriod;
use App\Models\Property;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<BlockedPeriod>
 */
class BlockedPeriodFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $startsOn = now()->addDays(fake()->numberBetween(5, 60))->startOfDay();

        return [
            'property_id' => Property::factory(),
            'starts_on' => $startsOn,
            'ends_on' => $startsOn->addDays(fake()->numberBetween(1, 7)),
            'reason' => null,
        ];
    }
}
