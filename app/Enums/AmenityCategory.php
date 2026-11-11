<?php

namespace App\Enums;

use App\Enums\Concerns\HasOptions;

enum AmenityCategory: string
{
    use HasOptions;

    case Essentials = 'essentials';
    case Kitchen = 'kitchen';
    case Comfort = 'comfort';
    case Outdoor = 'outdoor';
    case Safety = 'safety';

    public function label(): string
    {
        return match ($this) {
            self::Essentials => 'Essentiels',
            self::Kitchen => 'Cuisine',
            self::Comfort => 'Confort',
            self::Outdoor => 'Extérieur',
            self::Safety => 'Sécurité',
        };
    }
}
