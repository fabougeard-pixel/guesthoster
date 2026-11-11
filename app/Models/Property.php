<?php

namespace App\Models;

use App\Enums\BookingMode;
use App\Enums\BookingStatus;
use App\Enums\PropertyStatus;
use App\Exceptions\InvalidStatusTransition;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Database\Factories\PropertyFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\RouteKey;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Str;

/**
 * A listing offered by a host. Amounts are stored in cents.
 *
 * @property int $id
 * @property int $user_id
 * @property int|null $city_id
 * @property string $title
 * @property string $slug
 * @property string $description
 * @property int $property_type_id
 * @property PropertyStatus $status
 * @property BookingMode $booking_mode
 * @property string|null $address
 * @property string|null $postal_code
 * @property float|null $latitude
 * @property float|null $longitude
 * @property int $max_guests
 * @property int $bedrooms
 * @property int $beds
 * @property int $bathrooms
 * @property int $price_per_night
 * @property int $cleaning_fee
 * @property int $min_nights
 * @property int|null $max_nights
 * @property string $check_in_time
 * @property string $check_out_time
 * @property string|null $rejection_reason
 * @property CarbonImmutable|null $submitted_at
 * @property CarbonImmutable|null $published_at
 * @property float|null $rating_average
 * @property int $reviews_count
 * @property CarbonImmutable|null $created_at
 * @property CarbonImmutable|null $updated_at
 * @property-read User $owner
 * @property-read City|null $city
 * @property-read PropertyType $propertyType
 * @property-read Collection<int, PropertyImage> $images
 */
#[Fillable([
    'title', 'description', 'property_type_id', 'booking_mode', 'address', 'postal_code', 'city_id',
    'latitude', 'longitude', 'max_guests', 'bedrooms', 'beds', 'bathrooms',
    'price_per_night', 'cleaning_fee', 'min_nights', 'max_nights', 'check_in_time', 'check_out_time',
])]
#[RouteKey('slug')]
class Property extends Model
{
    /** @use HasFactory<PropertyFactory> */
    use HasFactory;

    /**
     * @var array<string, mixed>
     */
    protected $attributes = [
        'status' => 'draft',
        'booking_mode' => 'request',
        'rating_average' => null,
        'reviews_count' => 0,
    ];

    protected static function booted(): void
    {
        static::creating(function (Property $property): void {
            if (blank($property->slug)) {
                $property->slug = Str::slug(Str::limit($property->title, 60, '')).'-'.Str::lower(Str::random(6));
            }
        });

        static::deleting(function (Property $property): void {
            $property->images()->get()->each->delete();
        });
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => PropertyStatus::class,
            'booking_mode' => BookingMode::class,
            'latitude' => 'float',
            'longitude' => 'float',
            'max_guests' => 'integer',
            'bedrooms' => 'integer',
            'beds' => 'integer',
            'bathrooms' => 'integer',
            'price_per_night' => 'integer',
            'cleaning_fee' => 'integer',
            'min_nights' => 'integer',
            'max_nights' => 'integer',
            'submitted_at' => 'datetime',
            'published_at' => 'datetime',
            'rating_average' => 'float',
            'reviews_count' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * @return BelongsTo<City, $this>
     */
    public function city(): BelongsTo
    {
        return $this->belongsTo(City::class);
    }

    /**
     * @return BelongsTo<PropertyType, $this>
     */
    public function propertyType(): BelongsTo
    {
        return $this->belongsTo(PropertyType::class);
    }

    /**
     * @return HasMany<PropertyImage, $this>
     */
    public function images(): HasMany
    {
        return $this->hasMany(PropertyImage::class)->orderBy('position')->orderBy('id');
    }

    /**
     * First processed photo.
     *
     * @return HasOne<PropertyImage, $this>
     */
    public function coverImage(): HasOne
    {
        return $this->hasOne(PropertyImage::class)->ofMany(
            ['position' => 'min', 'id' => 'min'],
            fn (Builder $query) => $query->whereNotNull('processed_at'),
        );
    }

    /**
     * @return BelongsToMany<Amenity, $this>
     */
    public function amenities(): BelongsToMany
    {
        return $this->belongsToMany(Amenity::class)->orderBy('sort_order');
    }

    /**
     * @return HasMany<Review, $this>
     */
    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }

