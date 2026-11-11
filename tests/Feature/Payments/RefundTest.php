<?php

use App\Enums\BookingStatus;
use App\Models\Booking;
use App\Models\User;
use App\Notifications\BookingCancelled;
use App\Notifications\BookingConfirmed;
use App\Notifications\BookingPaymentRefunded;
use Illuminate\Support\Facades\Notification;

beforeEach(function () {
    Notification::fake();
    config(['booking.full_refund_days' => 7, 'booking.late_refund_rate' => 0.5]);
    $this->payments = fakePayments();
});

function paidBooking(int $daysBeforeArrival): Booking
{
    return Booking::factory()->confirmed()->create([
        'check_in' => today()->addDays($daysBeforeArrival),
        'check_out' => today()->addDays($daysBeforeArrival + 3),
        'total_price' => 40000,
        'paid_at' => now()->subDay(),
        'stripe_payment_intent_id' => 'pi_paid',
    ]);
}

test('the refund depends on who cancels and how early', function (int $days, string $who, int $expected) {
    $booking = paidBooking($days);
    $actor = match ($who) {
        'guest' => $booking->guest,
        'host' => $booking->property->owner,
        'admin' => User::factory()->admin()->create(),
    };

    $this->actingAs($actor)->post(route('bookings.cancel', $booking))->assertRedirect();

    expect($booking->refresh())
        ->status->toBe(BookingStatus::Cancelled)
        ->refunded_amount->toBe($expected)
        ->and($this->payments->refunds[0] ?? null)->toBe(['payment_intent' => 'pi_paid', 'amount' => $expected, 'key' => 'cancel-'.$booking->reference]);
})->with([
    'guest, well ahead' => [10, 'guest', 40000],
    'guest, exactly 7 days before' => [7, 'guest', 40000],
    'guest, late' => [3, 'guest', 20000],
    'host, late' => [3, 'host', 40000],
    'admin, late' => [2, 'admin', 40000],
]);

test('cancelling an unpaid booking refunds nothing', function () {
    $booking = Booking::factory()->awaitingPayment()->create();

    $this->actingAs($booking->guest)->post(route('bookings.cancel', $booking));

    expect($booking->refresh()->status)->toBe(BookingStatus::Cancelled)
        ->and($this->payments->refunds)->toBe([]);
});

test('a failed refund leaves the booking confirmed', function () {
    $this->payments->unavailable = true;
    $booking = paidBooking(10);

    $this->actingAs($booking->guest)
        ->post(route('bookings.cancel', $booking))
        ->assertInertiaFlash('toast.type', 'error');

    expect($booking->refresh())
        ->status->toBe(BookingStatus::Confirmed)
        ->refunded_amount->toBe(0);
    Notification::assertNothingSent();
});

test('the booking page previews the refund for the current user', function () {
    $booking = paidBooking(3);

    $this->actingAs($booking->guest)->get(route('bookings.show', $booking))
        ->assertInertia(fn ($page) => $page->where('booking.refund_if_cancelled', 20000));
    $this->actingAs($booking->property->owner)->get(route('bookings.show', $booking))
        ->assertInertia(fn ($page) => $page->where('booking.refund_if_cancelled', 40000));
});

test('confirmation, refund and cancellation emails render', function () {
    $booking = paidBooking(10);
    $booking->forceFill(['refunded_amount' => 40000, 'status' => BookingStatus::Cancelled])->save();

    expect((string) (new BookingConfirmed($booking, 'guest'))->toMail($booking->guest)->render())->toContain(e($booking->property->address))
        ->and((string) (new BookingConfirmed($booking, 'host'))->toMail($booking->property->owner)->render())->toContain('a réglé son séjour')
        ->and((string) (new BookingPaymentRefunded($booking))->toMail($booking->guest)->render())->toContain('400,00')
        ->and((string) (new BookingCancelled($booking, 'host'))->toMail($booking->guest)->render())->toContain('Remboursement');
});
