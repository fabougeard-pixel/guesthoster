<?php

namespace App\Http\Controllers\Host;

use App\Actions\Bookings\ApproveBooking;
use App\Actions\Bookings\DeclineBooking;
use App\Enums\BookingStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\CancelBookingRequest;
use App\Http\Resources\BookingResource;
use App\Models\Booking;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class BookingController extends Controller
{
    /**
     * @var array<string, string>
     */
    private const FILTERS = [
        'demandes' => 'Demandes',
        'a-venir' => 'À venir',
        'historique' => 'Historique',
    ];

    /**
     * Bookings received on the host's listings.
     */
    public function index(Request $request): Response
    {
        $validated = $request->validate(['filtre' => ['nullable', Rule::in(array_keys(self::FILTERS))]]);
        $filter = $validated['filtre'] ?? 'demandes';
        $today = today()->toDateString();

        $base = Booking::query()->whereHas('property', fn (Builder $query) => $query->where('user_id', $request->user()?->id));

        $scoped = fn (string $name) => match ($name) {
            'demandes' => (clone $base)->where('status', BookingStatus::Pending)->orderBy('expires_at'),
            'a-venir' => (clone $base)->whereIn('status', [BookingStatus::AwaitingPayment, BookingStatus::Confirmed])
                ->where('check_out', '>', $today)->orderBy('check_in'),
            default => (clone $base)->where(fn (Builder $query) => $query
                ->whereIn('status', [BookingStatus::Declined, BookingStatus::Cancelled, BookingStatus::Expired, BookingStatus::Completed])
                ->orWhere(fn (Builder $past) => $past->where('status', BookingStatus::Confirmed)->where('check_out', '<=', $today)))
                ->orderByDesc('check_in'),
        };

        return Inertia::render('host/bookings/index', [
            'filter' => $filter,
            'filters' => collect(self::FILTERS)->map(fn (string $label, string $value): array => [
                'value' => $value,
                'label' => $label,
                'count' => $value === 'historique' ? null : $scoped($value)->count(),
            ])->values(),
            'bookings' => Inertia::scroll(fn () => BookingResource::collection(
                $scoped($filter)
                    ->with(['property.city.country', 'property.coverImage', 'property.owner', 'guest'])
                    ->paginate(15)
                    ->withQueryString(),
            )),
        ]);
    }

    public function approve(Booking $booking, ApproveBooking $approveBooking): RedirectResponse
    {
        Gate::authorize('respond', $booking);

        $approveBooking->handle($booking->load('guest'));

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Demande acceptée : le voyageur a été invité à payer.']);

        return back();
    }

    public function decline(CancelBookingRequest $request, Booking $booking, DeclineBooking $declineBooking): RedirectResponse
    {
        Gate::authorize('respond', $booking);

        $declineBooking->handle($booking->load('guest'), $request->user(), $request->reason());

        Inertia::flash('toast', ['type' => 'info', 'message' => 'Demande refusée.']);

        return back();
    }
}
