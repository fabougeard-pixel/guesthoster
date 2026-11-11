<?php

use App\Models\BlockedPeriod;
use App\Models\Booking;
use App\Models\Property;
use Carbon\CarbonImmutable;

test('a slug is generated from the title on creation', function () {
    $property = Property::factory()->create(['title' => 'Villa avec piscine à Nice']);

    expect($property->slug)->toMatch('/^villa-avec-piscine-a-nice-[a-z0-9]{6}$/')
        ->and($property->getRouteKey())->toBe($property->slug);
});

test('only published listings are in the catalog scope', function () {
    $published = Property::factory()->published()->create();
    Property::factory()->create();
    Property::factory()->pending()->create();
    Property::factory()->rejected()->create();
    Property::factory()->archived()->create();

    expect(Property::query()->published()->pluck('id')->all())->toBe([$published->id]);
});

test('availability ignores bookings that no longer hold their dates', function () {
    $property = Property::factory()->published()->create();
    Booking::factory()->for($property)->cancelled()->between('2027-06-01', '2027-06-05')->create();
    Booking::factory()->for($property)->declined()->between('2027-06-01', '2027-06-05')->create();

    expect($property->isAvailableBetween(CarbonImmutable::parse('2027-06-02'), CarbonImmutable::parse('2027-06-04')))
        ->toBeTrue();
});

test('availability is refused by an active booking or a blocked period', function (string $blocker) {
    $property = Property::factory()->published()->create();

    if ($blocker === 'blocked period') {
        BlockedPeriod::factory()->for($property)->create(['starts_on' => '2027-06-01', 'ends_on' => '2027-06-05']);
    } else {
        Booking::factory()->for($property)->state(['status' => $blocker])->between('2027-06-01', '2027-06-05')->create();
    }

    expect($property->isAvailableBetween(CarbonImmutable::parse('2027-06-04'), CarbonImmutable::parse('2027-06-08')))->toBeFalse()
        ->and($property->isAvailableBetween(CarbonImmutable::parse('2027-06-05'), CarbonImmutable::parse('2027-06-08')))->toBeTrue();
})->with(['pending', 'awaiting_payment', 'confirmed', 'blocked period']);
