<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Notifications\DatabaseNotification;
use Inertia\Inertia;
use Inertia\Response;

/**
 * In-app notification centre, fed by the `database` channel of notifications using SentInApp.
 */
class NotificationController extends Controller
{
    public function index(Request $request): Response
    {
        $notifications = $request->user()?->notifications()
            ->paginate(20)
            ->through(fn (DatabaseNotification $notification): array => [
                'id' => $notification->id,
                'title' => $notification->data['title'] ?? '',
                'body' => $notification->data['body'] ?? '',
                'read' => $notification->read_at !== null,
                'created_at' => $notification->created_at?->toIso8601String(),
            ]);

        return Inertia::render('notifications/index', [
            'notifications' => $notifications,
        ]);
    }

    /**
     * Mark the notification as read and open the page it points to.
     * Only the path is kept, so links never leave the site whatever host built them.
     */
    public function show(Request $request, string $notification): RedirectResponse
    {
        $notification = $request->user()?->notifications()->findOrFail($notification);
        $notification?->markAsRead();

        $url = $notification?->data['url'] ?? null;
        $path = is_string($url) ? parse_url($url, PHP_URL_PATH) : null;

        if (! is_string($path) || ! str_starts_with($path, '/')) {
            return to_route('notifications.index');
        }

        $query = parse_url((string) $url, PHP_URL_QUERY);

        return redirect()->to($path.(is_string($query) ? "?{$query}" : ''));
    }

    public function readAll(Request $request): RedirectResponse
    {
        $request->user()?->unreadNotifications()->update(['read_at' => now()]);

        return back();
    }
}
