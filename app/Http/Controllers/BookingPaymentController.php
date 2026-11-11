<?php

namespace App\Http\Controllers;

use App\Actions\Bookings\ConfirmBookingPayment;
use App\Models\Booking;
use App\Payments\PaymentGateway;
use App\Payments\PaymentUnavailable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

class BookingPaymentController extends Controller
{
    /**
     * Sends the guest to the Stripe hosted payment page.
     */
    public function store(Booking $booking, PaymentGateway $payments): Response
    {
        Gate::authorize('pay', $booking);

        try {
            $checkout = $payments->createCheckout(
                $booking,
                successUrl: route('bookings.payment.return', $booking).'?session_id={CHECKOUT_SESSION_ID}',
                cancelUrl: route('bookings.show', $booking),
            );
        } catch (PaymentUnavailable $exception) {
            Inertia::flash('toast', ['type' => 'error', 'message' => $exception->getMessage()]);

            return to_route('bookings.show', $booking);
        }

        $booking->forceFill(['stripe_checkout_session_id' => $checkout->id])->save();

        return Inertia::location($checkout->url);
    }

    /**
     * Back from Stripe: the session is checked right away so the guest does
     * not have to wait for the webhook.
     */
    public function return(Request $request, Booking $booking, PaymentGateway $payments, ConfirmBookingPayment $confirmPayment): RedirectResponse
    {
        Gate::authorize('view', $booking);

        $sessionId = $request->string('session_id')->value();

        try {
            $checkout = $sessionId !== '' ? $payments->findPaidCheckout($sessionId) : null;
        } catch (PaymentUnavailable) {
            $checkout = null;
        }

        if ($checkout !== null && $checkout->bookingReference === $booking->reference) {
            $confirmPayment->handle($checkout);
        }

        Inertia::flash('toast', $booking->refresh()->isPaid()
            ? ['type' => 'success', 'message' => 'Paiement reçu, votre séjour est confirmé !']
            : ['type' => 'info', 'message' => 'Paiement en cours de vérification, cette page se mettra à jour.']);

        return to_route('bookings.show', $booking);
    }
}
