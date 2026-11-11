<?php

namespace App\Http\Requests;

use App\Enums\PropertySort;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Catalog filters, all carried by the query string.
 *
 * @phpstan-type SearchFilters array{
 *     destination: string|null,
 *     check_in: string|null,
 *     check_out: string|null,
 *     guests: int|null,
 *     price_min: int|null,
 *     price_max: int|null,
 *     types: list<string>,
 *     amenities: list<string>,
 *     instant: bool,
 *     sort: string,
 * }
 */
class PropertySearchRequest extends FormRequest
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
            'destination' => ['nullable', 'string', 'max:100'],
            'check_in' => ['nullable', 'required_with:check_out', 'date_format:Y-m-d', 'after_or_equal:today'],
            'check_out' => ['nullable', 'required_with:check_in', 'date_format:Y-m-d', 'after:check_in'],
            'guests' => ['nullable', 'integer', 'min:1', 'max:30'],
            'price_min' => ['nullable', 'integer', 'min:0', 'max:100000'],
            'price_max' => ['nullable', 'integer', 'min:0', 'max:100000'],
            'types' => ['nullable', 'array'],
            'types.*' => ['string', 'distinct', Rule::exists('property_types', 'slug')->where('is_active', true)],
            'amenities' => ['nullable', 'array'],
            'amenities.*' => ['string', 'distinct', Rule::exists('amenities', 'slug')],
            'instant' => ['nullable', 'boolean'],
            'sort' => ['nullable', Rule::enum(PropertySort::class)],
        ];
    }

    /**
     * Invalid filters lead back to the bare catalog: redirecting to the same
     * URL would loop on a bookmarked or hand-edited query string.
     */
    protected function getRedirectUrl(): string
    {
        return route('properties.index');
    }

    /**
     * Normalized filters, with prices in euros as typed by the visitor.
     *
     * @return SearchFilters
     */
    public function filters(): array
    {
        /** @var list<string> $types */
        $types = array_values($this->array('types'));
        /** @var list<string> $amenities */
        $amenities = array_values($this->array('amenities'));

        return [
            'destination' => $this->filled('destination') ? trim($this->string('destination')->value()) : null,
            'check_in' => $this->filled('check_in') ? $this->string('check_in')->value() : null,
            'check_out' => $this->filled('check_out') ? $this->string('check_out')->value() : null,
            'guests' => $this->filled('guests') ? $this->integer('guests') : null,
            'price_min' => $this->filled('price_min') ? $this->integer('price_min') : null,
            'price_max' => $this->filled('price_max') ? $this->integer('price_max') : null,
            'types' => $types,
            'amenities' => $amenities,
            'instant' => $this->boolean('instant'),
            'sort' => ($this->enum('sort', PropertySort::class) ?? PropertySort::Newest)->value,
        ];
    }

    public function checkIn(): ?CarbonImmutable
    {
        return $this->filled('check_in') ? CarbonImmutable::parse($this->string('check_in')->value()) : null;
    }

    public function checkOut(): ?CarbonImmutable
    {
        return $this->filled('check_out') ? CarbonImmutable::parse($this->string('check_out')->value()) : null;
    }
}
