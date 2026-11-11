<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\CountryRequest;
use App\Models\Country;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class CountryController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('admin/countries/index', [
            'countries' => Country::query()
                ->withCount('cities')
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get()
                ->map(fn (Country $country): array => [
                    'id' => $country->id,
                    'name' => $country->name,
                    'code' => $country->code,
                    'flag_emoji' => $country->flag_emoji,
                    'is_active' => $country->is_active,
                    'sort_order' => $country->sort_order,
                    'cities' => (int) $country->getAttribute('cities_count'),
                ]),
        ]);
    }

    public function store(CountryRequest $request): RedirectResponse
    {
        Country::create($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Pays ajouté.']);

        return back();
    }

    public function update(CountryRequest $request, Country $country): RedirectResponse
    {
        $country->update($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Pays mis à jour.']);

        return back();
    }

    /**
     * A country that still has cities is deactivated rather than deleted.
     */
    public function destroy(Country $country): RedirectResponse
    {
        if ($country->cities()->exists()) {
            Inertia::flash('toast', ['type' => 'error', 'message' => 'Ce pays a des villes : désactivez-le plutôt.']);

            return back();
        }

        $country->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Pays supprimé.']);

        return back();
    }
}
