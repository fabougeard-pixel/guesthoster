<?php

use App\Models\User;
use Illuminate\Notifications\DatabaseNotification;
use Illuminate\Support\Str;

function storedNotification(User $user, ?string $readAt): DatabaseNotification
{
    return $user->notifications()->create([
        'id' => (string) Str::uuid(),
        'type' => 'test',
        'data' => ['title' => 'Test'],
        'read_at' => $readAt,
    ]);
}

test('read notifications older than the threshold are pruned, unread ones are kept', function () {
    $user = User::factory()->create();
    $oldRead = storedNotification($user, now()->subDays(91)->toDateTimeString());
    $recentRead = storedNotification($user, now()->subDays(10)->toDateTimeString());
    $oldUnread = storedNotification($user, null);
    $oldUnread->forceFill(['created_at' => now()->subYear()])->save();

    $this->artisan('notifications:prune')->assertSuccessful();

    expect(DatabaseNotification::query()->pluck('id')->all())
        ->toEqualCanonicalizing([$recentRead->id, $oldUnread->id])
        ->not->toContain($oldRead->id);
});

test('the threshold must be at least one day', function () {
    $this->artisan('notifications:prune', ['--days' => 0])->assertFailed();
});
