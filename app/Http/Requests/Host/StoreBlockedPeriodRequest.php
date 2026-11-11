<?php

namespace App\Http\Requests\Host;

use App\Models\Property;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

/**
 * Dates closed by the host; `ends_on` is the first day available again.
 */
class StoreBlockedPeriodRequest extends FormRequest
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
            'starts_on' => ['required', 'date_format:Y-m-d', 'after_or_equal:today'],
            'ends_on' => ['required', 'date_format:Y-m-d', 'after:starts_on', 'before_or_equal:'.today()->addYears(2)->toDateString()],
            'reason' => ['nullable', 'string', 'max:100'],
        ];
    }

    /**
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($validator->errors()->isNotEmpty()) {
                    return;
                }

                /** @var Property $property */
                $property = $this->route('property');
                [$startsOn, $endsOn] = [$this->startsOn(), $this->endsOn()];

                if ($property->bookings()->blocking()->overlapping($startsOn, $endsOn)->exists()) {
                    $validator->errors()->add('starts_on', 'Ces dates chevauchent une réservation existante.');
                } elseif ($property->blockedPeriods()->overlapping($startsOn, $endsOn)->exists()) {
                    $validator->errors()->add('starts_on', 'Ces dates sont déjà bloquées en partie.');
                }
            },
        ];
    }

    public function startsOn(): CarbonImmutable
    {
        return CarbonImmutable::parse($this->string('starts_on')->value());
    }

    public function endsOn(): CarbonImmutable
    {
        return CarbonImmutable::parse($this->string('ends_on')->value());
    }
}
