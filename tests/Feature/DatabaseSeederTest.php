<?php

use App\Enums\UserRole;
use App\Models\Amenity;
use App\Models\City;
use App\Models\Country;
use App\Models\Property;
use App\Models\User;
use Database\Seeders\AmenitySeeder;
use Database\Seeders\CountryCitySeeder;

test('the full seeder builds a consistent demo dataset', function () {
    $this->seed();

    expect(Property::query()->published()->count())->toBeGreaterThan(0)
        ->and(Property::query()->published()->doesntHave('images')->count())->toBe(0);
});

test('reference seeders can be run again without duplicates', function () {
    $this->seed([CountryCitySeeder::class, AmenitySeeder::class]);
    $counts = [Country::count(), City::count(), Amenity::count()];

    $this->seed([CountryCitySeeder::class, AmenitySeeder::class]);

    expect([Country::count(), City::count(), Amenity::count()])->toBe($counts);
});

test('in production the seeder only loads reference data, never demo accounts', function () {
    app()['env'] = 'production';

    $this->artisan('db:seed', ['--force' => true])->assertSuccessful();

    expect(Country::count())->toBeGreaterThan(0)
        ->and(User::count())->toBe(0)
        ->and(Property::count())->toBe(0);
});

test('a staging server gets demo listings but no demo administrator', function () {
    app()['env'] = 'staging';

    $this->seed();

    expect(Property::query()->published()->count())->toBeGreaterThan(0)
        ->and(User::query()->where('email', 'admin@guesthoster.test')->exists())->toBeFalse()
        ->and(User::query()->where('role', UserRole::Admin)->exists())->toBeFalse();
});
