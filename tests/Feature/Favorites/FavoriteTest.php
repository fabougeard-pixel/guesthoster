<?php

use App\Models\Property;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('a traveler saves and removes a listing', function () {
    $user = User::factory()->create();
    $property = Property::factory()->published()->create();

    $this->actingAs($user)->post(route('favorites.store', $property))->assertRedirect();
    $this->actingAs($user)->post(route('favorites.store', $property));

    expect($user->favorites()->count())->toBe(1);

    $this->actingAs($user)
        ->get(route('favorites.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('favorites/index')
            ->has('properties', 1)
            ->where('favoriteIds', [$property->id])
        );

    $this->actingAs($user)->delete(route('favorites.destroy', $property))->assertRedirect();

    expect($user->favorites()->count())->toBe(0);
});

test('unpublished listings cannot be saved and leave the favorites page', function () {
    $user = User::factory()->create();
    $saved = Property::factory()->published()->create();
    $user->favorites()->attach($saved, ['created_at' => now()]);
    $saved->forceFill(['status' => 'archived'])->save();

    $this->actingAs($user)->post(route('favorites.store', Property::factory()->create()))->assertNotFound();
    $this->actingAs($user)
        ->get(route('favorites.index'))
        ->assertInertia(fn (Assert $page) => $page->has('properties', 0));
});

test('visitors are asked to log in', function () {
    $this->post(route('favorites.store', Property::factory()->published()->create()))
        ->assertRedirect(route('login'));
});
