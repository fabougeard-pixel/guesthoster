<?php

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

test('it creates a verified administrator with the typed password', function () {
    $this->artisan('users:create-admin', ['email' => 'chef@example.com', '--name' => 'Chef'])
        ->expectsQuestion('Mot de passe', 'Un-Mot-De-Passe-Solide-42')
        ->assertSuccessful();

    $admin = User::query()->where('email', 'chef@example.com')->sole();

    expect($admin->role)->toBe(UserRole::Admin)
        ->and($admin->name)->toBe('Chef')
        ->and($admin->email_verified_at)->not->toBeNull()
        ->and(Hash::check('Un-Mot-De-Passe-Solide-42', $admin->password))->toBeTrue();
});

test('it refuses an e-mail address that is already taken', function () {
    User::factory()->create(['email' => 'pris@example.com']);

    $this->artisan('users:create-admin', ['email' => 'pris@example.com'])->assertFailed();

    expect(User::query()->where('role', UserRole::Admin)->count())->toBe(0);
});
