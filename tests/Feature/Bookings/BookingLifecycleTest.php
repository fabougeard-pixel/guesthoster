<?php

use App\Enums\BookingStatus;
use App\Models\Booking;
use App\Models\User;
use App\Notifications\BookingAwaitingPayment;
use App\Notifications\BookingCancelled;
use App\Notifications\BookingDeclined;
use Illuminate\Support\Facades\Notification;

beforeEach(fn () => Notification::fake());

test('the host accepts a request, which gives the guest a limited time to pay', function () {
    $booking = Booking::factory()->create(['check_in' => today()->addDays(10), 'check_out' => today()->addDays(12)]);

    $this->actingAs($booking->property->owner)
        ->post(route('host.bookings.approve', $booking))
        ->assertRedirect();

    expect($booking->refresh())
        ->status->toBe(BookingStatus::AwaitingPayment)
        ->approved_at->not->toBeNull()
        ->and($booking->expires_at->lessThanOrEqualTo(now()->addHours(24)))->toBeTrue();

    Notification::assertSentTo($booking->guest, BookingAwaitingPayment::class);
});

test('the host declines a request with a message', function () {
    $booking = Booking::factory()->create();

    $this->actingAs($booking->property->owner)
        ->post(route('host.bookings.decline', $booking), ['reason' => 'Logement indisponible pour travaux.']);

    expect($booking->refresh())
        ->status->toBe(BookingStatus::Declined)
        ->cancellation_reason->toBe('Logement indisponible pour travaux.')
        ->cancelled_by->toBe($booking->property->user_id)
        ->and($booking->property->isAvailableBetween($booking->check_in, $booking->check_out))->toBeTrue();

    Notification::assertSentTo($booking->guest, BookingDeclined::class);
});

test('only the host of the listing can answer, and only a pending request', function () {
    $booking = Booking::factory()->create();
    $confirmed = Booking::factory()->confirmed()->create();

    $this->actingAs(User::factory()->host()->create())->post(route('host.bookings.approve', $booking))->assertForbidden();
    $this->actingAs($booking->guest)->post(route('host.bookings.approve', $booking))->assertForbidden();
    $this->actingAs($confirmed->property->owner)->post(route('host.bookings.decline', $confirmed))->assertForbidden();

    expect($booking->refresh()->status)->toBe(BookingStatus::Pending);
});

test('the guest cancels and the host is told', function () {
    $booking = Booking::factory()->confirmed()->create();

    $this->actingAs($booking->guest)
        ->post(route('bookings.cancel', $booking), ['reason' => 'Changement de programme'])
        ->assertRedirect(route('bookings.show', $booking));

    expect($booking->refresh())
        ->status->toBe(BookingStatus::Cancelled)
        ->cancelled_by->toBe($booking->user_id);

    Notification::assertSentTo($booking->property->owner, BookingCancelled::class, fn (BookingCancelled $notification) => $notification->cancelledBy === 'guest');
    Notification::assertNotSentTo($booking->guest, BookingCancelled::class);
});

test('the host can cancel too, and the guest is told', function () {
    $booking = Booking::factory()->awaitingPayment()->create();

    $this->actingAs($booking->property->owner)->post(route('bookings.cancel', $booking));

    expect($booking->refresh()->status)->toBe(BookingStatus::Cancelled);
    Notification::assertSentTo($booking->guest, BookingCancelled::class, fn (BookingCancelled $notification) => $notification->cancelledBy === 'host');
});

test('an admin cancellation is told to both parties', function () {
    $booking = Booking::factory()->confirmed()->create();

    $this->actingAs(User::factory()->admin()->create())->post(route('bookings.cancel', $booking));

    Notification::assertSentTo([$booking->guest, $booking->property->owner], BookingCancelled::class);
});

test('a booking cannot be cancelled by a stranger, once started, or when already over', function (Closure $makeBooking, ?Closure $actor) {
    $booking = $makeBooking();
    $user = $actor ? $actor() : $booking->guest;

    $this->actingAs($user)->post(route('bookings.cancel', $booking))->assertForbidden();
})->with([
    'stranger' => [fn () => Booking::factory()->confirmed()->create(), fn () => User::factory()->create()],
    'stay started' => [fn () => Booking::factory()->confirmed()->create(['check_in' => today(), 'check_out' => today()->addDays(2)]), null],
    'already cancelled' => [fn () => Booking::factory()->cancelled()->create(), null],
    'completed' => [fn () => Booking::factory()->completed()->create(), null],
]);
