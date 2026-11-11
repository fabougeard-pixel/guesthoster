<?php

use App\Events\MessageSent;
use App\Events\MessagesRead;
use App\Models\Booking;
use App\Models\Message;
use App\Models\Property;
use App\Models\User;
use App\Notifications\NewMessage;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    Event::fake([MessageSent::class, MessagesRead::class]);
    Notification::fake();
});

test('the guest writes to the host, who is notified in real time and by a delayed email', function () {
    $booking = Booking::factory()->create();

    $this->actingAs($booking->guest)
        ->from(route('messages.show', $booking))
        ->post(route('messages.store', $booking), ['body' => '  Bonjour, à quelle heure puis-je arriver ?  '])
        ->assertRedirect(route('messages.show', $booking));

    $message = Message::query()->sole();
    expect($message->body)->toBe('Bonjour, à quelle heure puis-je arriver ?')
        ->and($message->user_id)->toBe($booking->user_id);

    Event::assertDispatched(MessageSent::class, fn (MessageSent $event) => $event->recipientId === $booking->property->user_id);
    Notification::assertSentTo($booking->property->owner, NewMessage::class, fn (NewMessage $notification) => $notification->delay !== null);
});

test('the host can answer', function () {
    $booking = Booking::factory()->create();

    $this->actingAs($booking->property->owner)->post(route('messages.store', $booking), ['body' => 'Dès 15 h !']);

    Event::assertDispatched(MessageSent::class, fn (MessageSent $event) => $event->recipientId === $booking->user_id);
});

test('only the guest and the host take part in the conversation', function () {
    $booking = Booking::factory()->create();

    foreach ([User::factory()->create(), User::factory()->admin()->create()] as $outsider) {
        $this->actingAs($outsider)->get(route('messages.show', $booking))->assertForbidden();
        $this->actingAs($outsider)->post(route('messages.store', $booking), ['body' => 'Coucou'])->assertForbidden();
    }

    expect(Message::count())->toBe(0);
});

test('empty and overly long messages are rejected', function (string $body) {
    $booking = Booking::factory()->create();

    $this->actingAs($booking->guest)->post(route('messages.store', $booking), ['body' => $body])->assertSessionHasErrors('body');
})->with(['empty' => '   ', 'too long' => str_repeat('a', 2001)]);

test('opening the conversation marks received messages as read and tells the sender', function () {
    $booking = Booking::factory()->create();
    $received = Message::factory()->for($booking)->count(2)->create();
    $own = Message::factory()->for($booking)->create(['user_id' => $booking->property->user_id]);

    $this->actingAs($booking->property->owner)
        ->get(route('messages.show', $booking))
        ->assertInertia(fn (Assert $page) => $page
            ->component('messages/show')
            ->has('messages', 3)
            ->where('conversation.counterpart', $booking->guest->name)
            ->where('conversation.role', 'host')
        );

    expect($received->fresh()->pluck('read_at')->filter())->toHaveCount(2)
        ->and($own->fresh()->read_at)->toBeNull();
    Event::assertDispatched(MessagesRead::class, fn (MessagesRead $event) => $event->readerId === $booking->property->user_id);
});

test('no read receipt is sent when nothing was unread', function () {
    $booking = Booking::factory()->create();
    Message::factory()->for($booking)->read()->create();

    $this->actingAs($booking->property->owner)->get(route('messages.show', $booking))->assertOk();

    Event::assertNotDispatched(MessagesRead::class);
});

test('the inbox lists the user conversations with their unread count, newest first', function () {
    $host = User::factory()->host()->create();
    $older = Booking::factory()->for(Property::factory()->for($host, 'owner')->published())->create();
    $newer = Booking::factory()->for($host, 'guest')->create();
    Message::factory()->for($older)->count(2)->create();
    Message::factory()->for($newer)->create(['user_id' => $newer->property->user_id]);
    Message::factory()->create();

    $this->actingAs($host)
        ->get(route('messages.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('messages/index')
            ->has('conversations', 2)
            ->where('conversations.0.reference', $newer->reference)
            ->where('conversations.0.role', 'guest')
            ->where('conversations.0.unread', 1)
            ->where('conversations.1.unread', 2)
            ->where('unreadMessages', 3)
        );
});

test('the delayed email is skipped once the message is read or followed by another one', function () {
    $booking = Booking::factory()->create();
    $first = Message::factory()->for($booking)->create();
    $notification = new NewMessage($first);
    $host = $booking->property->owner;

    expect($notification->shouldSend($host, 'mail'))->toBeTrue();

    Message::factory()->for($booking)->create();
    expect($notification->shouldSend($host, 'mail'))->toBeFalse();

    $last = Message::query()->latest('id')->first();
    $last->forceFill(['read_at' => now()])->save();
    expect((new NewMessage($last))->shouldSend($host, 'mail'))->toBeFalse();
});

test('the new message email renders', function () {
    $message = Message::factory()->create(['body' => 'Le code de la boîte à clés ?']);

    expect((string) (new NewMessage($message))->toMail($message->booking->property->owner)->render())
        ->toContain('Le code de la boîte à clés ?')
        ->toContain('Répondre');
});
