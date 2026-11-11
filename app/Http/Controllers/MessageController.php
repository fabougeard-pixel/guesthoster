<?php

namespace App\Http\Controllers;

use App\Events\MessageSent;
use App\Events\MessagesRead;
use App\Http\Requests\StoreMessageRequest;
use App\Models\Booking;
use App\Models\Message;
use App\Models\User;
use App\Notifications\NewMessage;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class MessageController extends Controller
{
    /**
     * Number of most recent messages shown in a conversation.
     */
    private const HISTORY = 200;

    /**
     * Conversations of the user, as guest or as host, most recent first.
     */
    public function index(Request $request): Response
    {
        /** @var User $user */
        $user = $request->user();

        $bookings = Booking::query()
            ->where(fn (Builder $query) => $query
                ->where('user_id', $user->id)
                ->orWhereHas('property', fn (Builder $property) => $property->where('user_id', $user->id)))
            ->whereHas('messages')
            ->withMax('messages', 'id')
            ->withCount(['messages as unread_count' => fn (Builder $query) => $query
                ->whereNull('read_at')
                ->where('user_id', '!=', $user->id)])
            ->with(['property.owner', 'property.coverImage', 'guest'])
            ->orderByDesc('messages_max_id')
            ->get();

        $latest = Message::query()
            ->whereIn('id', $bookings->pluck('messages_max_id')->filter())
            ->get()
            ->keyBy('booking_id');

        return Inertia::render('messages/index', [
            'conversations' => $bookings->map(function (Booking $booking) use ($user, $latest): array {
                $last = $latest->get($booking->id);

                return [
                    'reference' => $booking->reference,
                    'property_title' => $booking->property->title,
                    'cover_url' => $booking->property->coverImage?->thumbnail_url,
                    'counterpart' => $booking->counterpartOf($user)->name,
                    'role' => $booking->user_id === $user->id ? 'guest' : 'host',
                    'status_label' => $booking->status->label(),
                    'last_message' => $last?->body,
                    'last_message_mine' => $last?->user_id === $user->id,
                    'last_message_at' => $last?->created_at?->toIso8601String(),
                    'unread' => (int) $booking->getAttribute('unread_count'),
                ];
            })->values(),
        ]);
    }

    /**
     * Opening the conversation marks the received messages as read.
     */
    public function show(Request $request, Booking $booking): Response
    {
        Gate::authorize('message', $booking);

        /** @var User $user */
        $user = $request->user();
        $booking->load(['property.owner', 'property.coverImage', 'guest']);

        $marked = $booking->messages()
            ->whereNull('read_at')
            ->where('user_id', '!=', $user->id)
            ->update(['read_at' => now()]);

        if ($marked > 0) {
            MessagesRead::dispatch($booking->reference, $user->id);
        }

        $messages = $booking->messages()
            ->latest('id')
            ->limit(self::HISTORY)
            ->get()
            ->reverse()
            ->values();

        return Inertia::render('messages/show', [
            'conversation' => [
                'reference' => $booking->reference,
                'property_title' => $booking->property->title,
                'cover_url' => $booking->property->coverImage?->thumbnail_url,
                'check_in' => $booking->check_in->toDateString(),
                'check_out' => $booking->check_out->toDateString(),
                'status_label' => $booking->status->label(),
                'counterpart' => $booking->counterpartOf($user)->name,
                'role' => $booking->user_id === $user->id ? 'guest' : 'host',
            ],
            'messages' => $messages->map(fn (Message $message): array => $message->toBroadcastArray()),
            'currentUserId' => $user->id,
        ]);
    }

    public function store(StoreMessageRequest $request, Booking $booking): RedirectResponse
    {
        Gate::authorize('message', $booking);

        /** @var User $user */
        $user = $request->user();
        $booking->load(['property.owner', 'guest']);

        $message = $booking->messages()->make($request->validated());
        $message->forceFill(['user_id' => $user->id])->save();
        $message->setRelation('booking', $booking);

        $recipient = $booking->counterpartOf($user);
        MessageSent::dispatch($message, $recipient->id);
        $recipient->notify(new NewMessage($message));

        return back();
    }
}
