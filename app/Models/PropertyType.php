<?php

namespace App\Models;

use Carbon\CarbonImmutable;
use Database\Factories\PropertyTypeFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Kind of property (appartement, maison, gîte…), managed by admins.
 * A deactivated type stays on the listings that use it but is no longer offered.
 *
 * @property int $id
 * @property string $slug
 * @property string $name
 * @property bool $is_active
 * @property int $sort_order
 * @property CarbonImmutable|null $created_at
 * @property CarbonImmutable|null $updated_at
 */
#[Fillable(['slug', 'name', 'is_active', 'sort_order'])]
class PropertyType extends Model
{
    /** @use HasFactory<PropertyTypeFactory> */
    use HasFactory;

    /**
     * @var array<string, mixed>
     */
    protected $attributes = [
        'is_active' => true,
        'sort_order' => 0,
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    /**
     * @return HasMany<Property, $this>
     */
    public function properties(): HasMany
    {
        return $this->hasMany(Property::class);
    }

    /**
     * @param  Builder<self>  $query
     */
    #[Scope]
    protected function active(Builder $query): void
    {
        $query->where('is_active', true);
    }

    /**
     * @param  Builder<self>  $query
     */
    #[Scope]
    protected function ordered(Builder $query): void
    {
        $query->orderBy('sort_order')->orderBy('name');
    }

    /**
     * Choices for a select (ids as strings, like every form option): active
     * types, plus the given one if it has since been deactivated.
     *
     * @return array<int, array{value: string, label: string}>
     */
    public static function options(?int $keepTypeId = null): array
    {
        return self::query()
            ->where(fn (Builder $query) => $query->where('is_active', true)->when($keepTypeId, fn (Builder $q, int $id) => $q->orWhere('id', $id)))
            ->ordered()
            ->get(['id', 'name'])
            ->map(fn (self $type): array => ['value' => (string) $type->id, 'label' => $type->name])
            ->all();
    }
}