    /**
     * Recompute the denormalized average rating and review count used by the catalogue.
     */
    public function refreshRating(): void
    {
        $this->forceFill([
            'reviews_count' => $this->reviews()->count(),
            'rating_average' => $this->reviews()->avg('rating'),
        ])->save();
    }

    /**
     * @return HasMany<BlockedPeriod, $this>
     */
    public function blockedPeriods(): HasMany
    {
        return $this->hasMany(BlockedPeriod::class)->orderBy('starts_on');
    }

    /**
     * @return HasMany<Booking, $this>
     */
    public function bookings(): HasMany
    {
        return $this->hasMany(Booking::class);
    }

    /**
     * Listings visible in the public catalog.
     *
     * @param  Builder<self>  $query
     */
    #[Scope]
    protected function published(Builder $query): void
    {
        $query->where('status', PropertyStatus::Published)
            ->whereHas('owner', fn (Builder $owner) => $owner->whereNull('suspended_at'));
    }

    /**
     * @param  Builder<self>  $query
     */
    #[Scope]
    protected function ownedBy(Builder $query, User $user): void
    {
        $query->where('user_id', $user->id);
    }

    public function isPublished(): bool
    {
        return $this->status === PropertyStatus::Published;
    }

    /**
     * Published and run by a host whose account is not suspended.
     */
    public function isListed(): bool
    {
        return $this->isPublished() && ! $this->owner->isSuspended();
    }

    public function isOwnedBy(User $user): bool
    {
        return $this->user_id === $user->id;
    }

    /**
     * Photos required before submitting a listing for review.
     */
    public const MIN_PHOTOS = 3;

    public const MAX_PHOTOS = 20;

    /**
     * What is still missing before the listing can be submitted, keyed by form step.
     *
     * @return array<string, string>
     */
    public function missingRequirements(): array
    {
        $missing = [];

        if ($this->city_id === null || blank($this->address)) {
            $missing['location'] = 'Indiquez la ville et l’adresse du logement.';
        }

        if ($this->price_per_night <= 0) {
            $missing['pricing'] = 'Fixez un prix par nuit.';
        }

        if ($this->images()->processed()->count() < self::MIN_PHOTOS) {
            $missing['photos'] = sprintf('Ajoutez au moins %d photos.', self::MIN_PHOTOS);
        }

        return $missing;
    }

    /**
     * Move the listing through its moderation lifecycle, stamping the matching dates.
     *
     * @throws InvalidStatusTransition
     */
    public function transitionTo(PropertyStatus $status): void
    {
        if (! $this->status->canTransitionTo($status)) {
            throw InvalidStatusTransition::between($this->status, $status);
        }

        $this->status = $status;

        match ($status) {
            PropertyStatus::Pending => $this->forceFill(['submitted_at' => now(), 'rejection_reason' => null]),
            PropertyStatus::Published => $this->forceFill(['published_at' => $this->published_at ?? now(), 'rejection_reason' => null]),
            default => null,
        };

        $this->save();
    }

    /**
     * Whether no active booking nor blocked period overlaps [$checkIn, $checkOut).
     */
    public function isAvailableBetween(CarbonInterface $checkIn, CarbonInterface $checkOut): bool
    {
        $hasBooking = $this->bookings()
            ->whereIn('status', BookingStatus::blocking())
            ->overlapping($checkIn, $checkOut)
            ->exists();

        return ! $hasBooking && ! $this->blockedPeriods()->overlapping($checkIn, $checkOut)->exists();
    }
}
