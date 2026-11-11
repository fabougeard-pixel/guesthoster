<?php

namespace App\Http\Requests\Host;

use App\Models\Property;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;

/**
 * First step of a new listing: it is saved as a draft right away.
 */
class StorePropertyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return Gate::allows('create', Property::class);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return UpdatePropertyRequest::detailsRules();
    }
}
