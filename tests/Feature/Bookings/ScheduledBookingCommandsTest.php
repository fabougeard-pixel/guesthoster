<?php

use App\Enums\BookingStatus;
use App\Models\Booking;
use App\Notifications\BookingExpired;
use Illuminate\Support\Facades\Notification;

test('unanswered requests and unpaid bookings expire and release their dates', function () {
    Notification::fake();
    $lateRequest = Booking::factory()->create(['expires_at' => now()->subMinute()]);
    $unpaid = Booking::factory()->awaitingPayment()->create(['expires_at' => now()->subMinute()]);
    $stillOpen = Booking::factory()->create(['expires_at' => now()->addHour()]);
    $confirmed = Booking::factory()->confirmed()->create(['expires_at' => now()->subDay()]);

    $this->artisan('bookings:expire')->assertSuccessful();

    expect($lateRequest->refresh()->status)->toBe(BookingStatus::Expired)
        ->and($unpaid->refresh()->status)->toBe(BookingStatus::Expired)
        ->and($stillOpen->refresh()->status)->toBe(BookingStatus::Pending)
        ->and($confirmed->refresh()->status)->toBe(BookingStatus::Confirmed)
        ->and($lateRequest->property->isAvailableBetween($lateRequest->check_in, $lateRequest->check_out))->toBeTrue();

    Notification::assertSentTo($lateRequest->guest, BookingExpired::class);
    Notification::assertCount(2);
});

test('confirmed stays are completed once the check-out day is reached', function () {
    $ended = Booking::factory()->confirmed()->create(['check_in' => today()->subDays(3), 'check_out' => today()]);
    $ongoing = Booking::factory()->confirmed()->create(['check_in' => today()->subDay(), 'check_out' => today()->addDay()]);

    $this->artisan('bookings:complete')->assertSuccessful();

    expect($ended->refresh()->status)->toBe(BookingStatus::Completed)
        ->and($ongoing->refresh()->status)->toBe(BookingStatus::Confirmed);
});

test('both commands are scheduled', function () {
    $this->artisan('schedule:list')
        ->expectsOutputToContain('bookings:expire')
        ->expectsOutputToContain('bookings:complete');
});
