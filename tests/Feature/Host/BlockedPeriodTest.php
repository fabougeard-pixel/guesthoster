<?php

use App\Models\BlockedPeriod;
use App\Models\Booking;
use App\Models\Property;
use Inertia\Testing\AssertableInertia as Assert;

test('the calendar shows upcoming bookings and blocked periods', function () {
    $property = Property::factory()->published()->create();
    Booking::factory()->for($property)->confirmed()->create();
    Booking::factory()->for($property)->cancelled()->create();
    BlockedPeriod::factory()->for($property)->create();

    $this->actingAs($property->owner)
        ->get(route('host.properties.calendar', $property))
        ->assertInertia(fn (Assert $page) => $page
            ->component('host/properties/calendar')
            ->has('bookings', 1)
            ->has('blockedPeriods', 1)
        );
});

test('a host blocks free dates', function () {
    $property = Property::factory()->published()->create();
    $start = today()->addDays(10);

    $this->actingAs($property->owner)
        ->post(route('host.properties.blocked-periods.store', $property), [
            'starts_on' => $start->toDateString(),
            'ends_on' => $start->addDays(3)->toDateString(),
            'reason' => 'Travaux',
        ])
        ->assertSessionHasNoErrors();

    expect($property->blockedPeriods()->sole())
        ->reason->toBe('Travaux')
        ->and($property->isAvailableBetween($start, $start->addDay()))->toBeFalse();
});

test('dates overlapping a booking or an existing block cannot be blocked, adjacent ones can', function () {
    $property = Property::factory()->published()->create();
    $start = today()->addDays(10);
    Booking::factory()->for($property)->confirmed()->between($start->toDateString(), $start->addDays(3)->toDateString())->create();
    BlockedPeriod::factory()->for($property)->create(['starts_on' => $start->addDays(5), 'ends_on' => $start->addDays(7)]);

    $block = fn (int $from, int $to) => $this->actingAs($property->owner)->post(route('host.properties.blocked-periods.store', $property), [
        'starts_on' => $start->addDays($from)->toDateString(),
        'ends_on' => $start->addDays($to)->toDateString(),
    ]);

    $block(2, 4)->assertSessionHasErrors('starts_on');
    $block(6, 8)->assertSessionHasErrors('starts_on');
    $block(3, 5)->assertSessionHasNoErrors();
});

test('past dates cannot be blocked', function () {
    $property = Property::factory()->create();

    $this->actingAs($property->owner)
        ->post(route('host.properties.blocked-periods.store', $property), [
            'starts_on' => today()->subDay()->toDateString(),
            'ends_on' => today()->addDay()->toDateString(),
        ])
        ->assertSessionHasErrors('starts_on');
});

test('a block is removed only through its own listing', function () {
    $property = Property::factory()->create();
    $period = BlockedPeriod::factory()->for($property)->create();
    $other = Property::factory()->for($property->owner, 'owner')->create();

    $this->actingAs($property->owner)
        ->delete(route('host.properties.blocked-periods.destroy', ['property' => $other, 'blockedPeriod' => $period]))
        ->assertNotFound();

    $this->actingAs($property->owner)
        ->delete(route('host.properties.blocked-periods.destroy', ['property' => $property, 'blockedPeriod' => $period]));

    expect(BlockedPeriod::count())->toBe(0);
});
