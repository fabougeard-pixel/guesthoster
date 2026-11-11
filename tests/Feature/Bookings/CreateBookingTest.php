<?php

use App\Enums\BookingStatus;
use App\Models\BlockedPeriod;
use App\Models\Booking;
use App\Models\Property;
use App\Models\User;
use App\Notifications\BookingAwaitingPayment;
use App\Notifications\BookingRequested;
use Illuminate\Support\Facades\Notification;

beforeEach(function () {
    Notification::fake();
    config(['booking.service_fee_rate' => 0.1]);
});

function stay(int $inDays = 20, int $nights = 3, int $guests = 2): array
{
    return [
        'check_in' => today()->addDays($inDays)->toDateString(),
        'check_out' => today()->addDays($inDays + $nights)->toDateString(),
        'guests' => $guests,
    ];
}

test('a request is sent to the host with prices frozen at booking time', function () {
    $property = Property::factory()->published()->onRequest()->create(['price_per_night' => 10000, 'cleaning_fee' => 2000, 'min_nights' => 1, 'max_guests' => 4]);
    $guest = User::factory()->create();

    $response = $this->actingAs($guest)->post(route('bookings.store', $property), stay() + ['special_requests' => 'Arrivée tardive']);

    $booking = Booking::query()->sole();
    $response->assertRedirect(route('bookings.show', $booking));

    expect($booking)
        ->status->toBe(BookingStatus::Pending)
        ->user_id->toBe($guest->id)
        ->nights->toBe(3)
        ->total_price->toBe(30000 + 2000 + 3200)
        ->special_requests->toBe('Arrivée tardive')
        ->and($booking->expires_at->lessThanOrEqualTo(now()->addHours(48)))->toBeTrue();

    $property->update(['price_per_night' => 99900]);
    expect($booking->refresh()->price_per_night)->toBe(10000);

    Notification::assertSentTo($property->owner, BookingRequested::class);
});

test('an instant booking holds the dates and waits for payment', function () {
    $property = Property::factory()->published()->instant()->create(['min_nights' => 1, 'max_guests' => 4]);
    $guest = User::factory()->create();

    $this->actingAs($guest)->post(route('bookings.store', $property), stay());

    expect(Booking::query()->sole())
        ->status->toBe(BookingStatus::AwaitingPayment)
        ->approved_at->not->toBeNull();

    Notification::assertSentTo($guest, BookingAwaitingPayment::class);
    Notification::assertNotSentTo($property->owner, BookingRequested::class);
});

test('a request expires at the latest on the day of arrival', function () {
    $property = Property::factory()->published()->onRequest()->create(['min_nights' => 1, 'max_guests' => 4]);

    $this->actingAs(User::factory()->create())->post(route('bookings.store', $property), stay(inDays: 1, nights: 2));

    expect(Booking::query()->sole()->expires_at->toDateTimeString())->toBe(today()->addDay()->startOfDay()->toDateTimeString());
});

test('overlapping dates are refused, consecutive stays are accepted', function () {
    $property = Property::factory()->published()->create(['min_nights' => 1, 'max_guests' => 4]);
    Booking::factory()->for($property)->confirmed()->between(today()->addDays(20)->toDateString(), today()->addDays(23)->toDateString())->create();
    BlockedPeriod::factory()->for($property)->create(['starts_on' => today()->addDays(30), 'ends_on' => today()->addDays(32)]);
    $guest = User::factory()->create();

    $this->actingAs($guest)->post(route('bookings.store', $property), stay(inDays: 22, nights: 2))->assertSessionHasErrors('check_in');
    $this->actingAs($guest)->post(route('bookings.store', $property), stay(inDays: 29, nights: 2))->assertSessionHasErrors('check_in');
    $this->actingAs($guest)->post(route('bookings.store', $property), stay(inDays: 23, nights: 2))->assertSessionHasNoErrors();

    expect(Booking::count())->toBe(2);
});

test('a second guest cannot take dates already requested', function () {
    $property = Property::factory()->published()->onRequest()->create(['min_nights' => 1, 'max_guests' => 4]);

    $this->actingAs(User::factory()->create())->post(route('bookings.store', $property), stay());
    $this->actingAs(User::factory()->create())->post(route('bookings.store', $property), stay())->assertSessionHasErrors('check_in');

    expect(Booking::count())->toBe(1);
});

test('the listing rules are enforced', function (array $attributes, array $stay, string $field) {
    $property = Property::factory()->published()->create($attributes);

    $this->actingAs(User::factory()->create())
        ->post(route('bookings.store', $property), $stay)
        ->assertSessionHasErrors($field);

    expect(Booking::count())->toBe(0);
})->with([
    'too many guests' => [['max_guests' => 2, 'min_nights' => 1], stay(guests: 3), 'guests'],
    'stay too short' => [['max_guests' => 4, 'min_nights' => 5], stay(nights: 3), 'check_out'],
    'stay too long' => [['max_guests' => 4, 'min_nights' => 1, 'max_nights' => 2], stay(nights: 3), 'check_out'],
]);

test('dates in the past or reversed are rejected', function (array $stay) {
    $property = Property::factory()->published()->create();

    $this->actingAs(User::factory()->create())
        ->post(route('bookings.store', $property), $stay)
        ->assertSessionHasErrors();
})->with([
    'past arrival' => [['check_in' => today()->subDay()->toDateString(), 'check_out' => today()->addDay()->toDateString(), 'guests' => 1]],
    'reversed' => [['check_in' => today()->addDays(5)->toDateString(), 'check_out' => today()->addDays(3)->toDateString(), 'guests' => 1]],
]);

test('hosts cannot book their own listing and unpublished listings cannot be booked', function () {
    $own = Property::factory()->published()->create(['min_nights' => 1, 'max_guests' => 4]);
    $draft = Property::factory()->create(['min_nights' => 1, 'max_guests' => 4]);

    $this->actingAs($own->owner)->post(route('bookings.store', $own), stay())->assertSessionHasErrors('check_in');
    $this->actingAs(User::factory()->create())->post(route('bookings.store', $draft), stay())->assertSessionHasErrors('check_in');

    expect(Booking::count())->toBe(0);
});

test('booking requires a verified account', function () {
    $property = Property::factory()->published()->create();

    $this->post(route('bookings.store', $property), stay())->assertRedirect(route('login'));
    $this->actingAs(User::factory()->unverified()->create())
        ->post(route('bookings.store', $property), stay())
        ->assertRedirect(route('verification.notice'));
});
