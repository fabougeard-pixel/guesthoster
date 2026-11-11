<?php

namespace App\Http\Controllers;

use App\Http\Resources\PropertyCardResource;
use App\Models\Property;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class FavoriteController extends Controller
{
    /**
     * Saved listings that can still be booked, most recently saved first.
     */
    public function index(Request $request): Response
    {
        $properties = $request->user()?->favorites()
            ->published()
            ->with(['city.country', 'propertyType', 'coverImage'])
            ->orderByPivot('created_at', 'desc')
            ->get();

        return Inertia::render('favorites/index', [
            'properties' => PropertyCardResource::collection($properties ?? collect())->resolve(),
        ]);
    }

    public function store(Request $request, Property $property): RedirectResponse
    {
        abort_unless($property->isListed(), 404);

        $request->user()?->favorites()->syncWithoutDetaching([$property->id => ['created_at' => now()]]);

        return back();
    }

    public function destroy(Request $request, Property $property): RedirectResponse
    {
        $request->user()?->favorites()->detach($property->id);

        return back();
    }
}
