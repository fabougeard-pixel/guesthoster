<?php

namespace App\Enums\Concerns;

/**
 * Exposes enum cases as `{value, label}` pairs for select inputs and filters.
 *
 * @phpstan-require-implements \BackedEnum
 */
trait HasOptions
{
    abstract public function label(): string;

    /**
     * @return list<array{value: string, label: string}>
     */
    public static function options(): array
    {
        return array_map(
            fn (self $case): array => ['value' => (string) $case->value, 'label' => $case->label()],
            self::cases(),
        );
    }
}
