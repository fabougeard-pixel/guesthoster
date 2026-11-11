<?php

use App\Models\User;
use Illuminate\Support\Facades\Route;

beforeEach(function () {
    Route::middleware(['web', 'auth', 'role:host,admin'])
        ->get('/_test/hosts-only', fn () => 'ok');
});

test('users with an allowed role pass through', function (string $state) {
    $this->actingAs(User::factory()->{$state}()->create())
        ->get('/_test/hosts-only')
        ->assertOk();
})->with(['host', 'admin']);

test('users without an allowed role are forbidden', function () {
    $this->actingAs(User::factory()->create())
        ->get('/_test/hosts-only')
        ->assertForbidden();
});
