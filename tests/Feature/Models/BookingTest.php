<?php

use App\Enums\BookingStatus;
use App\Exceptions\InvalidStatusTransition;
use App\Models\Booking;
use App\Models\Property;
use Carbon\CarbonImmutable;

function overlappingCount(Property $property, string $checkIn, string $checkOut): int
{
    return Booking::query()
        ->whereBelongsTo($property)
        ->overlapping(CarbonImmutable::parse($checkIn), CarbonImmutable::parse($checkOut))
        ->count();
}

test('consecutive stays do not overlap', function () {
    $property = Property::factory()->published()->create();
    Booking::factory()->for($property)->between('2027-03-10', '2027-03-15')->create();

    expect(overlappingCount($property, '2027-03-15', '2027-03-18'))->toBe(0)
        ->and(overlappingCount($property, '2027-03-05', '2027-03-10'))->toBe(0);
});

test('intersecting stays overlap', function (string $checkIn, string $checkOut) {
    $property = Property::factory()->published()->create();
    Booking::factory()->for($property)->between('2027-03-10', '2027-03-15')->create();

    expect(overlappingCount($property, $checkIn, $checkOut))->toBe(1);
})->with([
    'starts inside' => ['2027-03-14', '2027-03-20'],
    'ends inside' => ['2027-03-08', '2027-03-11'],
    'contains it' => ['2027-03-01', '2027-03-30'],
    'contained' => ['2027-03-11', '2027-03-12'],
]);

test('a booking gets a unique reference and frozen prices on creation', function () {
    config(['booking.service_fee_rate' => 0.1]);
    $property = Property::factory()->published()->create(['price_per_night' => 8000, 'cleaning_fee' => 2500]);

    $booking = Booking::factory()->for($property)->between('2027-05-01', '2027-05-04')->create();

    expect($booking->reference)->toMatch('/^GH-[A-Z0-9]{8}$/')
        ->and($booking->nights)->toBe(3)
        ->and($booking->service_fee)->toBe(2650)
        ->and($booking->total_price)->toBe(3 * 8000 + 2500 + 2650)
        ->and($booking->booking_mode)->toBe($property->booking_mode);
});

test('allowed transitions update the status and stamp the matching date', function () {
    $booking = Booking::factory()->create();

    $booking->transitionTo(BookingStatus::AwaitingPayment);
    $booking->transitionTo(BookingStatus::Confirmed);

    expect($booking->refresh()->status)->toBe(BookingStatus::Confirmed)
        ->and($booking->approved_at)->not->toBeNull()
        ->and($booking->confirmed_at)->not->toBeNull();
});

test('forbidden transitions throw and leave the booking untouched', function () {
    $booking = Booking::factory()->cancelled()->create();

    expect(fn () => $booking->transitionTo(BookingStatus::Confirmed))
        ->toThrow(InvalidStatusTransition::class);

    expect($booking->refresh()->status)->toBe(BookingStatus::Cancelled);
});
