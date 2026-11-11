<?php

namespace App\Http\Requests;

use App\Models\Property;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Stay requested by a guest; used both to preview (GET) and to book (POST).
 */
class StoreBookingRequest extends FormRequest
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
        return [
            'check_in' => ['required', 'date_format:Y-m-d', 'after_or_equal:today'],
            'check_out' => ['required', 'date_format:Y-m-d', 'after:check_in', 'before_or_equal:'.today()->addYears(2)->toDateString()],
            'guests' => ['required', 'integer', 'min:1', 'max:30'],
            'special_requests' => ['nullable', 'string', 'max:1000'],
        ];
    }

    /**
     * Invalid dates lead back to the listing, where they can be picked again.
     */
    protected function getRedirectUrl(): string
    {
        $property = $this->route('property');

        return $property instanceof Property
            ? route('properties.show', $property)
            : route('properties.index');
    }

    public function checkIn(): CarbonImmutable
    {
        return CarbonImmutable::parse($this->string('check_in')->value());
    }

    public function checkOut(): CarbonImmutable
    {
        return CarbonImmutable::parse($this->string('check_out')->value());
    }
}
