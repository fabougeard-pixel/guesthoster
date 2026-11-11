<?php

namespace App\Http\Controllers\Admin;

use App\Enums\BookingStatus;
use App\Http\Controllers\Controller;
use App\Models\Booking;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Every booking on the platform; details and cancellation go through the shared booking page.
 */
class BookingController extends Controller
{
    public function index(Request $request): Response
    {
        $validated = $request->validate([
            'statut' => ['nullable', Rule::enum(BookingStatus::class)],
            'q' => ['nullable', 'string', 'max:100'],
        ]);
        $status = BookingStatus::tryFrom($validated['statut'] ?? '');

        $bookings = Booking::query()
            ->when($status, fn (Builder $query, BookingStatus $status) => $query->where('status', $status))
            ->when($validated['q'] ?? null, fn (Builder $query, string $search) => $query->where(fn (Builder $query) => $query
                ->where('reference', strtoupper($search))
                ->orWhereHas('guest', fn (Builder $guest) => $guest->whereLike('name', "%{$search}%")->orWhereLike('email', "%{$search}%"))
                ->orWhereHas('property', fn (Builder $property) => $property->whereLike('title', "%{$search}%"))))
            ->with(['guest', 'property.owner'])
            ->latest()
            ->paginate(25)
            ->withQueryString()
            ->through(fn (Booking $booking): array => [
                'reference' => $booking->reference,
                'status' => $booking->status->value,
                'status_label' => $booking->status->label(),
                'mode_label' => $booking->booking_mode->label(),
                'check_in' => $booking->check_in->toDateString(),
                'check_out' => $booking->check_out->toDateString(),
                'guests' => $booking->guests,
                'total_price' => $booking->total_price,
                'service_fee' => $booking->service_fee,
                'refunded_amount' => $booking->refunded_amount,
                'paid' => $booking->paid_at !== null,
                'property' => $booking->property->title,
                'host' => $booking->property->owner->name,
                'guest' => ['name' => $booking->guest->name, 'email' => $booking->guest->email],
                'created_at' => $booking->created_at?->toIso8601String(),
            ]);

        return Inertia::render('admin/bookings/index', [
            'bookings' => $bookings,
            'filters' => ['status' => $status?->value, 'q' => $validated['q'] ?? null],
            'statuses' => BookingStatus::options(),
        ]);
    }
}
