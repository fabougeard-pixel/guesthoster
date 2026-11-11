<?php

use App\Enums\BookingMode;
use App\Enums\PropertyStatus;
use App\Models\Amenity;
use App\Models\Booking;
use App\Models\City;
use App\Models\Property;
use App\Models\PropertyImage;
use App\Models\PropertyType;
use App\Models\User;
use Illuminate\Support\Facades\Storage;

function validDetails(array $overrides = []): array
{
    $details = array_merge([
        'title' => 'Appartement lumineux près du port',
        'property_type_id' => fn (): int => PropertyType::factory()->create()->id,
        'description' => str_repeat('Un logement calme et lumineux, idéal pour découvrir la ville. ', 3),
    ], $overrides);

    return array_map(fn (mixed $value): mixed => $value instanceof Closure ? $value() : $value, $details);
}

test('a host creates a draft from the first step', function () {
    $host = User::factory()->host()->create();

    $response = $this->actingAs($host)->post(route('host.properties.store'), validDetails());

    $property = Property::query()->sole();
    $response->assertRedirect(route('host.properties.edit', ['property' => $property, 'step' => 'location']));

    expect($property->user_id)->toBe($host->id)
        ->and($property->status)->toBe(PropertyStatus::Draft)
        ->and($property->slug)->toStartWith('appartement-lumineux-pres-du-port-');
});

test('the status and owner cannot be forced through the form', function () {
    $host = User::factory()->host()->create();

    $this->actingAs($host)->post(route('host.properties.store'), validDetails([
        'status' => 'published',
        'user_id' => User::factory()->create()->id,
    ]));

    expect(Property::query()->sole())
        ->status->toBe(PropertyStatus::Draft)
        ->user_id->toBe($host->id);
});

test('travelers cannot create listings', function () {
    $this->actingAs(User::factory()->create())
        ->post(route('host.properties.store'), validDetails())
        ->assertForbidden();
});

test('the first step is validated', function () {
    $this->actingAs(User::factory()->host()->create())
        ->post(route('host.properties.store'), validDetails(['title' => 'Court', 'property_type_id' => 999, 'description' => 'Trop court']))
        ->assertSessionHasErrors(['title', 'property_type_id', 'description']);

    expect(Property::count())->toBe(0);
});

test('each step saves its own fields and moves to the next one', function () {
    $property = Property::factory()->create();
    $city = City::factory()->create();

    $this->actingAs($property->owner)
        ->patch(route('host.properties.update', ['property' => $property, 'step' => 'location']), [
            'city_id' => $city->id,
            'address' => '12 rue des Lilas',
            'postal_code' => '69001',
        ])
        ->assertRedirect(route('host.properties.edit', ['property' => $property, 'step' => 'capacity']));

    expect($property->refresh())
        ->city_id->toBe($city->id)
        ->address->toBe('12 rue des Lilas');
});

test('prices typed in euros are stored in cents', function () {
    $property = Property::factory()->create();

    $this->actingAs($property->owner)
        ->patch(route('host.properties.update', ['property' => $property, 'step' => 'pricing']), [
            'price_per_night' => '85.50',
            'cleaning_fee' => '30',
            'min_nights' => 2,
            'max_nights' => '',
            'check_in_time' => '16:00',
            'check_out_time' => '10:00',
            'booking_mode' => 'instant',
        ])
        ->assertSessionHasNoErrors();

    expect($property->refresh())
        ->price_per_night->toBe(8550)
        ->cleaning_fee->toBe(3000)
        ->max_nights->toBeNull()
        ->booking_mode->toBe(BookingMode::Instant);
});

test('the maximum stay cannot be shorter than the minimum', function () {
    $property = Property::factory()->create();

    $this->actingAs($property->owner)
        ->patch(route('host.properties.update', ['property' => $property, 'step' => 'pricing']), [
            'price_per_night' => 80, 'min_nights' => 5, 'max_nights' => 3,
            'check_in_time' => '15:00', 'check_out_time' => '11:00', 'booking_mode' => 'request',
        ])
        ->assertSessionHasErrors('max_nights');
});

test('amenities are synced, including clearing them all', function () {
    $property = Property::factory()->create();
    [$wifi, $parking] = Amenity::factory()->count(2)->create();
    $property->amenities()->attach($wifi);

    $this->actingAs($property->owner)
        ->patch(route('host.properties.update', ['property' => $property, 'step' => 'amenities']), ['amenities' => [$parking->id]]);
    expect($property->amenities()->pluck('id')->all())->toBe([$parking->id]);

    $this->actingAs($property->owner)
        ->patch(route('host.properties.update', ['property' => $property, 'step' => 'amenities']), ['amenities' => []]);
    expect($property->amenities()->count())->toBe(0);
});

test('an unknown step answers 404', function () {
    $property = Property::factory()->create();

    $this->actingAs($property->owner)
        ->get(route('host.properties.edit', ['property' => $property, 'step' => 'inconnue']))
        ->assertNotFound();
});

test('a listing without bookings is deleted with its photos', function () {
    Storage::fake('public');
    Storage::disk('public')->put('properties/1/photo.webp', 'x');
    $property = Property::factory()->create();
    PropertyImage::factory()->for($property)->create(['path' => 'properties/1/photo.webp']);

    $this->actingAs($property->owner)
        ->delete(route('host.properties.destroy', $property))
        ->assertRedirect(route('host.dashboard'));

    expect(Property::count())->toBe(0);
    Storage::disk('public')->assertMissing('properties/1/photo.webp');
});

test('a listing with bookings cannot be deleted', function () {
    $property = Property::factory()->published()->create();
    Booking::factory()->for($property)->completed()->create();

    $this->actingAs($property->owner)
        ->delete(route('host.properties.destroy', $property))
        ->assertForbidden();

    expect(Property::count())->toBe(1);
});
