<?php

use App\Events\MessageSent;
use App\Models\Booking;
use App\Models\Message;
use App\Models\User;
use Illuminate\Testing\TestResponse;

beforeEach(function () {
    config([
        'broadcasting.default' => 'reverb',
        'broadcasting.connections.reverb.key' => 'test-key',
        'broadcasting.connections.reverb.secret' => 'test-secret',
        'broadcasting.connections.reverb.app_id' => 'test-app',
    ]);

    // Channels are registered on the broadcaster active at boot ("null" in tests).
    require base_path('routes/channels.php');
});

function authorizeChannel(string $channel): TestResponse
{
    return test()->post('/broadcasting/auth', ['socket_id' => '1234.5678', 'channel_name' => "private-{$channel}"]);
}

test('the guest and the host may listen to the booking conversation', function () {
    $booking = Booking::factory()->create();

    $this->actingAs($booking->guest);
    authorizeChannel("bookings.{$booking->reference}")->assertOk();

    $this->actingAs($booking->property->owner);
    authorizeChannel("bookings.{$booking->reference}")->assertOk();
});

test('anyone else is refused', function () {
    $booking = Booking::factory()->create();

    $this->actingAs(User::factory()->admin()->create());
    authorizeChannel("bookings.{$booking->reference}")->assertForbidden();
});

test('users may only listen to their own channel', function () {
    $user = User::factory()->create();

    $this->actingAs($user);
    authorizeChannel("App.Models.User.{$user->id}")->assertOk();
    authorizeChannel('App.Models.User.'.($user->id + 1))->assertForbidden();
});

test('a sent message is broadcast to the conversation and to the recipient', function () {
    $message = Message::factory()->create();
    $event = new MessageSent($message, $message->booking->property->user_id);

    expect(collect($event->broadcastOn())->map->name->all())->toBe([
        "private-bookings.{$message->booking->reference}",
        "private-App.Models.User.{$message->booking->property->user_id}",
    ])
        ->and($event->broadcastAs())->toBe('message.sent')
        ->and($event->broadcastWith()['message']['body'])->toBe($message->body);
});
