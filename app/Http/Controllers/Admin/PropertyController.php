<?php

namespace App\Http\Controllers\Admin;

use App\Enums\PropertyStatus;
use App\Exceptions\InvalidStatusTransition;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\RejectPropertyRequest;
use App\Models\Property;
use App\Notifications\PropertyPublished;
use App\Notifications\PropertyRejected;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Listing moderation: publish what hosts submit, turn down or take down what breaks the rules.
 */
class PropertyController extends Controller
{
    public function index(Request $request): Response
    {
        $validated = $request->validate([
            'statut' => ['nullable', Rule::enum(PropertyStatus::class)],
            'q' => ['nullable', 'string', 'max:100'],
        ]);
        $status = PropertyStatus::tryFrom($validated['statut'] ?? '') ?? PropertyStatus::Pending;
        $search = $validated['q'] ?? null;

        $properties = Property::query()
            ->where('status', $status)
            ->when($search, fn (Builder $query, string $search) => $query->where(fn (Builder $query) => $query
                ->whereLike('title', "%{$search}%")
                ->orWhereHas('owner', fn (Builder $owner) => $owner->whereLike('name', "%{$search}%")->orWhereLike('email', "%{$search}%"))
                ->orWhereHas('city', fn (Builder $city) => $city->whereLike('name', "%{$search}%"))))
            ->with(['owner', 'city.country', 'propertyType', 'coverImage'])
            ->withCount(['images' => fn (Builder $query) => $query->whereNotNull('processed_at')])
            ->when(
                $status === PropertyStatus::Pending,
                fn (Builder $query) => $query->oldest('submitted_at'),
                fn (Builder $query) => $query->latest('updated_at'),
            )
            ->paginate(20)
            ->withQueryString()
            ->through(fn (Property $property): array => [
                'id' => $property->id,
                'slug' => $property->slug,
                'title' => $property->title,
                'type' => $property->propertyType->name,
                'booking_mode' => $property->booking_mode->label(),
                'cover_url' => $property->coverImage?->thumbnail_url,
                'city' => $property->city === null ? null : "{$property->city->name}, {$property->city->country->name}",
                'price_per_night' => $property->price_per_night,
                'photos' => (int) $property->getAttribute('images_count'),
                'status' => $property->status->value,
                'status_label' => $property->status->label(),
                'rejection_reason' => $property->rejection_reason,
                'host' => [
                    'name' => $property->owner->name,
                    'email' => $property->owner->email,
                    'suspended' => $property->owner->isSuspended(),
                ],
                'submitted_at' => $property->submitted_at?->toIso8601String(),
                'published_at' => $property->published_at?->toIso8601String(),
            ]);

        $counts = Property::query()->toBase()->selectRaw('status, count(*) as total')->groupBy('status')->pluck('total', 'status');

        return Inertia::render('admin/properties/index', [
            'properties' => $properties,
            'status' => $status->value,
            'search' => $search,
            'statuses' => collect(PropertyStatus::cases())->map(fn (PropertyStatus $case): array => [
                'value' => $case->value,
                'label' => $case->label(),
                'count' => (int) ($counts[$case->value] ?? 0),
            ]),
        ]);
    }

    public function publish(Property $property): RedirectResponse
    {
        try {
            $property->transitionTo(PropertyStatus::Published);
        } catch (InvalidStatusTransition) {
            return $this->refused();
        }

        $property->owner->notify(new PropertyPublished($property));
        Inertia::flash('toast', ['type' => 'success', 'message' => "« {$property->title} » est en ligne."]);

        return back();
    }

    /**
     * Turn down a submission, or take a published listing down, with a reason sent to the host.
     */
    public function reject(RejectPropertyRequest $request, Property $property): RedirectResponse
    {
        $wasPublished = $property->isPublished();

        try {
            $property->forceFill(['rejection_reason' => $request->string('reason')->trim()->toString()]);
            $property->transitionTo(PropertyStatus::Rejected);
        } catch (InvalidStatusTransition) {
            return $this->refused();
        }

        $property->owner->notify(new PropertyRejected($property, $wasPublished));
        Inertia::flash('toast', ['type' => 'info', 'message' => $wasPublished ? 'Logement retiré du catalogue.' : 'Logement refusé.']);

        return back();
    }

    private function refused(): RedirectResponse
    {
        Inertia::flash('toast', ['type' => 'error', 'message' => 'Cette action n’est pas possible pour ce logement.']);

        return back();
    }
}
