<?php

namespace App\Http\Requests\Admin;

use App\Models\City;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Creation and edition of a city.
 */
class CityRequest extends FormRequest
{
    /**
     * Access is restricted by the `role:admin` route middleware.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Unchecked boxes are not submitted: they mean false.
     */
    protected function prepareForValidation(): void
    {
        $this->merge([
            'is_popular' => $this->boolean('is_popular'),
            'is_active' => $this->boolean('is_active'),
        ]);
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        /** @var City|null $city */
        $city = $this->route('city');

        return [
            'country_id' => ['required', 'integer', Rule::exists('countries', 'id')],
            'name' => [
                'required', 'string', 'max:100',
                Rule::unique(City::class)->where('country_id', $this->integer('country_id'))->ignore($city),
            ],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'is_popular' => ['boolean'],
            'is_active' => ['boolean'],
            'sort_order' => ['required', 'integer', 'min:0', 'max:65535'],
        ];
    }
}
