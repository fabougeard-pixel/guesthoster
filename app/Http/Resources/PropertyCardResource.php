<?php

namespace App\Http\Resources;

use App\Enums\BookingMode;
use App\Models\Property;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Compact listing used in result grids. Requires `city.country`, `propertyType` and `coverImage`.
 *
 * @mixin Property
 */
class PropertyCardResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'slug' => $this->slug,
            'title' => $this->title,
            'type' => $this->propertyType->name,
            'city' => $this->city?->name,
            'country' => $this->city?->country->name,
            'cover_url' => $this->coverImage?->thumbnail_url,
            'price_per_night' => $this->price_per_night,
            'max_guests' => $this->max_guests,
            'bedrooms' => $this->bedrooms,
            'is_instant' => $this->booking_mode === BookingMode::Instant,
            'rating_average' => $this->rating_average,
            'reviews_count' => $this->reviews_count,
        ];
    }
}
