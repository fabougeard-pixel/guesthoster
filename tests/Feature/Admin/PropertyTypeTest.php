<?php

use App\Models\Property;
use App\Models\PropertyType;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('an admin adds a type, whose slug stays fixed when it is renamed', function () {
    $this->actingAs(User::factory()->admin()->create());

    $this->post(route('admin.property-types.store'), ['name' => 'Gîte rural', 'sort_order' => 3, 'is_active' => '1'])
        ->assertRedirect();

    $type = PropertyType::query()->where('name', 'Gîte rural')->sole();
    expect($type->slug)->toBe('gite-rural')->and($type->is_active)->toBeTrue();

    $this->put(route('admin.property-types.update', $type), ['name' => 'Gîte', 'sort_order' => 3]);

    expect($type->refresh())
        ->name->toBe('Gîte')
        ->slug->toBe('gite-rural')
        ->is_active->toBeFalse();
});

test('type names are unique', function () {
    $this->actingAs(User::factory()->admin()->create());
    PropertyType::factory()->create(['name' => 'Péniche']);

    $this->post(route('admin.property-types.store'), ['name' => 'Péniche', 'sort_order' => 0])
        ->assertSessionHasErrors('name');
});

test('a type used by a listing is not deleted, an unused one is', function () {
    $this->actingAs(User::factory()->admin()->create());
    $used = Property::factory()->create()->propertyType;
    $unused = PropertyType::factory()->create();

    $this->delete(route('admin.property-types.destroy', $used))->assertInertiaFlash('toast.type', 'error');
    $this->delete(route('admin.property-types.destroy', $unused))->assertInertiaFlash('toast.type', 'success');

    expect(PropertyType::query()->pluck('id')->all())->toBe([$used->id]);
});

test('only admins manage property types', function () {
    $this->actingAs(User::factory()->host()->create())
        ->post(route('admin.property-types.store'), ['name' => 'Yourte', 'sort_order' => 0])
        ->assertForbidden();

    expect(PropertyType::query()->where('name', 'Yourte')->exists())->toBeFalse();
});

test('a deactivated type is no longer offered, but a listing that uses it keeps it', function () {
    $retired = PropertyType::factory()->inactive()->create(['name' => 'Roulotte']);
    $active = PropertyType::factory()->create(['name' => 'Chalet']);
    $property = Property::factory()->create(['property_type_id' => $retired->id]);
    $otherHost = User::factory()->host()->create();

    $this->actingAs($otherHost)
        ->get(route('host.properties.create'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('types', fn ($types) => collect($types)->pluck('label')->contains('Chalet')
                && ! collect($types)->pluck('label')->contains('Roulotte')));

    $this->actingAs($otherHost)
        ->post(route('host.properties.store'), [
            'title' => 'Roulotte au fond du jardin',
            'property_type_id' => $retired->id,
            'description' => str_repeat('Une roulotte calme et lumineuse, idéale pour se reposer. ', 3),
        ])
        ->assertSessionHasErrors('property_type_id');

    $this->actingAs($property->owner)
        ->patch(route('host.properties.update', ['property' => $property, 'step' => 'details']), [
            'title' => $property->title,
            'property_type_id' => $retired->id,
            'description' => $property->description,
        ])
        ->assertSessionHasNoErrors();

    expect($property->refresh()->property_type_id)->toBe($retired->id)
        ->and($active->is_active)->toBeTrue();
});

test('the catalogue filters by type slug and only offers active types', function () {
    $gite = PropertyType::factory()->create(['slug' => 'gite', 'name' => 'Gîte']);
    PropertyType::factory()->inactive()->create(['slug' => 'roulotte', 'name' => 'Roulotte']);
    $match = Property::factory()->published()->create(['property_type_id' => $gite->id]);
    Property::factory()->published()->create(['property_type_id' => PropertyType::factory()]);

    $this->get(route('properties.index', ['types' => ['gite']]))
        ->assertInertia(fn (Assert $page) => $page
            ->where('properties.data', fn ($cards) => collect($cards)->pluck('slug')->all() === [$match->slug])
            ->where('properties.data.0.type', 'Gîte')
            ->where('options.types', fn ($types) => collect($types)->pluck('value')->contains('gite')
                && ! collect($types)->pluck('value')->contains('roulotte')));

    $this->get(route('properties.index', ['types' => ['roulotte']]))
        ->assertSessionHasErrors('types.0');
});
