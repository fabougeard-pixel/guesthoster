<?php

namespace App\Http\Controllers;

use App\Enums\PropertySort;
use App\Http\Requests\PropertySearchRequest;
use App\Http\Resources\PropertyCardResource;
use App\Http\Resources\PropertyDetailResource;
use App\Models\Amenity;
use App\Models\BlockedPeriod;
use App\Models\Booking;
use App\Models\City;
use App\Models\Property;
use App\Models\PropertyType;
use App\Models\Review;
use App\Pricing\PricingCalculator;
use App\Queries\PropertySearch;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class PropertyController extends Controller
{
    private const REVIEWS_SHOWN = 6;

    /**
     * Public catalog with filters carried by the query string.
     */
    public function index(PropertySearchRequest $request): Response
    {
        $filters = $request->filters();
        $properties = (new PropertySearch($filters, $request->checkIn(), $request->checkOut()))
            ->query()
            ->paginate(12)
            ->withQueryString();

        return Inertia::render('properties/index', [
            'properties' => Inertia::scroll(PropertyCardResource::collection($properties)),
            'total' => $properties->total(),
            'filters' => $filters,
            'options' => Inertia::once(fn (): array => [
                'types' => PropertyType::query()->active()->ordered()->get(['slug', 'name'])
                    ->map(fn (PropertyType $type): array => ['value' => $type->slug, 'label' => $type->name]),
                'sorts' => PropertySort::options(),
                'amenities' => Amenity::query()->orderBy('sort_order')->get(['slug', 'name']),
                'destinations' => City::query()->active()->pluck('name'),
            ]),
        ]);
    }

    /**
     * Listing page. Unpublished listings answer 404 to anyone but their host and admins.
     */
    public function show(Property $property, PricingCalculator $pricing): Response
    {
        abort_unless(Gate::allows('view', $property), 404);

        $property->load(['city.country', 'propertyType', 'images' => fn ($query) => $query->processed(), 'amenities', 'owner']);
        $today = today()->toDateString();

        $bookedRanges = $property->bookings()
            ->blocking()
            ->where('check_out', '>', $today)
            ->get(['check_in', 'check_out'])
            ->map(fn (Booking $booking): array => [
                'start' => $booking->check_in->toDateString(),
                'end' => $booking->check_out->toDateString(),
            ]);

        $blockedRanges = $property->blockedPeriods()
            ->where('ends_on', '>', $today)
            ->get(['starts_on', 'ends_on'])
            ->map(fn (BlockedPeriod $period): array => [
                'start' => $period->starts_on->toDateString(),
                'end' => $period->ends_on->toDateString(),
            ]);

        return Inertia::render('properties/show', [
            'property' => PropertyDetailResource::make($property)->resolve(),
            'serviceFeeRate' => $pricing->serviceFeeRate,
            'unavailableRanges' => $bookedRanges->concat($blockedRanges)->sortBy('start')->values(),
            'reviews' => $property->reviews()
                ->with('author')
                ->latest()
                ->limit(self::REVIEWS_SHOWN)
                ->get()
                ->map(fn (Review $review): array => $review->toPublicArray()),
            'seo' => [
                'description' => Str::limit(Str::squish($property->description), 155),
                'canonical' => route('properties.show', $property),
                'image' => $property->images->first()?->url,
            ],
        ]);
    }
}
