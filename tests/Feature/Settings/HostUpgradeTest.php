<?php

use App\Enums\UserRole;
use App\Models\User;

test('a verified traveler can become a host', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post(route('host-upgrade.store'))
        ->assertRedirect(route('profile.edit'))
        ->assertInertiaFlash('toast.type', 'success');

    expect($user->fresh()->role)->toBe(UserRole::Host);
});

test('an unverified traveler must confirm the e-mail address first', function () {
    $user = User::factory()->unverified()->create();

    $this->actingAs($user)
        ->post(route('host-upgrade.store'))
        ->assertRedirect(route('verification.notice'));

    expect($user->fresh()->role)->toBe(UserRole::Client);
});

test('hosts and administrators cannot use the upgrade', function (string $state) {
    $user = User::factory()->{$state}()->create();

    $this->actingAs($user)
        ->post(route('host-upgrade.store'))
        ->assertForbidden();

    expect($user->fresh()->role)->not->toBe(UserRole::Client);
})->with(['host', 'admin']);
