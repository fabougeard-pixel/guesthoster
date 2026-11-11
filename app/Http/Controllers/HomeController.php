<?php

namespace App\Http\Controllers;

use App\Http\Resources\PropertyCardResource;
use App\Models\City;
use App\Models\Property;
use Inertia\Inertia;
use Inertia\Response;

class HomeController extends Controller
{
    public function __invoke(): Response
    {
        return Inertia::render('home', [
            'popularCities' => City::query()
                ->popular()
                ->with('country')
                ->withCount(['properties' => fn ($query) => $query->published()])
                ->limit(8)
                ->get()
                ->map(fn (City $city): array => [
                    'name' => $city->name,
                    'country' => $city->country->name,
                    'listings' => $city->properties_count,
                ]),
            'latestProperties' => PropertyCardResource::collection(
                Property::query()
                    ->published()
                    ->with(['city.country', 'propertyType', 'coverImage'])
                    ->latest('published_at')
                    ->limit(8)
                    ->get(),
            )->resolve(),
            'destinations' => Inertia::once(fn () => City::query()->active()->pluck('name')),
        ]);
    }
}
