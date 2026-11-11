<?php

use App\Models\Amenity;
use App\Models\City;
use App\Models\Country;
use App\Models\Property;
use App\Models\User;

beforeEach(function () {
    $this->actingAs(User::factory()->admin()->create());
});

test('a country is created with an upper-case unique code', function () {
    $this->post(route('admin.countries.store'), ['name' => 'Bénin', 'code' => 'bj', 'sort_order' => 0, 'is_active' => '1'])
        ->assertRedirect();

    expect(Country::query()->where('code', 'BJ')->exists())->toBeTrue();

    $this->post(route('admin.countries.store'), ['name' => 'Autre', 'code' => 'BJ', 'sort_order' => 0])
        ->assertSessionHasErrors('code');
});

test('an unchecked box deactivates a country', function () {
    $country = Country::factory()->create(['is_active' => true]);

    $this->put(route('admin.countries.update', $country), ['name' => $country->name, 'code' => $country->code, 'sort_order' => 0]);

    expect($country->refresh()->is_active)->toBeFalse();
});

test('a country with cities is not deleted', function () {
    $city = City::factory()->create();

    $this->delete(route('admin.countries.destroy', $city->country))->assertInertiaFlash('toast.type', 'error');

    expect(Country::query()->count())->toBe(1);
});

test('a city gets a slug and must be unique within its country', function () {
    $country = Country::factory()->create();

    $this->post(route('admin.cities.store'), ['country_id' => $country->id, 'name' => 'Porto-Novo', 'sort_order' => 0, 'is_popular' => '1'])
        ->assertRedirect();

    expect(City::query()->sole())
        ->slug->toBe('porto-novo')
        ->is_popular->toBeTrue()
        ->is_active->toBeFalse();

    $this->post(route('admin.cities.store'), ['country_id' => $country->id, 'name' => 'Porto-Novo', 'sort_order' => 0])
        ->assertSessionHasErrors('name');
});

test('a city where listings are located is not deleted', function () {
    $property = Property::factory()->create(['city_id' => City::factory()]);

    $this->delete(route('admin.cities.destroy', $property->city_id))->assertInertiaFlash('toast.type', 'error');

    expect(City::query()->whereKey($property->city_id)->exists())->toBeTrue();
});

test('an amenity keeps its slug when renamed', function () {
    $this->post(route('admin.amenities.store'), ['name' => 'Borne de recharge', 'category' => 'outdoor', 'sort_order' => 3]);
    $amenity = Amenity::query()->sole();

    $this->put(route('admin.amenities.update', $amenity), ['name' => 'Borne de recharge électrique', 'category' => 'outdoor', 'sort_order' => 3]);

    expect($amenity->refresh())
        ->slug->toBe('borne-de-recharge')
        ->name->toBe('Borne de recharge électrique');
});

test('an amenity used by a listing is not deleted', function () {
    $amenity = Amenity::factory()->create();
    Property::factory()->create()->amenities()->attach($amenity);

    $this->delete(route('admin.amenities.destroy', $amenity))->assertInertiaFlash('toast.type', 'error');

    expect(Amenity::query()->count())->toBe(1);
});
