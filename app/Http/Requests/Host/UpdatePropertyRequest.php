<?php

namespace App\Http\Requests\Host;

use App\Enums\BookingMode;
use App\Enums\PropertyFormStep;
use App\Models\Property;
use Illuminate\Database\Query\Builder;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validates one section of the listing form ; the section comes from the route.
 * Authorization is enforced by the `can:update,property` route middleware.
 */
class UpdatePropertyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return match ($this->step()) {
            PropertyFormStep::Details => self::detailsRules($this->editedProperty()->property_type_id),
            PropertyFormStep::Location => [
                'city_id' => ['required', 'integer', Rule::exists('cities', 'id')->where('is_active', true)],
                'address' => ['required', 'string', 'max:255'],
                'postal_code' => ['nullable', 'string', 'max:20'],
            ],
            PropertyFormStep::Capacity => [
                'max_guests' => ['required', 'integer', 'min:1', 'max:30'],
                'bedrooms' => ['required', 'integer', 'min:0', 'max:30'],
                'beds' => ['required', 'integer', 'min:1', 'max:50'],
                'bathrooms' => ['required', 'integer', 'min:0', 'max:20'],
            ],
            PropertyFormStep::Amenities => [
                'amenities' => ['present', 'array'],
                'amenities.*' => ['integer', 'distinct', Rule::exists('amenities', 'id')],
            ],
            PropertyFormStep::Pricing => [
                'price_per_night' => ['required', 'numeric', 'min:10', 'max:10000', 'decimal:0,2'],
                'cleaning_fee' => ['nullable', 'numeric', 'min:0', 'max:1000', 'decimal:0,2'],
                'min_nights' => ['required', 'integer', 'min:1', 'max:90'],
                'max_nights' => ['nullable', 'integer', 'gte:min_nights', 'max:365'],
                'check_in_time' => ['required', 'date_format:H:i'],
                'check_out_time' => ['required', 'date_format:H:i'],
                'booking_mode' => ['required', Rule::enum(BookingMode::class)],
            ],
            PropertyFormStep::Photos => [],
        };
    }

    /**
     * @return array<string, mixed>
     */
    public static function detailsRules(?int $currentTypeId = null): array
    {
        return [
            'title' => ['required', 'string', 'min:10', 'max:120'],
            'property_type_id' => [
                'required',
                'integer',
                Rule::exists('property_types', 'id')->where(fn (Builder $query) => $query
                    ->where('is_active', true)
                    ->when($currentTypeId, fn (Builder $q, int $id) => $q->orWhere('id', $id))),
            ],
            'description' => ['required', 'string', 'min:80', 'max:5000'],
        ];
    }

    /**
     * A listing keeps its type even if an admin has since deactivated it.
     */
    private function editedProperty(): Property
    {
        /** @var Property $property */
        $property = $this->route('property');

        return $property;
    }

    public function step(): PropertyFormStep
    {
        $step = $this->route('step');

        return $step instanceof PropertyFormStep ? $step : PropertyFormStep::from((string) $step);
    }

    /**
     * Attributes ready for the model: prices typed in euros are stored in cents.
     *
     * @return array<string, mixed>
     */
    public function propertyAttributes(): array
    {
        $attributes = collect($this->validated())->except('amenities');

        if ($this->step() === PropertyFormStep::Pricing) {
            $attributes['price_per_night'] = (int) round((float) $this->input('price_per_night') * 100);
            $attributes['cleaning_fee'] = (int) round((float) $this->input('cleaning_fee', 0) * 100);
        }

        return $attributes->all();
    }
}
