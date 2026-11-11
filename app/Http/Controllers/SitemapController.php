<?php

namespace App\Http\Controllers;

use App\Models\Property;
use Illuminate\Http\Response;

class SitemapController extends Controller
{
    public function __invoke(): Response
    {
        $urls = collect([
            ['loc' => route('home'), 'lastmod' => null],
            ['loc' => route('properties.index'), 'lastmod' => null],
        ])->concat(
            Property::query()
                ->published()
                ->latest('updated_at')
                ->get(['slug', 'updated_at'])
                ->map(fn (Property $property): array => [
                    'loc' => route('properties.show', $property),
                    'lastmod' => $property->updated_at?->toAtomString(),
                ]),
        );

        $xml = '<?xml version="1.0" encoding="UTF-8"?>'."\n"
            .'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'."\n"
            .$urls->map(fn (array $url): string => '  <url><loc>'.e($url['loc']).'</loc>'
                .($url['lastmod'] ? '<lastmod>'.$url['lastmod'].'</lastmod>' : '').'</url>')->implode("\n")
            ."\n".'</urlset>'."\n";

        return response($xml, 200, ['Content-Type' => 'application/xml; charset=UTF-8']);
    }
}
