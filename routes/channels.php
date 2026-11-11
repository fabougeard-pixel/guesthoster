<?php

use App\Models\Booking;
use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function (User $user, int $id): bool {
    return $user->id === $id;
});

/*
 * Conversation of a booking: its guest and the host of the listing only.
 */
Broadcast::channel('bookings.{booking}', function (User $user, Booking $booking): bool {
    return $booking->involves($user);
});
