<?php

use App\Models\Booking;
use App\Models\Property;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('the review page shows the server quote for the requested stay', function () {
    config(['booking.service_fee_rate' => 0.1]);
    $property = Property::factory()->published()->create(['price_per_night' => 5000, 'cleaning_fee' => 0, 'min_nights' => 1, 'max_guests' => 3]);

    $this->actingAs(User::factory()->create())
        ->get(route('bookings.create', ['property' => $property, 'check_in' => today()->addDays(5)->toDateString(), 'check_out' => today()->addDays(7)->toDateString(), 'guests' => 9]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('bookings/create')
            ->where('quote.total_price', 11000)
            ->where('stay.guests', 3)
            ->where('isAvailable', true)
            ->where('property.is_owner', false)
        );
});

test('guests are asked to log in before reviewing a stay, then come back to it', function () {
    $property = Property::factory()->published()->create();
    $url = route('bookings.create', ['property' => $property, 'check_in' => today()->addDays(5)->toDateString(), 'check_out' => today()->addDays(7)->toDateString(), 'guests' => 1]);

    $this->get($url)->assertRedirect(route('login'));
    expect(session('url.intended'))->toBe($url);
});

test('invalid dates on the review page lead back to the listing', function () {
    $property = Property::factory()->published()->create();

    $this->actingAs(User::factory()->create())
        ->get(route('bookings.create', ['property' => $property, 'check_in' => 'demain']))
        ->assertRedirect(route('properties.show', $property));
});

test('a booking is visible to its guest, its host and admins only', function () {
    $booking = Booking::factory()->create();

    $this->actingAs($booking->guest)->get(route('bookings.show', $booking))->assertOk()
        ->assertInertia(fn (Assert $page) => $page->where('booking.viewer', 'guest')->where('booking.can.cancel', true)->where('booking.can.respond', false));
    $this->actingAs($booking->property->owner)->get(route('bookings.show', $booking))->assertOk()
        ->assertInertia(fn (Assert $page) => $page->where('booking.viewer', 'host')->where('booking.can.respond', true));
    $this->actingAs(User::factory()->admin()->create())->get(route('bookings.show', $booking))->assertOk();
    $this->actingAs(User::factory()->create())->get(route('bookings.show', $booking))->assertForbidden();
});

test('the guest only sees the exact address once the stay is confirmed', function () {
    $property = Property::factory()->published()->create(['address' => '7 rue Secrète']);
    $pending = Booking::factory()->for($property)->create();
    $confirmed = Booking::factory()->for($property)->confirmed()->create(['check_in' => today()->addDays(100), 'check_out' => today()->addDays(102)]);

    $this->actingAs($pending->guest)->get(route('bookings.show', $pending))
        ->assertInertia(fn (Assert $page) => $page->where('booking.property.address', null));
    $this->actingAs($confirmed->guest)->get(route('bookings.show', $confirmed))
        ->assertInertia(fn (Assert $page) => $page->where('booking.property.address', fn ($address) => str_contains($address, '7 rue Secrète')));
});

test('the trips page lists the user own bookings only', function () {
    $guest = User::factory()->create();
    Booking::factory()->for($guest, 'guest')->count(2)->create();
    Booking::factory()->create();

    $this->actingAs($guest)->get(route('bookings.index'))
        ->assertInertia(fn (Assert $page) => $page->component('bookings/index')->has('bookings', 2));
});

test('hosts see the bookings received on their listings, by filter', function () {
    $host = User::factory()->host()->create();
    $property = Property::factory()->for($host, 'owner')->published()->create();
    Booking::factory()->for($property)->count(2)->create();
    Booking::factory()->for($property)->confirmed()->create(['check_in' => today()->addDays(100), 'check_out' => today()->addDays(103)]);
    Booking::factory()->for($property)->completed()->create();
    Booking::factory()->create();

    $this->actingAs($host)->get(route('host.bookings.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('host/bookings/index')
            ->where('filter', 'demandes')
            ->has('bookings.data', 2)
            ->where('filters.0.count', 2)
            ->where('filters.1.count', 1)
        );

    $this->actingAs($host)->get(route('host.bookings.index', ['filtre' => 'historique']))
        ->assertInertia(fn (Assert $page) => $page->has('bookings.data', 1));
});
