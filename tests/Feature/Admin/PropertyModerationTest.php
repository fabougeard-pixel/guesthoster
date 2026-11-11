<?php

use App\Enums\PropertyStatus;
use App\Models\Property;
use App\Models\User;
use App\Notifications\PropertyPublished;
use App\Notifications\PropertyRejected;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    Notification::fake();
    $this->admin = User::factory()->admin()->create();
});

test('the moderation queue lists pending listings, oldest submission first', function () {
    $recent = Property::factory()->pending()->create(['submitted_at' => now()->subHour()]);
    $older = Property::factory()->pending()->create(['submitted_at' => now()->subDays(2)]);
    Property::factory()->published()->create();

    $this->actingAs($this->admin)
        ->get(route('admin.properties.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/properties/index')
            ->where('status', 'pending')
            ->has('properties.data', 2)
            ->where('properties.data.0.id', $older->id)
            ->where('properties.data.1.id', $recent->id)
        );
});

test('publishing a pending listing puts it online and tells the host', function () {
    $property = Property::factory()->pending()->create();

    $this->actingAs($this->admin)
        ->post(route('admin.properties.publish', $property))
        ->assertRedirect()
        ->assertInertiaFlash('toast.type', 'success');

    expect($property->refresh())
        ->status->toBe(PropertyStatus::Published)
        ->published_at->not->toBeNull();
    Notification::assertSentTo($property->owner, PropertyPublished::class);
});

test('a draft cannot be published without going through review', function () {
    $property = Property::factory()->create();

    $this->actingAs($this->admin)
        ->post(route('admin.properties.publish', $property))
        ->assertInertiaFlash('toast.type', 'error');

    expect($property->refresh()->status)->toBe(PropertyStatus::Draft);
    Notification::assertNothingSent();
});

test('rejecting a listing requires a reason, which is kept for the host', function () {
    $property = Property::factory()->pending()->create();

    $this->actingAs($this->admin)
        ->post(route('admin.properties.reject', $property), ['reason' => ''])
        ->assertSessionHasErrors('reason');

    $this->actingAs($this->admin)
        ->post(route('admin.properties.reject', $property), ['reason' => 'Les photos sont trop sombres.'])
        ->assertRedirect();

    expect($property->refresh())
        ->status->toBe(PropertyStatus::Rejected)
        ->rejection_reason->toBe('Les photos sont trop sombres.');
    Notification::assertSentTo($property->owner, PropertyRejected::class, fn (PropertyRejected $notification) => ! $notification->wasPublished);
});

test('a published listing can be taken down', function () {
    $property = Property::factory()->published()->create();

    $this->actingAs($this->admin)
        ->post(route('admin.properties.reject', $property), ['reason' => 'Annonce signalée comme trompeuse.']);

    expect($property->refresh()->status)->toBe(PropertyStatus::Rejected);
    expect(Property::query()->published()->exists())->toBeFalse();
    Notification::assertSentTo($property->owner, PropertyRejected::class, fn (PropertyRejected $notification) => $notification->wasPublished);
});

test('hosts cannot moderate listings', function () {
    $property = Property::factory()->pending()->create();

    $this->actingAs($property->owner)
        ->post(route('admin.properties.publish', $property))
        ->assertForbidden();
});
