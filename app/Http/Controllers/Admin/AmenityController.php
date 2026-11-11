<?php

namespace App\Http\Controllers\Admin;

use App\Enums\AmenityCategory;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\AmenityRequest;
use App\Models\Amenity;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class AmenityController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('admin/amenities/index', [
            'amenities' => Amenity::query()
                ->withCount('properties')
                ->orderBy('category')
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get()
                ->map(fn (Amenity $amenity): array => [
                    'id' => $amenity->id,
                    'slug' => $amenity->slug,
                    'name' => $amenity->name,
                    'category' => $amenity->category->value,
                    'category_label' => $amenity->category->label(),
                    'icon' => $amenity->icon,
                    'sort_order' => $amenity->sort_order,
                    'properties' => (int) $amenity->getAttribute('properties_count'),
                ]),
            'categories' => AmenityCategory::options(),
        ]);
    }

    public function store(AmenityRequest $request): RedirectResponse
    {
        $slug = Str::slug($request->string('name')->toString());

        if (Amenity::query()->where('slug', $slug)->exists()) {
            $slug .= '-'.Str::lower(Str::random(4));
        }

        Amenity::create([...$request->validated(), 'slug' => $slug]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Équipement ajouté.']);

        return back();
    }

    public function update(AmenityRequest $request, Amenity $amenity): RedirectResponse
    {
        $amenity->update($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Équipement mis à jour.']);

        return back();
    }

    /**
     * Only amenities no listing uses can be deleted, so that no host loses information silently.
     */
    public function destroy(Amenity $amenity): RedirectResponse
    {
        if ($amenity->properties()->exists()) {
            Inertia::flash('toast', ['type' => 'error', 'message' => 'Cet équipement est utilisé par des logements.']);

            return back();
        }

        $amenity->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Équipement supprimé.']);

        return back();
    }
}
