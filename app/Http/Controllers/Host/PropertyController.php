<?php

namespace App\Http\Controllers\Host;

use App\Enums\AmenityCategory;
use App\Enums\BookingMode;
use App\Enums\PropertyFormStep;
use App\Http\Controllers\Controller;
use App\Http\Requests\Host\StorePropertyRequest;
use App\Http\Requests\Host\UpdatePropertyRequest;
use App\Http\Resources\HostPropertyResource;
use App\Media\CloudinaryStorage;
use App\Models\Amenity;
use App\Models\Country;
use App\Models\Property;
use App\Models\PropertyType;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class PropertyController extends Controller
{
    public function create(): Response
    {
        return Inertia::render('host/properties/create', [
            'types' => PropertyType::options(),
        ]);
    }

    public function store(StorePropertyRequest $request): RedirectResponse
    {
        $property = new Property($request->validated());
        $property->forceFill(['user_id' => $request->user()?->id])->save();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Brouillon créé. Poursuivez avec l’emplacement.']);

        return to_route('host.properties.edit', [$property, PropertyFormStep::Location]);
    }

    public function edit(Property $property, PropertyFormStep $step = PropertyFormStep::Details): Response
    {
        $property->load(['images', 'amenities']);

        return Inertia::render('host/properties/edit', [
            'property' => HostPropertyResource::make($property)->resolve(),
            'step' => $step->value,
            'steps' => PropertyFormStep::options(),
            'options' => Inertia::once(fn (): array => [
                'types' => PropertyType::options($property->property_type_id),
                'bookingModes' => BookingMode::options(),
                'countries' => Country::query()->active()->with(['cities' => fn ($query) => $query->active()])->get()
                    ->map(fn (Country $country): array => [
                        'name' => $country->name,
                        'cities' => $country->cities->map(fn ($city): array => ['id' => $city->id, 'name' => $city->name])->values(),
                    ]),
                'amenities' => collect(AmenityCategory::cases())->map(fn (AmenityCategory $category): array => [
                    'category' => $category->label(),
                    'items' => Amenity::query()->where('category', $category)->orderBy('sort_order')->get(['id', 'name']),
                ])->filter(fn (array $group): bool => $group['items']->isNotEmpty())->values(),
                'minPhotos' => Property::MIN_PHOTOS,
                'maxPhotos' => Property::MAX_PHOTOS,
                'cloudinaryDirectUpload' => app(CloudinaryStorage::class)->isConfigured(),
            ]),
        ]);
    }

    public function update(UpdatePropertyRequest $request, Property $property, PropertyFormStep $step): RedirectResponse
    {
        $property->update($request->propertyAttributes());

        if ($step === PropertyFormStep::Amenities) {
            $property->amenities()->sync($request->array('amenities'));
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Modifications enregistrées.']);

        return to_route('host.properties.edit', [$property, $step->next() ?? $step]);
    }

    public function destroy(Request $request, Property $property): RedirectResponse
    {
        Gate::authorize('delete', $property);

        $property->delete();

        Inertia::flash('toast', ['type' => 'info', 'message' => 'Le logement a été supprimé.']);

        return to_route('host.dashboard');
    }
}
