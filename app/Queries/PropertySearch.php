<?php

namespace App\Queries;

use App\Enums\BookingMode;
use App\Enums\PropertySort;
use App\Models\Property;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;

/**
 * Builds the public catalog query from validated search filters.
 *
 * @phpstan-import-type SearchFilters from \App\Http\Requests\PropertySearchRequest
 */
class PropertySearch
{
    /**
     * @param  SearchFilters  $filters
     */
    public function __construct(
        private array $filters,
        private ?CarbonImmutable $checkIn = null,
        private ?CarbonImmutable $checkOut = null,
    ) {}

    /**
     * @return Builder<Property>
     */
    public function query(): Builder
    {
        $query = Property::query()
            ->published()
            ->with(['city.country', 'propertyType', 'coverImage']);

        $this->filterByDestination($query);
        $this->filterByAvailability($query);

        $filters = $this->filters;

        $query
            ->when($filters['guests'], fn (Builder $q, int $guests) => $q->where('max_guests', '>=', $guests))
            ->when($filters['price_min'], fn (Builder $q, int $min) => $q->where('price_per_night', '>=', $min * 100))
            ->when($filters['price_max'], fn (Builder $q, int $max) => $q->where('price_per_night', '<=', $max * 100))
            ->when($filters['types'], fn (Builder $q, array $types) => $q->whereHas('propertyType', fn (Builder $type) => $type->whereIn('slug', $types)))
            ->when($filters['instant'], fn (Builder $q) => $q->where('booking_mode', BookingMode::Instant));

        foreach ($filters['amenities'] as $slug) {
            $query->whereHas('amenities', fn (Builder $q) => $q->where('slug', $slug));
        }

        return match (PropertySort::from($filters['sort'])) {
            PropertySort::PriceAsc => $query->orderBy('price_per_night')->orderBy('id'),
            PropertySort::PriceDesc => $query->orderByDesc('price_per_night')->orderBy('id'),
            PropertySort::Newest => $query->orderByDesc('published_at')->orderByDesc('id'),
            PropertySort::TopRated => $query->orderByRaw('rating_average is null')->orderByDesc('rating_average')->orderByDesc('reviews_count')->orderBy('id'),
        };
    }

    /**
     * Matches the city or the country name, case-insensitively.
     *
     * @param  Builder<Property>  $query
     */
    private function filterByDestination(Builder $query): void
    {
        $destination = $this->filters['destination'];

        if ($destination === null) {
            return;
        }

        $term = '%'.mb_strtolower($destination).'%';

        $query->whereHas('city', fn (Builder $city) => $city->where(fn (Builder $match) => $match
            ->whereRaw('lower(name) like ?', [$term])
            ->orWhereHas('country', fn (Builder $country) => $country->whereRaw('lower(name) like ?', [$term]))));
    }

    /**
     * Excludes listings booked or blocked on the requested stay, and those whose
     * minimum or maximum stay does not fit it.
     *
     * @param  Builder<Property>  $query
     */
    private function filterByAvailability(Builder $query): void
    {
        if ($this->checkIn === null || $this->checkOut === null) {
            return;
        }

        [$checkIn, $checkOut] = [$this->checkIn, $this->checkOut];
        $nights = (int) $checkIn->diffInDays($checkOut);

        $query
            ->where('min_nights', '<=', $nights)
            ->where(fn (Builder $q) => $q->whereNull('max_nights')->orWhere('max_nights', '>=', $nights))
            ->whereDoesntHave('bookings', fn (Builder $booking) => $booking
                ->blocking()
                ->overlapping($checkIn, $checkOut))
            ->whereDoesntHave('blockedPeriods', fn (Builder $period) => $period
                ->overlapping($checkIn, $checkOut));
    }
}
