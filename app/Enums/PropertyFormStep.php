<?php

namespace App\Enums;

use App\Enums\Concerns\HasOptions;

/**
 * Sections of the host listing form, in display order.
 */
enum PropertyFormStep: string
{
    use HasOptions;

    case Details = 'details';
    case Location = 'location';
    case Capacity = 'capacity';
    case Amenities = 'amenities';
    case Pricing = 'pricing';
    case Photos = 'photos';

    public function label(): string
    {
        return match ($this) {
            self::Details => 'Description',
            self::Location => 'Emplacement',
            self::Capacity => 'Capacité',
            self::Amenities => 'Équipements',
            self::Pricing => 'Tarifs et règles',
            self::Photos => 'Photos',
        };
    }

    public function next(): ?self
    {
        $cases = self::cases();
        $index = array_search($this, $cases, true);

        return $cases[$index + 1] ?? null;
    }
}
