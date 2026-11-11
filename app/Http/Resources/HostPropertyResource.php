<?php

namespace App\Http\Resources;

use App\Models\Property;
use App\Models\PropertyImage;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Listing as edited by its host. Requires `images` and `amenities`.
 *
 * @mixin Property
 */
class HostPropertyResource extends JsonResource
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
            'property_type_id' => $this->property_type_id,
            'description' => $this->description,
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'rejection_reason' => $this->rejection_reason,
            'city_id' => $this->city_id,
            'address' => $this->address,
            'postal_code' => $this->postal_code,
            'max_guests' => $this->max_guests,
            'bedrooms' => $this->bedrooms,
            'beds' => $this->beds,
            'bathrooms' => $this->bathrooms,
            'amenities' => $this->amenities->modelKeys(),
            'price_per_night' => $this->price_per_night,
            'cleaning_fee' => $this->cleaning_fee,
            'min_nights' => $this->min_nights,
            'max_nights' => $this->max_nights,
            'check_in_time' => substr($this->check_in_time, 0, 5),
            'check_out_time' => substr($this->check_out_time, 0, 5),
            'booking_mode' => $this->booking_mode->value,
            'images' => $this->images->map(fn (PropertyImage $image): array => [
                'id' => $image->id,
                'url' => $image->thumbnail_url,
                'is_processed' => $image->isProcessed(),
            ])->values(),
            'missing' => $this->missingRequirements(),
        ];
    }
}
