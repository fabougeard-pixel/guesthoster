<?php

namespace App\Http\Controllers;

use App\Actions\Bookings\ConfirmBookingPayment;
use App\Models\StripeEvent;
use App\Payments\StripePaymentGateway;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;
use Stripe\Checkout\Session;
use Stripe\Exception\SignatureVerificationException;
use Stripe\Webhook;
use UnexpectedValueException;

/**
 * Stripe webhooks: signed, and handled once per event id.
 */
class StripeWebhookController extends Controller
{
    public function __invoke(Request $request, ConfirmBookingPayment $confirmPayment): Response
    {
        $secret = config('services.stripe.webhook_secret');

        if (! is_string($secret) || $secret === '') {
            Log::error('Webhook Stripe reçu sans STRIPE_WEBHOOK_SECRET configuré.');

            return response('Webhook non configuré.', 500);
        }

        try {
            $event = Webhook::constructEvent($request->getContent(), (string) $request->header('Stripe-Signature'), $secret);
        } catch (UnexpectedValueException|SignatureVerificationException) {
            return response('Signature invalide.', 400);
        }

        if (StripeEvent::query()->whereKey($event->id)->exists()) {
            return response('Déjà traité.', 200);
        }

        $object = $event->data->object;

        if (in_array($event->type, ['checkout.session.completed', 'checkout.session.async_payment_succeeded'], true)
            && $object instanceof Session) {
            $checkout = StripePaymentGateway::paidCheckoutFrom($object);

            if ($checkout !== null) {
                $confirmPayment->handle($checkout);
            }
        }

        StripeEvent::query()->create(['id' => $event->id, 'type' => $event->type, 'processed_at' => now()]);

        return response('OK', 200);
    }
}
