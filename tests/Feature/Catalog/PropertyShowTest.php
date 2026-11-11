<?php

use App\Models\BlockedPeriod;
use App\Models\Booking;
use App\Models\Property;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('a published listing is public, with its upcoming unavailable dates', function () {
    $property = Property::factory()->published()->withImages(2)->create([
        'latitude' => 48.856613,
        'longitude' => 2.352222,
    ]);
    $booking = Booking::factory()->for($property)->confirmed()->create();
    Booking::factory()->for($property)->cancelled()->create();
    Booking::factory()->for($property)->completed()->create();
    $period = BlockedPeriod::factory()->for($property)->create();

    $this->get(route('properties.show', $property))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('properties/show')
            ->where('property.slug', $property->slug)
            ->has('property.images', 2)
            ->where('property.location', ['lat' => 48.86, 'lng' => 2.35])
            ->missing('property.address')
            ->has('unavailableRanges', 2)
            ->where('unavailableRanges', fn ($ranges) => collect($ranges)->pluck('start')->sort()->values()->all()
                === collect([$booking->check_in->toDateString(), $period->starts_on->toDateString()])->sort()->values()->all())
            ->where('seo.canonical', route('properties.show', $property))
        );
});

test('an unpublished listing is hidden from visitors and other users', function () {
    $property = Property::factory()->pending()->create();

    $this->get(route('properties.show', $property))->assertNotFound();
    $this->actingAs(User::factory()->create())->get(route('properties.show', $property))->assertNotFound();
});

test('an unpublished listing can be previewed by its host and by admins', function () {
    $property = Property::factory()->create();

    $this->actingAs($property->owner)->get(route('properties.show', $property))->assertOk();
    $this->actingAs(User::factory()->admin()->create())->get(route('properties.show', $property))->assertOk();
});

test('an unknown slug answers 404', function () {
    $this->get(route('properties.show', 'inconnu'))->assertNotFound();
});
