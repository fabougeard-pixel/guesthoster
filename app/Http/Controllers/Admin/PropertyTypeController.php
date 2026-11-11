<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\PropertyTypeRequest;
use App\Models\PropertyType;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class PropertyTypeController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('admin/property-types/index', [
            'propertyTypes' => PropertyType::query()
                ->withCount('properties')
                ->ordered()
                ->get()
                ->map(fn (PropertyType $type): array => [
                    'id' => $type->id,
                    'slug' => $type->slug,
                    'name' => $type->name,
                    'is_active' => $type->is_active,
                    'sort_order' => $type->sort_order,
                    'properties' => (int) $type->getAttribute('properties_count'),
                ]),
        ]);
    }

    public function store(PropertyTypeRequest $request): RedirectResponse
    {
        $slug = Str::slug($request->string('name')->toString());

        if ($slug === '' || PropertyType::query()->where('slug', $slug)->exists()) {
            $slug = trim($slug.'-'.Str::lower(Str::random(4)), '-');
        }

        PropertyType::create([...$request->validated(), 'slug' => $slug]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Type de logement ajouté.']);

        return back();
    }

    public function update(PropertyTypeRequest $request, PropertyType $propertyType): RedirectResponse
    {
        $propertyType->update($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Type de logement mis à jour.']);

        return back();
    }

    /**
     * A type still used by listings can only be deactivated, never deleted.
     */
    public function destroy(PropertyType $propertyType): RedirectResponse
    {
        if ($propertyType->properties()->exists()) {
            Inertia::flash('toast', ['type' => 'error', 'message' => 'Ce type est utilisé par des logements : désactivez-le plutôt.']);

            return back();
        }

        $propertyType->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Type de logement supprimé.']);

        return back();
    }
}
