<?php

namespace App\Http\Requests\Host;

use App\Models\Property;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ReorderPropertyImagesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Every photo of the listing, in the new order.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        /** @var Property $property */
        $property = $this->route('property');

        return [
            'images' => ['required', 'array', 'size:'.$property->images()->count()],
            'images.*' => ['integer', 'distinct', Rule::exists('property_images', 'id')->where('property_id', $property->id)],
        ];
    }
}
