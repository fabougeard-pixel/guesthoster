<?php

use App\Models\City;
use App\Models\Property;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('the home page renders for guests with the shared props', function () {
    $this->get(route('home'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('home')
            ->where('name', config('app.name'))
            ->where('locale', 'fr')
            ->where('auth.user', null)
        );
});

test('the shared authenticated user only exposes safe attributes', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get(route('home'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('auth.user.id', $user->id)
            ->where('auth.user.email', $user->email)
            ->missing('auth.user.password')
            ->missing('auth.user.remember_token')
        );
});

test('the home page features published listings and popular cities only', function () {
    $city = City::factory()->popular()->create(['name' => 'Lyon']);
    $published = Property::factory()->published()->for($city)->create();
    Property::factory()->pending()->for($city)->create();

    $this->get(route('home'))
        ->assertInertia(fn (Assert $page) => $page
            ->has('latestProperties', 1)
            ->where('latestProperties.0.slug', $published->slug)
            ->where('popularCities.0.name', 'Lyon')
            ->where('popularCities.0.listings', 1)
        );
});
