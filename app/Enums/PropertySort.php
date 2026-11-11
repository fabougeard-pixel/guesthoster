<?php

namespace App\Enums;

use App\Enums\Concerns\HasOptions;

enum PropertySort: string
{
    use HasOptions;

    case Newest = 'newest';
    case PriceAsc = 'price_asc';
    case PriceDesc = 'price_desc';
    case TopRated = 'top_rated';

    public function label(): string
    {
        return match ($this) {
            self::Newest => 'Les plus récents',
            self::PriceAsc => 'Prix croissant',
            self::PriceDesc => 'Prix décroissant',
            self::TopRated => 'Les mieux notés',
        };
    }
}
