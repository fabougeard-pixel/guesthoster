<?php

use App\Models\Amenity;
use App\Models\Country;
use App\Models\PropertyType;

test('bootstrap database seeds reference data when countries table is empty', function (): void {
    expect(Country::query()->count())->toBe(0);

    $this->artisan('app:bootstrap-database')
        ->assertSuccessful();

    expect(Country::query()->count())->toBeGreaterThan(0)
        ->and(Amenity::query()->count())->toBeGreaterThan(0)
        ->and(PropertyType::query()->count())->toBeGreaterThan(0);
});

test('bootstrap database skips seeding when countries already exist', function (): void {
    $country = Country::factory()->create();

    $this->artisan('app:bootstrap-database')
        ->assertSuccessful();

    expect(Country::query()->count())->toBe(1)
        ->and(Country::query()->first()?->is($country))->toBeTrue();
});
