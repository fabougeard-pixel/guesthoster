<?php

use App\Enums\BookingStatus;
use App\Enums\PropertyStatus;

test('a listing goes through moderation before publication', function () {
    expect(PropertyStatus::Draft->canTransitionTo(PropertyStatus::Published))->toBeFalse()
        ->and(PropertyStatus::Draft->canTransitionTo(PropertyStatus::Pending))->toBeTrue()
        ->and(PropertyStatus::Pending->canTransitionTo(PropertyStatus::Published))->toBeTrue()
        ->and(PropertyStatus::Rejected->canTransitionTo(PropertyStatus::Pending))->toBeTrue();
});

test('a booking awaiting the host cannot be confirmed without payment', function () {
    expect(BookingStatus::Pending->canTransitionTo(BookingStatus::Confirmed))->toBeFalse();
});

test('ended bookings are final and release their dates', function (BookingStatus $status) {
    expect($status->isFinal())->toBeTrue()
        ->and(BookingStatus::blocking())->not->toContain($status);
})->with([BookingStatus::Declined, BookingStatus::Cancelled, BookingStatus::Expired, BookingStatus::Completed]);

test('enum options expose value and french label', function () {
    expect(PropertyStatus::options())->toContain(['value' => 'pending', 'label' => 'En attente de validation']);
});
