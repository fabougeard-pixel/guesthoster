<?php

namespace App\Http\Controllers\Host;

use App\Enums\PropertyFormStep;
use App\Enums\PropertyStatus;
use App\Exceptions\InvalidStatusTransition;
use App\Http\Controllers\Controller;
use App\Models\Property;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;

/**
 * Host-side moderation actions; publication itself is decided by an admin.
 */
class PropertyStatusController extends Controller
{
    public function submit(Property $property): RedirectResponse
    {
        $missing = $property->missingRequirements();

        if ($missing !== []) {
            Inertia::flash('toast', ['type' => 'error', 'message' => reset($missing)]);

            return to_route('host.properties.edit', [$property, PropertyFormStep::from((string) array_key_first($missing))]);
        }

        return $this->move($property, PropertyStatus::Pending, 'Logement envoyé en validation. Nous revenons vers vous rapidement.');
    }

    public function withdraw(Property $property): RedirectResponse
    {
        return $this->move($property, PropertyStatus::Draft, 'Logement repassé en brouillon.');
    }

    public function archive(Property $property): RedirectResponse
    {
        return $this->move($property, PropertyStatus::Archived, 'Logement archivé : il n’apparaît plus dans les recherches.');
    }

    public function restore(Property $property): RedirectResponse
    {
        return $this->move($property, PropertyStatus::Draft, 'Logement restauré en brouillon.');
    }

    private function move(Property $property, PropertyStatus $status, string $message): RedirectResponse
    {
        try {
            $property->transitionTo($status);
            Inertia::flash('toast', ['type' => 'success', 'message' => $message]);
        } catch (InvalidStatusTransition) {
            Inertia::flash('toast', ['type' => 'error', 'message' => 'Cette action n’est pas possible pour ce logement.']);
        }

        return back();
    }
}
