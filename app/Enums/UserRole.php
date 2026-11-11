<?php

namespace App\Enums;

enum UserRole: string
{
    case Client = 'client';
    case Host = 'host';
    case Admin = 'admin';

    /**
     * Human readable label displayed in the interface.
     */
    public function label(): string
    {
        return match ($this) {
            self::Client => 'Voyageur',
            self::Host => 'Hôte',
            self::Admin => 'Administrateur',
        };
    }

    /**
     * Roles a visitor may pick when creating an account.
     *
     * @return list<self>
     */
    public static function registrable(): array
    {
        return [self::Client, self::Host];
    }
}
