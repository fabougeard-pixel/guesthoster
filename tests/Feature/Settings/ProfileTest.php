<?php

use App\Models\User;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia as Assert;

test('guests are redirected to the login page', function () {
    $this->get(route('profile.edit'))->assertRedirect(route('login'));
});

test('the profile page renders', function () {
    $this->actingAs(User::factory()->create())
        ->get(route('profile.edit'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('settings/profile')
            ->where('mustVerifyEmail', false)
            ->where('canBecomeHost', true)
        );
});

test('the profile can be updated', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->patch(route('profile.update'), ['name' => 'Nouveau Nom', 'email' => $user->email])
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('profile.edit'))
        ->assertInertiaFlash('toast.type', 'success');

    expect($user->fresh())
        ->name->toBe('Nouveau Nom')
        ->email_verified_at->not->toBeNull();
});

test('changing the e-mail address requires a new verification', function () {
    Notification::fake();
    $user = User::factory()->create();

    $this->actingAs($user)
        ->patch(route('profile.update'), ['name' => $user->name, 'email' => 'nouvelle@example.com'])
        ->assertSessionHasNoErrors();

    $user->refresh();

    expect($user->email)->toBe('nouvelle@example.com')
        ->and($user->hasVerifiedEmail())->toBeFalse();

    Notification::assertSentTo($user, VerifyEmail::class);
});

test('the e-mail address must stay unique', function () {
    $other = User::factory()->create();
    $user = User::factory()->create();

    $this->actingAs($user)
        ->patch(route('profile.update'), ['name' => $user->name, 'email' => $other->email])
        ->assertSessionHasErrors('email');
});

test('users can delete their account with their password', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->delete(route('profile.destroy'), ['password' => 'password'])
        ->assertRedirect(route('home'));

    $this->assertGuest();
    expect($user->fresh())->toBeNull();
});

test('the account is kept when the password is wrong', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->delete(route('profile.destroy'), ['password' => 'mauvais'])
        ->assertSessionHasErrors('password');

    expect($user->fresh())->not->toBeNull();
});
