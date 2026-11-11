<?php

use App\Enums\BookingStatus;
use App\Models\Booking;
use App\Models\StripeEvent;
use App\Notifications\BookingConfirmed;
use App\Notifications\BookingPaymentRefunded;
use Illuminate\Support\Facades\Notification;

beforeEach(function () {
    Notification::fake();
    config(['services.stripe.webhook_secret' => 'whsec_test']);
    $this->payments = fakePayments();
});

test('a completed checkout confirms the booking once, even if Stripe retries', function () {
    $booking = Booking::factory()->awaitingPayment()->create();

    postStripeWebhook(checkoutCompletedEvent($booking))->assertOk();
    postStripeWebhook(checkoutCompletedEvent($booking))->assertOk();

    expect($booking->refresh()->status)->toBe(BookingStatus::Confirmed)
        ->and(StripeEvent::count())->toBe(1);
    Notification::assertSentToTimes($booking->guest, BookingConfirmed::class, 1);
});

test('the webhook and the return page do not confirm twice', function () {
    $booking = Booking::factory()->awaitingPayment()->create();
    $this->payments->markPaid($booking, 'cs_test_webhook');

    $this->actingAs($booking->guest)->get(route('bookings.payment.return', $booking).'?session_id=cs_test_webhook');
    postStripeWebhook(checkoutCompletedEvent($booking, 'evt_after_return'))->assertOk();

    Notification::assertSentToTimes($booking->guest, BookingConfirmed::class, 1);
});

test('events with an invalid signature are rejected', function () {
    $booking = Booking::factory()->awaitingPayment()->create();

    postStripeWebhook(checkoutCompletedEvent($booking), secret: 'whsec_wrong')->assertStatus(400);

    expect($booking->refresh()->status)->toBe(BookingStatus::AwaitingPayment);
});

test('webhooks are refused while no secret is configured', function () {
    config(['services.stripe.webhook_secret' => null]);
    $booking = Booking::factory()->awaitingPayment()->create();

    postStripeWebhook(checkoutCompletedEvent($booking), secret: 'whsec_test')->assertStatus(500);
});

test('a payment arriving after expiry is refunded in full', function () {
    $booking = Booking::factory()->awaitingPayment()->create(['status' => BookingStatus::Expired]);

    postStripeWebhook(checkoutCompletedEvent($booking))->assertOk();

    expect($booking->refresh())
        ->status->toBe(BookingStatus::Expired)
        ->refunded_amount->toBe($booking->total_price)
        ->and($this->payments->refunds)->toHaveCount(1)
        ->and($this->payments->refunds[0]['amount'])->toBe($booking->total_price);
    Notification::assertSentTo($booking->guest, BookingPaymentRefunded::class);
});

test('a payment of the wrong amount is refunded instead of confirming the stay', function () {
    $booking = Booking::factory()->awaitingPayment()->create();

    postStripeWebhook(checkoutCompletedEvent($booking, amount: 100))->assertOk();

    expect($booking->refresh()->status)->toBe(BookingStatus::AwaitingPayment)
        ->and($this->payments->refunds[0]['amount'])->toBe(100);
});

test('other event types are acknowledged and ignored', function () {
    postStripeWebhook(['id' => 'evt_other', 'object' => 'event', 'type' => 'customer.created', 'data' => ['object' => ['id' => 'cus_1', 'object' => 'customer']]])
        ->assertOk();

    expect(StripeEvent::query()->find('evt_other')?->type)->toBe('customer.created');
});
