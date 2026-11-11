<?php

namespace App\Enums;

use App\Enums\Concerns\HasOptions;

/**
 * How a listing accepts reservations, chosen by the host for each property.
 */
enum BookingMode: string
{
    use HasOptions;

    case Instant = 'instant';
    case Request = 'request';

    public function label(): string
    {
        return match ($this) {
            self::Instant => 'Réservation instantanée',
            self::Request => 'Sur demande',
        };
    }
}
