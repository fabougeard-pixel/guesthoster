<?php

namespace App\Models;

use App\Media\CloudinaryStorage;
use Carbon\CarbonImmutable;
use Database\Factories\PropertyImageFactory;
use Illuminate\Database\Eloquent\Attributes\Appends;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

/**
 * A listing photo. Uploads are kept on the private "local" disk until the
 * ProcessPropertyImage job writes the web and thumbnail versions to "public".
 *
 * @property int $id
 * @property int $property_id
 * @property string|null $path version web, sur le disque "public", ou URL absolue (démo)
 * @property string|null $thumbnail_path
 * @property string|null $original_path
 * @property string|null $cloudinary_public_id
 * @property string|null $alt
 * @property int $position
 * @property CarbonImmutable|null $processed_at
 * @property CarbonImmutable|null $created_at
 * @property CarbonImmutable|null $updated_at
 * @property-read string|null $url
 * @property-read string|null $thumbnail_url
 * @property-read Property $property
 */
#[Fillable(['alt', 'position'])]
#[Appends(['url', 'thumbnail_url'])]
class PropertyImage extends Model
{
    /** @use HasFactory<PropertyImageFactory> */
    use HasFactory;

    protected static function booted(): void
    {
        static::deleted(function (PropertyImage $image): void {
            $image->deleteFiles();
        });
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'position' => 'integer',
            'processed_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Property, $this>
     */
    public function property(): BelongsTo
    {
        return $this->belongsTo(Property::class);
    }

    /**
     * @param  Builder<self>  $query
     */
    #[Scope]
    protected function processed(Builder $query): void
    {
        $query->whereNotNull('processed_at');
    }

    public function isProcessed(): bool
    {
        return $this->processed_at !== null;
    }

    /**
     * @return Attribute<string|null, never>
     */
    protected function url(): Attribute
    {
        return Attribute::get(fn (): ?string => self::publicUrl($this->path));
    }

    /**
     * @return Attribute<string|null, never>
     */
    protected function thumbnailUrl(): Attribute
    {
        return Attribute::get(fn (): ?string => self::publicUrl($this->thumbnail_path ?? $this->path));
    }

    public function deleteFiles(): void
    {
        $publicFiles = array_filter(
            [$this->path, $this->thumbnail_path],
            fn (?string $path): bool => $path !== null && ! str_starts_with($path, 'http'),
        );

        if ($publicFiles !== []) {
            Storage::disk('public')->delete($publicFiles);
        }

        if ($this->original_path !== null) {
            Storage::disk('local')->delete($this->original_path);
        }

        if ($this->cloudinary_public_id !== null && $this->cloudinary_public_id !== '') {
            app(CloudinaryStorage::class)->destroy($this->cloudinary_public_id);
        }
    }

    private static function publicUrl(?string $path): ?string
    {
        if ($path === null) {
            return null;
        }

        return str_starts_with($path, 'http') ? $path : Storage::disk('public')->url($path);
    }
}
