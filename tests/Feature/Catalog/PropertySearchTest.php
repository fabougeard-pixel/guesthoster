<?php

use App\Enums\BookingMode;
use App\Models\Amenity;
use App\Models\BlockedPeriod;
use App\Models\Booking;
use App\Models\City;
use App\Models\Country;
use App\Models\Property;
use App\Models\PropertyType;
use Inertia\Testing\AssertableInertia as Assert;

/**
 * Slugs of the listings returned by the catalog for the given filters.
 *
 * @param  array<string, mixed>  $query
 * @return list<string>
 */
function searchSlugs(array $query = []): array
{
    $slugs = [];

    test()->get(route('properties.index', $query))
        ->assertOk()
        ->assertInertia(function (Assert $page) use (&$slugs) {
            $page->component('properties/index');
            $slugs = collect($page->toArray()['props']['properties']['data'])->pluck('slug')->all();
        });

    return $slugs;
}

test('only published listings are listed', function () {
    $published = Property::factory()->published()->create();
    Property::factory()->create();
    Property::factory()->pending()->create();
    Property::factory()->rejected()->create();
    Property::factory()->archived()->create();

    expect(searchSlugs())->toBe([$published->slug]);
});

test('listings can be searched by city or country name', function () {
    $italy = Country::factory()->create(['name' => 'Italie']);
    $rome = Property::factory()->published()->for(City::factory()->for($italy)->create(['name' => 'Rome']))->create();
    $paris = Property::factory()->published()->for(City::factory()->create(['name' => 'Paris']))->create();

    expect(searchSlugs(['destination' => 'paris']))->toBe([$paris->slug])
        ->and(searchSlugs(['destination' => 'Italie']))->toBe([$rome->slug]);
});

test('listings can be filtered by capacity, price, type, amenities and instant booking', function () {
    $wifi = Amenity::factory()->create(['slug' => 'wifi']);
    $house = PropertyType::factory()->create(['slug' => 'maison', 'name' => 'Maison'])->id;
    $room = PropertyType::factory()->create(['slug' => 'chambre', 'name' => 'Chambre'])->id;
    PropertyType::factory()->create(['slug' => 'villa', 'name' => 'Villa']);
    $match = Property::factory()->published()->create([
        'max_guests' => 4,
        'price_per_night' => 9000,
        'property_type_id' => $house,
        'booking_mode' => BookingMode::Instant,
    ]);
    $match->amenities()->attach($wifi);

    Property::factory()->published()->create(['max_guests' => 2, 'price_per_night' => 9000, 'property_type_id' => $house, 'booking_mode' => BookingMode::Instant])->amenities()->attach($wifi);
    Property::factory()->published()->create(['max_guests' => 4, 'price_per_night' => 20000, 'property_type_id' => $house, 'booking_mode' => BookingMode::Instant])->amenities()->attach($wifi);
    Property::factory()->published()->create(['max_guests' => 4, 'price_per_night' => 9000, 'property_type_id' => $room, 'booking_mode' => BookingMode::Instant])->amenities()->attach($wifi);
    Property::factory()->published()->create(['max_guests' => 4, 'price_per_night' => 9000, 'property_type_id' => $house, 'booking_mode' => BookingMode::Request])->amenities()->attach($wifi);
    Property::factory()->published()->create(['max_guests' => 4, 'price_per_night' => 9000, 'property_type_id' => $house, 'booking_mode' => BookingMode::Instant]);

    expect(searchSlugs([
        'guests' => 3,
        'price_min' => 50,
        'price_max' => 100,
        'types' => ['maison', 'villa'],
        'amenities' => ['wifi'],
        'instant' => 1,
    ]))->toBe([$match->slug]);
});

test('listings booked or blocked during the stay are excluded, consecutive stays are not', function () {
    $free = Property::factory()->published()->create(['min_nights' => 1]);
    $bookedBefore = Property::factory()->published()->create(['min_nights' => 1]);
    $booked = Property::factory()->published()->create(['min_nights' => 1]);
    $blocked = Property::factory()->published()->create(['min_nights' => 1]);
    $cancelled = Property::factory()->published()->create(['min_nights' => 1]);
    $tooShort = Property::factory()->published()->create(['min_nights' => 5]);

    $checkIn = today()->addDays(30);
    $checkOut = $checkIn->addDays(3);

    Booking::factory()->for($bookedBefore)->confirmed()->between($checkIn->subDays(4)->toDateString(), $checkIn->toDateString())->create();
    Booking::factory()->for($booked)->confirmed()->between($checkIn->addDay()->toDateString(), $checkOut->addDay()->toDateString())->create();
    BlockedPeriod::factory()->for($blocked)->create(['starts_on' => $checkIn->subDay(), 'ends_on' => $checkIn->addDay()]);
    Booking::factory()->for($cancelled)->cancelled()->between($checkIn->toDateString(), $checkOut->toDateString())->create();

    $slugs = searchSlugs(['check_in' => $checkIn->toDateString(), 'check_out' => $checkOut->toDateString()]);

    expect($slugs)->toEqualCanonicalizing([$free->slug, $bookedBefore->slug, $cancelled->slug])
        ->not->toContain($booked->slug, $blocked->slug, $tooShort->slug);
});

test('listings can be sorted by price', function () {
    $cheap = Property::factory()->published()->create(['price_per_night' => 5000]);
    $expensive = Property::factory()->published()->create(['price_per_night' => 15000]);

    expect(searchSlugs(['sort' => 'price_asc']))->toBe([$cheap->slug, $expensive->slug])
        ->and(searchSlugs(['sort' => 'price_desc']))->toBe([$expensive->slug, $cheap->slug]);
});

test('results are paginated for infinite scrolling', function () {
    Property::factory()->published()->count(14)->create();

    $this->get(route('properties.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->has('properties.data', 12)
            ->where('total', 14)
        );

    $this->get(route('properties.index', ['page' => 2]))
        ->assertInertia(fn (Assert $page) => $page->has('properties.data', 2));
});

test('invalid filters redirect to the bare catalog with errors', function (array $query, string $field) {
    $this->get(route('properties.index', $query))
        ->assertRedirect(route('properties.index'))
        ->assertSessionHasErrors($field);
})->with([
    'departure before arrival' => [['check_in' => now()->addDays(5)->toDateString(), 'check_out' => now()->addDays(3)->toDateString()], 'check_out'],
    'arrival in the past' => [['check_in' => now()->subDay()->toDateString(), 'check_out' => now()->addDay()->toDateString()], 'check_in'],
    'arrival without departure' => [['check_in' => now()->addDay()->toDateString()], 'check_out'],
    'unknown type' => [['types' => ['castle']], 'types.0'],
]);
