<?php

namespace App\Http\Controllers;

use App\Actions\Bookings\CancelBooking;
use App\Actions\Bookings\CreateBooking;
use App\Http\Requests\CancelBookingRequest;
use App\Http\Requests\StoreBookingRequest;
use App\Http\Resources\BookingResource;
use App\Http\Resources\PropertyCardResource;
use App\Models\Booking;
use App\Models\Property;
use App\Payments\PaymentUnavailable;
use App\Payments\RefundPolicy;
use App\Pricing\PricingCalculator;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class BookingController extends Controller
{
    private const RELATIONS = ['property.city.country', 'property.coverImage', 'property.owner', 'guest'];

    /**
     * The guest's trips.
     */
    public function index(Request $request): Response
    {
        $bookings = Booking::query()
            ->whereBelongsTo($request->user(), 'guest')
            ->with(self::RELATIONS)
            ->orderByDesc('check_in')
            ->get();

        return Inertia::render('bookings/index', [
            'bookings' => BookingResource::collection($bookings)->resolve(),
        ]);
    }

    /**
     * Review of the stay before booking.
     */
    public function create(StoreBookingRequest $request, Property $property, PricingCalculator $pricing): Response|RedirectResponse
    {
        abort_unless($property->isListed(), 404);
        $property->load(['city.country', 'propertyType', 'coverImage']);

        $checkIn = $request->checkIn();
        $checkOut = $request->checkOut();

        return Inertia::render('bookings/create', [
            'property' => [
                ...PropertyCardResource::make($property)->resolve(),
                'is_owner' => $property->isOwnedBy($request->user()),
                'min_nights' => $property->min_nights,
                'max_nights' => $property->max_nights,
            ],
            'stay' => [
                'check_in' => $checkIn->toDateString(),
                'check_out' => $checkOut->toDateString(),
                'guests' => min($request->integer('guests'), $property->max_guests),
            ],
            'quote' => $pricing->quote($property, $checkIn, $checkOut)->toArray(),
            'isAvailable' => $property->isAvailableBetween($checkIn, $checkOut),
            'paymentDelay' => $property->booking_mode->value === 'instant'
                ? (int) config('booking.instant_payment_minutes').' minutes'
                : (int) config('booking.approved_payment_hours').' heures',
            'responseDelay' => (int) config('booking.host_response_hours'),
            'refundPolicy' => app(RefundPolicy::class)->summary(),
        ]);
    }

    public function store(StoreBookingRequest $request, Property $property, CreateBooking $createBooking): RedirectResponse
    {
        $booking = $createBooking->handle(
            $request->user(),
            $property,
            $request->checkIn(),
            $request->checkOut(),
            $request->integer('guests'),
            $request->filled('special_requests') ? $request->string('special_requests')->trim()->value() : null,
        );

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => $booking->status->value === 'pending'
                ? 'Demande envoyée à l’hôte. Vous serez prévenu par e-mail de sa réponse.'
                : 'Dates réservées ! Finalisez le paiement pour confirmer votre séjour.',
        ]);

        return to_route('bookings.show', $booking);
    }

    public function show(Booking $booking): Response
    {
        Gate::authorize('view', $booking);

        return Inertia::render('bookings/show', [
            'booking' => BookingResource::make($booking->load([...self::RELATIONS, 'review.author']))->resolve(),
        ]);
    }

    public function cancel(CancelBookingRequest $request, Booking $booking, CancelBooking $cancelBooking): RedirectResponse
    {
        Gate::authorize('cancel', $booking);

        try {
            $cancelBooking->handle($booking->load(['guest', 'property.owner']), $request->user(), $request->reason());
        } catch (PaymentUnavailable $exception) {
            Inertia::flash('toast', ['type' => 'error', 'message' => 'Le remboursement n’a pas pu être effectué, la réservation n’a pas été annulée. Réessayez dans quelques instants.']);

            return to_route('bookings.show', $booking);
        }

        Inertia::flash('toast', ['type' => 'info', 'message' => $booking->refunded_amount > 0
            ? 'La réservation a été annulée et le remboursement est en cours.'
            : 'La réservation a été annulée.']);

        return to_route('bookings.show', $booking);
    }
}
