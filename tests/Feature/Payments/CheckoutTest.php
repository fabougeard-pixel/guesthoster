<?php

use App\Enums\BookingStatus;
use App\Models\Booking;
use App\Models\User;
use App\Notifications\BookingConfirmed;
use Illuminate\Support\Facades\Notification;

beforeEach(function () {
    Notification::fake();
    $this->payments = fakePayments();
});

test('the guest is sent to the Stripe payment page', function () {
    $booking = Booking::factory()->awaitingPayment()->create();

    $this->actingAs($booking->guest)
        ->post(route('bookings.payment.store', $booking), [], ['X-Inertia' => 'true'])
        ->assertStatus(409)
        ->assertHeader('X-Inertia-Location', 'https://checkout.stripe.test/pay/cs_test_1');

    expect($booking->refresh()->stripe_checkout_session_id)->toBe('cs_test_1')
        ->and($this->payments->checkouts[0]['success'])->toContain('{CHECKOUT_SESSION_ID}');
});

test('only the guest can pay, and only a booking awaiting payment before its deadline', function (Closure $makeBooking, ?Closure $actor) {
    $booking = $makeBooking();

    $this->actingAs($actor ? $actor($booking) : $booking->guest)
        ->post(route('bookings.payment.store', $booking))
        ->assertForbidden();

    expect($this->payments->checkouts)->toBe([]);
})->with([
    'the host' => [fn () => Booking::factory()->awaitingPayment()->create(), fn (Booking $booking) => $booking->property->owner],
    'a stranger' => [fn () => Booking::factory()->awaitingPayment()->create(), fn () => User::factory()->create()],
    'request not accepted yet' => [fn () => Booking::factory()->create(), null],
    'deadline passed' => [fn () => Booking::factory()->awaitingPayment()->create(['expires_at' => now()->subMinute()]), null],
    'already paid' => [fn () => Booking::factory()->confirmed()->create(), null],
]);

test('an unavailable provider keeps the guest on the booking page with a message', function () {
    $this->payments->unavailable = true;
    $booking = Booking::factory()->awaitingPayment()->create();

    $this->actingAs($booking->guest)
        ->post(route('bookings.payment.store', $booking))
        ->assertRedirect(route('bookings.show', $booking))
        ->assertInertiaFlash('toast.type', 'error');
});

test('coming back from a paid checkout confirms the stay and tells both parties', function () {
    $booking = Booking::factory()->awaitingPayment()->create();
    $this->payments->markPaid($booking, 'cs_test_42');

    $this->actingAs($booking->guest)
        ->get(route('bookings.payment.return', $booking).'?session_id=cs_test_42')
        ->assertRedirect(route('bookings.show', $booking))
        ->assertInertiaFlash('toast.type', 'success');

    expect($booking->refresh())
        ->status->toBe(BookingStatus::Confirmed)
        ->paid_at->not->toBeNull()
        ->stripe_payment_intent_id->toBe('pi_'.$booking->reference);

    Notification::assertSentTo($booking->guest, BookingConfirmed::class, fn ($notification) => $notification->recipient === 'guest');
    Notification::assertSentTo($booking->property->owner, BookingConfirmed::class, fn ($notification) => $notification->recipient === 'host');
});

test('coming back without a paid session changes nothing', function () {
    $booking = Booking::factory()->awaitingPayment()->create();
    $other = Booking::factory()->awaitingPayment()->create();
    $this->payments->markPaid($other, 'cs_other');

    $this->actingAs($booking->guest)->get(route('bookings.payment.return', $booking).'?session_id=cs_unknown')
        ->assertInertiaFlash('toast.type', 'info');
    $this->actingAs($booking->guest)->get(route('bookings.payment.return', $booking).'?session_id=cs_other');

    expect($booking->refresh()->status)->toBe(BookingStatus::AwaitingPayment)
        ->and($other->refresh()->status)->toBe(BookingStatus::AwaitingPayment);
});
