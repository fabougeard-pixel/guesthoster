<?php

use App\Enums\UserRole;
use App\Models\Booking;
use App\Models\Property;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->admin = User::factory()->admin()->create();
});

test('users can be searched by name or e-mail and filtered by role', function () {
    User::factory()->host()->create(['name' => 'Camille Hôte', 'email' => 'camille@example.com']);
    User::factory()->create(['name' => 'Camille Voyageuse']);

    $this->actingAs($this->admin)
        ->get(route('admin.users.index', ['q' => 'camille', 'role' => 'host']))
        ->assertInertia(fn (Assert $page) => $page
            ->has('users.data', 1)
            ->where('users.data.0.email', 'camille@example.com')
        );
});

test('an admin can change the role of another user', function () {
    $user = User::factory()->create();

    $this->actingAs($this->admin)
        ->patch(route('admin.users.role', $user), ['role' => 'host'])
        ->assertRedirect();

    expect($user->refresh()->role)->toBe(UserRole::Host);
});

test('an admin cannot change their own role', function () {
    $this->actingAs($this->admin)
        ->patch(route('admin.users.role', $this->admin), ['role' => 'client'])
        ->assertSessionHasErrors('role');

    expect($this->admin->refresh()->role)->toBe(UserRole::Admin);
});

test('a host who owns listings cannot become a traveler', function () {
    $property = Property::factory()->create();

    $this->actingAs($this->admin)
        ->patch(route('admin.users.role', $property->owner), ['role' => 'client'])
        ->assertSessionHasErrors('role');
});

test('a suspended user is signed out on their next request', function () {
    $user = User::factory()->create();

    $this->actingAs($this->admin)->post(route('admin.users.suspend', $user))->assertRedirect();
    expect($user->refresh()->isSuspended())->toBeTrue();

    $this->actingAs($user)
        ->get(route('bookings.index'))
        ->assertRedirect(route('login'))
        ->assertSessionHasErrors('email');
    $this->assertGuest();
});

test('a suspended user cannot log in', function () {
    $user = User::factory()->suspended()->create();

    $this->post(route('login.store'), ['email' => $user->email, 'password' => 'password'])
        ->assertSessionHasErrors('email');

    $this->assertGuest();
});

test('the listings of a suspended host leave the catalogue and cannot be booked', function () {
    $property = Property::factory()->published()->create();
    $property->owner->suspend();

    expect(Property::query()->published()->exists())->toBeFalse();

    $this->get(route('properties.show', $property))->assertNotFound();
    $this->actingAs(User::factory()->create())
        ->get(route('bookings.create', ['property' => $property, 'check_in' => today()->addDays(5)->toDateString(), 'check_out' => today()->addDays(7)->toDateString(), 'guests' => 1]))
        ->assertNotFound();
});

test('reinstating a host brings their listings back', function () {
    $property = Property::factory()->published()->create();
    $property->owner->suspend();

    $this->actingAs($this->admin)->post(route('admin.users.reinstate', $property->owner));

    expect(Property::query()->published()->count())->toBe(1);
});

test('an admin cannot suspend their own account', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.users.suspend', $this->admin))
        ->assertInertiaFlash('toast.type', 'error');

    expect($this->admin->refresh()->isSuspended())->toBeFalse();
});

test('the bookings list can be searched by reference', function () {
    $booking = Booking::factory()->create();
    Booking::factory()->create();

    $this->actingAs($this->admin)
        ->get(route('admin.bookings.index', ['q' => strtolower($booking->reference)]))
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/bookings/index')
            ->has('bookings.data', 1)
            ->where('bookings.data.0.reference', $booking->reference)
        );
});
