<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\CityRequest;
use App\Models\City;
use App\Models\Country;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class CityController extends Controller
{
    public function index(Request $request): Response
    {
        $validated = $request->validate([
            'pays' => ['nullable', 'integer', Rule::exists('countries', 'id')],
            'q' => ['nullable', 'string', 'max:100'],
        ]);

        $cities = City::query()
            ->when($validated['pays'] ?? null, fn (Builder $query, int|string $country) => $query->where('country_id', $country))
            ->when($validated['q'] ?? null, fn (Builder $query, string $search) => $query->whereLike('name', "%{$search}%"))
            ->with('country')
            ->withCount('properties')
            ->orderBy('name')
            ->paginate(30)
            ->withQueryString()
            ->through(fn (City $city): array => [
                'id' => $city->id,
                'country_id' => $city->country_id,
                'country' => $city->country->name,
                'name' => $city->name,
                'latitude' => $city->latitude,
                'longitude' => $city->longitude,
                'is_popular' => $city->is_popular,
                'is_active' => $city->is_active,
                'sort_order' => $city->sort_order,
                'properties' => (int) $city->getAttribute('properties_count'),
            ]);

        return Inertia::render('admin/cities/index', [
            'cities' => $cities,
            'filters' => ['country' => isset($validated['pays']) ? (int) $validated['pays'] : null, 'q' => $validated['q'] ?? null],
            'countries' => Inertia::once(fn () => Country::query()->orderBy('name')->get(['id', 'name'])),
        ]);
    }

    public function store(CityRequest $request): RedirectResponse
    {
        $city = new City($request->safe()->except('country_id'));
        $city->country()->associate($request->integer('country_id'));
        $city->save();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Ville ajoutée.']);

        return back();
    }

    public function update(CityRequest $request, City $city): RedirectResponse
    {
        $city->fill($request->safe()->except('country_id'));
        $city->country()->associate($request->integer('country_id'));
        $city->save();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Ville mise à jour.']);

        return back();
    }

    /**
     * A city where listings are located is deactivated rather than deleted.
     */
    public function destroy(City $city): RedirectResponse
    {
        if ($city->properties()->exists()) {
            Inertia::flash('toast', ['type' => 'error', 'message' => 'Des logements sont situés dans cette ville : désactivez-la plutôt.']);

            return back();
        }

        $city->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Ville supprimée.']);

        return back();
    }
}
