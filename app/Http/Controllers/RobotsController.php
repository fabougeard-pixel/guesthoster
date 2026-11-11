<?php

namespace App\Http\Controllers;

use Illuminate\Http\Response;

/**
 * Serves robots.txt dynamically so the sitemap URL follows APP_URL and any
 * non-production environment (staging, local) stays out of search engines.
 */
class RobotsController extends Controller
{
    /**
     * Private areas that have nothing to offer a crawler.
     *
     * @var array<int, string>
     */
    public const PRIVATE_PATHS = [
        '/admin',
        '/hote',
        '/settings',
        '/voyages',
        '/reservations',
        '/messages',
        '/favoris',
        '/notifications',
        '/logements/*/reserver',
        '/login',
        '/register',
        '/forgot-password',
        '/reset-password',
        '/email',
    ];

    public function __invoke(): Response
    {
        $lines = app()->isProduction()
            ? [
                'User-agent: *',
                ...array_map(fn (string $path): string => "Disallow: {$path}", self::PRIVATE_PATHS),
                '',
                'Sitemap: '.route('sitemap'),
            ]
            : ['User-agent: *', 'Disallow: /'];

        return response(implode("\n", $lines)."\n", 200, ['Content-Type' => 'text/plain; charset=UTF-8']);
    }
}
