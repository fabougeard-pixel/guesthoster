<?php

test('internal cron endpoint returns 503 when CRON_SECRET is not configured', function (): void {
    config()->set('services.cron.secret', null);

    $this->getJson(route('cron.run'))
        ->assertStatus(503);
});

test('internal cron endpoint rejects missing or invalid bearer tokens', function (): void {
    config()->set('services.cron.secret', 'cron_secret_123');

    $this->getJson(route('cron.run'))
        ->assertUnauthorized();

    $this->withToken('wrong_secret')
        ->getJson(route('cron.run'))
        ->assertUnauthorized();
});

test('internal cron endpoint executes scheduled maintenance commands', function (): void {
    config()->set('services.cron.secret', 'cron_secret_123');

    $this->withToken('cron_secret_123')
        ->getJson(route('cron.run'))
        ->assertOk()
        ->assertJsonPath('ok', true)
        ->assertJsonPath('commands', [
            'bookings:expire' => 0,
            'bookings:complete' => 0,
            'notifications:prune' => 0,
        ]);
});

