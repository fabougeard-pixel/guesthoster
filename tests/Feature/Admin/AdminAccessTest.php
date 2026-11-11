<?php

use App\Models\User;

test('only admins reach the back office', function (string $route) {
    $this->actingAs(User::factory()->host()->create())->get(route($route))->assertForbidden();
    $this->actingAs(User::factory()->admin()->create())->get(route($route))->assertOk();
})->with([
    'admin.dashboard',
    'admin.properties.index',
    'admin.users.index',
    'admin.bookings.index',
    'admin.countries.index',
    'admin.cities.index',
    'admin.amenities.index',
]);

test('visitors are sent to the login page', function () {
    $this->get(route('admin.dashboard'))->assertRedirect(route('login'));
});
