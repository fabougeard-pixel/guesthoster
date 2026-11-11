<?php

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia as Assert;

function registrationPayload(array $overrides = []): array
{
    return [
        'name' => 'Awa Diallo',
        'email' => 'awa@example.com',
        'role' => 'client',
        'password' => 'mot-de-passe-solide',
        'password_confirmation' => 'mot-de-passe-solide',
        ...$overrides,
    ];
}

test('the registration page offers the traveler and host account types', function () {
    $this->get(route('register'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('auth/register')
            ->has('roles', 2)
            ->where('roles.0.value', 'client')
            ->where('roles.1.value', 'host')
            ->where('defaultRole', 'client')
        );
});

test('the host account type is preselected from the query string', function () {
    $this->get(route('register', ['role' => 'host']))
        ->assertInertia(fn (Assert $page) => $page->where('defaultRole', 'host'));
});

test('visitors can register with the chosen account type', function (string $role) {
    Notification::fake();

    $this->post(route('register.store'), registrationPayload(['role' => $role]))
        ->assertRedirect('/');

    $this->assertAuthenticated();

    $user = User::firstWhere('email', 'awa@example.com');

    expect($user->role)->toBe(UserRole::from($role))
        ->and($user->hasVerifiedEmail())->toBeFalse();

    Notification::assertSentTo($user, VerifyEmail::class);
})->with(['client', 'host']);

test('visitors cannot register as administrators', function () {
    $this->post(route('register.store'), registrationPayload(['role' => 'admin']))
        ->assertSessionHasErrors('role');

    $this->assertGuest();
    expect(User::count())->toBe(0);
});

test('registration requires an unused e-mail and a confirmed password', function () {
    User::factory()->create(['email' => 'awa@example.com']);

    $this->post(route('register.store'), registrationPayload(['password_confirmation' => 'autre']))
        ->assertSessionHasErrors(['email', 'password']);

    $this->assertGuest();
});
