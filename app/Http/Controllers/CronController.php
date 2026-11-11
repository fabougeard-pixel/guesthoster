<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;

class CronController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $secret = config('services.cron.secret');
        abort_unless(is_string($secret) && $secret !== '', 503);

        $token = $request->bearerToken();
        abort_unless(is_string($token) && hash_equals($secret, $token), 401);

        return response()->json([
            'ok' => true,
            'commands' => [
                'bookings:expire' => Artisan::call('bookings:expire'),
                'bookings:complete' => Artisan::call('bookings:complete'),
                'notifications:prune' => Artisan::call('notifications:prune'),
            ],
        ]);
    }
}

