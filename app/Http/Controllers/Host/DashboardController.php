<?php

namespace App\Http\Controllers\Host;

use App\Enums\PropertyStatus;
use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Property;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $host = $request->user();
        abort_if($host === null, 403);

        $properties = Property::query()
            ->ownedBy($host)
            ->with(['city', 'coverImage'])
            ->withCount(['bookings as upcoming_bookings_count' => fn ($query) => $query
                ->blocking()
                ->where('check_out', '>', today()->toDateString())])
            ->latest('updated_at')
            ->get();

        return Inertia::render('host/dashboard', [
            'properties' => $properties->map(fn (Property $property): array => [
                'id' => $property->id,
                'slug' => $property->slug,
                'title' => $property->title,
                'city' => $property->city?->name,
                'cover_url' => $property->coverImage?->thumbnail_url,
                'status' => $property->status->value,
                'status_label' => $property->status->label(),
                'price_per_night' => $property->price_per_night,
                'upcoming_bookings' => (int) $property->getAttribute('upcoming_bookings_count'),
                'updated_at' => $property->updated_at?->toIso8601String(),
            ]),
            'stats' => [
                'published' => $properties->where('status', PropertyStatus::Published)->count(),
                'pending' => $properties->where('status', PropertyStatus::Pending)->count(),
                'drafts' => $properties->whereIn('status', [PropertyStatus::Draft, PropertyStatus::Rejected])->count(),
                'upcoming_bookings' => Booking::query()
                    ->blocking()
                    ->where('check_out', '>', today()->toDateString())
                    ->whereIn('property_id', $properties->modelKeys())
                    ->count(),
            ],
        ]);
    }
}
