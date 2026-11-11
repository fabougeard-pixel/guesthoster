<?php

namespace App\Http\Requests\Admin;

use App\Enums\AmenityCategory;
use App\Models\Amenity;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Creation and edition of an amenity. Its slug is set once, at creation, since search URLs use it.
 */
class AmenityRequest extends FormRequest
{
    /**
     * Access is restricted by the `role:admin` route middleware.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        /** @var Amenity|null $amenity */
        $amenity = $this->route('amenity');

        return [
            'name' => ['required', 'string', 'max:60', Rule::unique(Amenity::class)->ignore($amenity)],
            'category' => ['required', Rule::enum(AmenityCategory::class)],
            'icon' => ['nullable', 'string', 'max:50'],
            'sort_order' => ['required', 'integer', 'min:0', 'max:65535'],
        ];
    }
}
