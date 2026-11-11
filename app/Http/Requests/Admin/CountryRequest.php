<?php

namespace App\Http\Requests\Admin;

use App\Models\Country;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Creation and edition of a country.
 */
class CountryRequest extends FormRequest
{
    /**
     * Access is restricted by the `role:admin` route middleware.
     */
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'code' => strtoupper(trim($this->string('code')->toString())),
            'is_active' => $this->boolean('is_active'),
        ]);
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        /** @var Country|null $country */
        $country = $this->route('country');

        return [
            'name' => ['required', 'string', 'max:100'],
            'code' => ['required', 'string', 'size:2', 'alpha', Rule::unique(Country::class)->ignore($country)],
            'flag_emoji' => ['nullable', 'string', 'max:16'],
            'is_active' => ['boolean'],
            'sort_order' => ['required', 'integer', 'min:0', 'max:65535'],
        ];
    }
}
