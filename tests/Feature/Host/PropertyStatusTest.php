<?php

use App\Enums\PropertyStatus;
use App\Models\City;
use App\Models\Property;
use App\Models\PropertyImage;

function completeDraft(array $attributes = []): Property
{
    $property = Property::factory()->create(array_merge([
        'city_id' => City::factory(),
        'address' => '1 place du Marché',
        'price_per_night' => 9000,
    ], $attributes));
    PropertyImage::factory()->for($property)->count(Property::MIN_PHOTOS)->create();

    return $property;
}

test('a complete draft can be sent for review', function () {
    $property = completeDraft();

    $this->actingAs($property->owner)
        ->post(route('host.properties.submit', $property))
        ->assertRedirect();

    expect($property->refresh())
        ->status->toBe(PropertyStatus::Pending)
        ->submitted_at->not->toBeNull();
});

test('an incomplete draft is sent back to the first missing step', function () {
    $property = completeDraft(['price_per_night' => 0]);

    $this->actingAs($property->owner)
        ->post(route('host.properties.submit', $property))
        ->assertRedirect(route('host.properties.edit', ['property' => $property, 'step' => 'pricing']))
        ->assertInertiaFlash('toast.type', 'error');

    expect($property->refresh()->status)->toBe(PropertyStatus::Draft);
});

test('photos still being processed do not count for submission', function () {
    $property = completeDraft();
    $property->images()->first()?->forceFill(['processed_at' => null])->save();

    expect($property->missingRequirements())->toHaveKey('photos');
});

test('a rejected listing can be resubmitted and loses its rejection reason', function () {
    $property = completeDraft();
    $property->forceFill(['status' => PropertyStatus::Rejected, 'rejection_reason' => 'Photos floues.'])->save();

    $this->actingAs($property->owner)->post(route('host.properties.submit', $property));

    expect($property->refresh())
        ->status->toBe(PropertyStatus::Pending)
        ->rejection_reason->toBeNull();
});

test('hosts can withdraw, archive and restore their listings', function () {
    $property = completeDraft();
    $property->forceFill(['status' => PropertyStatus::Pending])->save();

    $this->actingAs($property->owner)->post(route('host.properties.withdraw', $property));
    expect($property->refresh()->status)->toBe(PropertyStatus::Draft);

    $this->actingAs($property->owner)->post(route('host.properties.archive', $property));
    expect($property->refresh()->status)->toBe(PropertyStatus::Archived);

    $this->actingAs($property->owner)->post(route('host.properties.restore', $property));
    expect($property->refresh()->status)->toBe(PropertyStatus::Draft);
});

test('hosts cannot publish their own listing', function () {
    $property = Property::factory()->published()->create();

    $this->actingAs($property->owner)
        ->post(route('host.properties.submit', $property))
        ->assertInertiaFlash('toast.type', 'error');

    expect($property->refresh()->status)->toBe(PropertyStatus::Published);
});
