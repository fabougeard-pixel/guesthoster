<?php

use App\Http\Middleware\EnsureAccountIsActive;
use App\Http\Middleware\EnsureUserHasRole;
use App\Http\Middleware\HandleInertiaRequests;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;

$app = Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->trustProxies(at: '*');

        $middleware->web(append: [
            EnsureAccountIsActive::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);

        $middleware->validateCsrfTokens(except: ['stripe/webhook']);

        $middleware->alias([
            'role' => EnsureUserHasRole::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
    })->create();

$isVercel = getenv('VERCEL') !== false && getenv('VERCEL') !== '';
$defaultStoragePath = dirname(__DIR__).'/storage';

if ($isVercel || ! is_writable($defaultStoragePath)) {
    $vercelStorage = '/tmp/storage';

    foreach ([
        $vercelStorage,
        $vercelStorage.'/app/private',
        $vercelStorage.'/app/public',
        $vercelStorage.'/framework/cache/data',
        $vercelStorage.'/framework/sessions',
        $vercelStorage.'/framework/testing',
        $vercelStorage.'/framework/views',
        $vercelStorage.'/logs',
    ] as $directory) {
        if (! is_dir($directory)) {
            @mkdir($directory, 0775, true);
        }
    }

    $app->useStoragePath($vercelStorage);
}

return $app;
