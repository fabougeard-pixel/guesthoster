<?php

namespace App\Http\Resources;

use App\Enums\BookingMode;
use App\Models\Amenity;
use App\Models\Property;
use App\Models\PropertyImage;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Public listing page. The exact address is withheld: only a location rounded
 * to about one kilometre is exposed until a booking is confirmed.
 *
 * Requires `city.country`, `propertyType`, `images`, `amenities` and `owner`. Drafts may have no city yet.
 *
 * @mixin Property
 */
class PropertyDetailResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $latitude = $this->latitude ?? $this->city?->latitude;
        $longitude = $this->longitude ?? $this->city?->longitude;

        return [
            'id' => $this->id,
            'slug' => $this->slug,
            'title' => $this->title,
            'description' => $this->description,
            'type' => $this->propertyType->name,
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'is_instant' => $this->booking_mode === BookingMode::Instant,
            'booking_mode_label' => $this->booking_mode->label(),
            'rating_average' => $this->rating_average,
            'reviews_count' => $this->reviews_count,
            'city' => $this->city?->name,
            'country' => $this->city?->country->name,
            'location' => $latitude !== null && $longitude !== null
                ? ['lat' => round($latitude, 2), 'lng' => round($longitude, 2)]
                : null,
            'max_guests' => $this->max_guests,
            'bedrooms' => $this->bedrooms,
            'beds' => $this->beds,
            'bathrooms' => $this->bathrooms,
            'price_per_night' => $this->price_per_night,
            'cleaning_fee' => $this->cleaning_fee,
            'min_nights' => $this->min_nights,
            'max_nights' => $this->max_nights,
            'check_in_time' => substr($this->check_in_time, 0, 5),
            'check_out_time' => substr($this->check_out_time, 0, 5),
            'images' => $this->images->map(fn (PropertyImage $image): array => [
                'id' => $image->id,
                'url' => $image->url,
                'alt' => $image->alt ?? $this->title,
            ])->values(),
            'amenities' => $this->amenities
                ->groupBy(fn (Amenity $amenity): string => $amenity->category->label())
                ->map(fn ($amenities, string $category): array => [
                    'category' => $category,
                    'items' => $amenities->map(fn (Amenity $amenity): array => [
                        'slug' => $amenity->slug,
                        'name' => $amenity->name,
                    ])->values(),
                ])
                ->values(),
            'host' => [
                'name' => $this->owner->name,
                'member_since' => $this->owner->created_at?->year,
            ],
        ];
    }
}
