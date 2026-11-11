<?php

namespace App\Http\Requests\Admin;

use App\Models\PropertyType;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Creation and edition of a property type. Its slug is set once, at creation, since search URLs use it.
 */
class PropertyTypeRequest extends FormRequest
{
    /**
     * Access is restricted by the `role:admin` route middleware.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Unticked checkboxes are not submitted: they mean false.
     */
    protected function prepareForValidation(): void
    {
        $this->merge(['is_active' => $this->boolean('is_active')]);
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        /** @var PropertyType|null $propertyType */
        $propertyType = $this->route('propertyType');

        return [
            'name' => ['required', 'string', 'max:60', Rule::unique(PropertyType::class)->ignore($propertyType)],
            'is_active' => ['boolean'],
            'sort_order' => ['required', 'integer', 'min:0', 'max:65535'],
        ];
    }
}
