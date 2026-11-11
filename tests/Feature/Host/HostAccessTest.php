<?php

use App\Models\Property;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('guests are sent to the login page', function () {
    $this->get(route('host.dashboard'))->assertRedirect(route('login'));
});

test('travelers cannot reach the host space', function () {
    $this->actingAs(User::factory()->create())
        ->get(route('host.dashboard'))
        ->assertForbidden();
});

test('hosts must verify their email first', function () {
    $this->actingAs(User::factory()->host()->unverified()->create())
        ->get(route('host.dashboard'))
        ->assertRedirect(route('verification.notice'));
});

test('the dashboard lists the host own listings only', function () {
    $host = User::factory()->host()->create();
    $mine = Property::factory()->for($host, 'owner')->published()->create();
    Property::factory()->for($host, 'owner')->create();
    Property::factory()->published()->create();

    $this->actingAs($host)
        ->get(route('host.dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('host/dashboard')
            ->has('properties', 2)
            ->where('stats.published', 1)
            ->where('stats.drafts', 1)
            ->where('properties', fn ($properties) => collect($properties)->contains('slug', $mine->slug))
        );
});

test('hosts cannot edit a listing they do not own, admins can', function () {
    $property = Property::factory()->create();

    $this->actingAs(User::factory()->host()->create())
        ->get(route('host.properties.edit', ['property' => $property]))
        ->assertForbidden();

    $this->actingAs(User::factory()->admin()->create())
        ->get(route('host.properties.edit', ['property' => $property]))
        ->assertOk();
});
