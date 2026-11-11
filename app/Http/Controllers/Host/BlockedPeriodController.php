<?php

namespace App\Http\Controllers\Host;

use App\Http\Controllers\Controller;
use App\Http\Requests\Host\StoreBlockedPeriodRequest;
use App\Models\BlockedPeriod;
use App\Models\Booking;
use App\Models\Property;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class BlockedPeriodController extends Controller
{
    public function index(Property $property): Response
    {
        $today = today()->toDateString();

        return Inertia::render('host/properties/calendar', [
            'property' => [
                'slug' => $property->slug,
                'title' => $property->title,
                'status' => $property->status->value,
            ],
            'bookings' => $property->bookings()
                ->blocking()
                ->where('check_out', '>', $today)
                ->orderBy('check_in')
                ->get(['reference', 'check_in', 'check_out', 'status'])
                ->map(fn (Booking $booking): array => [
                    'reference' => $booking->reference,
                    'start' => $booking->check_in->toDateString(),
                    'end' => $booking->check_out->toDateString(),
                    'status_label' => $booking->status->label(),
                ]),
            'blockedPeriods' => $property->blockedPeriods()
                ->where('ends_on', '>', $today)
                ->get()
                ->map(fn (BlockedPeriod $period): array => [
                    'id' => $period->id,
                    'start' => $period->starts_on->toDateString(),
                    'end' => $period->ends_on->toDateString(),
                    'reason' => $period->reason,
                ]),
        ]);
    }

    public function store(StoreBlockedPeriodRequest $request, Property $property): RedirectResponse
    {
        $property->blockedPeriods()->create([
            'starts_on' => $request->startsOn(),
            'ends_on' => $request->endsOn(),
            'reason' => $request->input('reason'),
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Dates bloquées.']);

        return back();
    }

    public function destroy(Property $property, BlockedPeriod $blockedPeriod): RedirectResponse
    {
        $blockedPeriod->delete();

        Inertia::flash('toast', ['type' => 'info', 'message' => 'Dates débloquées.']);

        return back();
    }
}
