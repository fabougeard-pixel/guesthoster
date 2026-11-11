<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('bookings:expire')->everyFiveMinutes()->withoutOverlapping();
Schedule::command('bookings:complete')->hourly()->withoutOverlapping();
Schedule::command('notifications:prune')->daily()->at('03:30');
