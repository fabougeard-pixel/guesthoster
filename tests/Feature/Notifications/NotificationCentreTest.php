<?php

use App\Models\Booking;
use App\Models\User;
use App\Notifications\BookingRequested;
use Inertia\Testing\AssertableInertia as Assert;

test('notifications are stored for the in-app centre and counted as unread', function () {
    $booking = Booking::factory()->create();
    $host = $booking->property->owner;

    $host->notify(new BookingRequested($booking));

    $this->actingAs($host)
        ->get(route('notifications.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('notifications/index')
            ->where('unreadNotifications', 1)
            ->has('notifications.data', 1)
            ->where('notifications.data.0.title', 'Nouvelle demande de réservation')
            ->where('notifications.data.0.read', false)
        );
});

test('opening a notification marks it read and leads to its page on this site', function () {
    $booking = Booking::factory()->create();
    $host = $booking->property->owner;
    $host->notify(new BookingRequested($booking));
    $notification = $host->notifications()->sole();

    $this->actingAs($host)
        ->get(route('notifications.show', $notification->id))
        ->assertRedirect('/reservations/'.$booking->reference);

    expect($notification->refresh()->read_at)->not->toBeNull();
});

test('a user cannot open someone else’s notification', function () {
    $booking = Booking::factory()->create();
    $booking->property->owner->notify(new BookingRequested($booking));

    $this->actingAs(User::factory()->create())
        ->get(route('notifications.show', $booking->property->owner->notifications()->sole()->id))
        ->assertNotFound();
});

test('all notifications can be marked as read at once', function () {
    $booking = Booking::factory()->create();
    $host = $booking->property->owner;
    $host->notify(new BookingRequested($booking));
    $host->notify(new BookingRequested($booking));

    $this->actingAs($host)->post(route('notifications.read-all'))->assertRedirect();

    expect($host->unreadNotifications()->count())->toBe(0);
});
