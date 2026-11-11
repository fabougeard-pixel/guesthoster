<?php

use App\Models\Booking;
use App\Payments\PaymentGateway;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Tests\Fakes\FakePaymentGateway;
use Tests\TestCase;

/*
|--------------------------------------------------------------------------
| Test Case
|--------------------------------------------------------------------------
|
| The closure you provide to your test functions is always bound to a specific PHPUnit test
| case class. By default, that class is "PHPUnit\Framework\TestCase". Of course, you may
| need to change it using the "pest()" function to bind different classes or traits.
|
*/

pest()->extend(TestCase::class)
    ->use(RefreshDatabase::class)
    ->in('Feature');

/*
|--------------------------------------------------------------------------
| Expectations
|--------------------------------------------------------------------------
|
| When you're writing tests, you often need to check that values meet certain conditions. The
| "expect()" function gives you access to a set of "expectations" methods that you can use
| to assert different things. Of course, you may extend the Expectation API at any time.
|
*/

expect()->extend('toBeOne', function () {
    return $this->toBe(1);
});

/*
|--------------------------------------------------------------------------
| Functions
|--------------------------------------------------------------------------
|
| While Pest is very powerful out-of-the-box, you may have some testing code specific to your
| project that you don't want to repeat in every file. Here you can also expose helpers as
| global functions to help you to reduce the number of lines of code in your test files.
|
*/

function something()
{
    // ..
}

/**
 * Swaps the payment provider for an in-memory fake.
 */
function fakePayments(): FakePaymentGateway
{
    $fake = new FakePaymentGateway;
    app()->instance(PaymentGateway::class, $fake);

    return $fake;
}

/**
 * Posts a Stripe webhook signed with the configured secret.
 *
 * @param  array<string, mixed>  $event
 */
function postStripeWebhook(array $event, ?string $secret = null): TestResponse
{
    $secret ??= (string) config('services.stripe.webhook_secret');
    $payload = json_encode($event, JSON_THROW_ON_ERROR);
    $timestamp = time();
    $signature = hash_hmac('sha256', "{$timestamp}.{$payload}", $secret);

    return test()->call('POST', route('stripe.webhook'), [], [], [], [
        'HTTP_STRIPE_SIGNATURE' => "t={$timestamp},v1={$signature}",
        'CONTENT_TYPE' => 'application/json',
    ], $payload);
}

/**
 * A `checkout.session.completed` event for the given booking.
 *
 * @return array<string, mixed>
 */
function checkoutCompletedEvent(Booking $booking, string $eventId = 'evt_test_1', ?int $amount = null): array
{
    return [
        'id' => $eventId,
        'object' => 'event',
        'type' => 'checkout.session.completed',
        'data' => ['object' => [
            'id' => 'cs_test_webhook',
            'object' => 'checkout.session',
            'payment_status' => 'paid',
            'client_reference_id' => $booking->reference,
            'metadata' => ['booking_reference' => $booking->reference],
            'payment_intent' => 'pi_'.$booking->reference,
            'amount_total' => $amount ?? $booking->total_price,
        ]],
    ];
}
