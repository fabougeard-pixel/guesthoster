<?php

use App\Jobs\ProcessPropertyImage;
use App\Models\Property;
use App\Models\PropertyImage;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    Storage::fake('public');
    Storage::fake('local');
});

test('uploaded photos are converted to webp with a thumbnail and the original is discarded', function () {
    $property = Property::factory()->create();

    $this->actingAs($property->owner)
        ->post(route('host.properties.images.store', $property), [
            'photos' => [UploadedFile::fake()->image('salon.jpg', 2400, 1600)],
        ])
        ->assertSessionHasNoErrors();

    $image = $property->images()->sole();

    expect($image->isProcessed())->toBeTrue()
        ->and($image->original_path)->toBeNull()
        ->and($image->path)->toEndWith('.webp');

    Storage::disk('public')->assertExists([$image->path, (string) $image->thumbnail_path]);
    expect(Storage::disk('local')->allFiles())->toBe([])
        ->and(getimagesizefromstring(Storage::disk('public')->get($image->path))[0])->toBe(1600);
});

test('processing is queued and the photo stays hidden until it is done', function () {
    Queue::fake();
    $property = Property::factory()->published()->create();

    $this->actingAs($property->owner)
        ->post(route('host.properties.images.store', $property), [
            'photos' => [UploadedFile::fake()->image('a.jpg', 1200, 800), UploadedFile::fake()->image('b.jpg', 1200, 800)],
        ]);

    Queue::assertPushed(ProcessPropertyImage::class, 2);
    expect($property->images()->processed()->count())->toBe(0);

    $this->get(route('properties.show', $property))
        ->assertInertia(fn (Assert $page) => $page->has('property.images', 0));
});

test('photos too small, of the wrong type or beyond the limit are rejected', function () {
    $property = Property::factory()->create();
    PropertyImage::factory()->for($property)->count(Property::MAX_PHOTOS - 1)->create();

    $this->actingAs($property->owner)
        ->post(route('host.properties.images.store', $property), [
            'photos' => [UploadedFile::fake()->image('petite.jpg', 400, 300), UploadedFile::fake()->create('doc.pdf', 10, 'application/pdf')],
        ])
        ->assertSessionHasErrors(['photos', 'photos.0', 'photos.1']);
});

test('a photo that cannot be processed is dropped', function () {
    $image = PropertyImage::factory()->unprocessed()->create();

    (new ProcessPropertyImage($image))->failed(new RuntimeException('Fichier illisible'));

    expect(PropertyImage::count())->toBe(0);
});

test('photos can be reordered, which changes the cover', function () {
    $property = Property::factory()->published()->create();
    [$first, $second] = PropertyImage::factory()->for($property)->count(2)->sequence(['position' => 0], ['position' => 1])->create();

    $this->actingAs($property->owner)
        ->patch(route('host.properties.images.reorder', $property), ['images' => [$second->id, $first->id]])
        ->assertSessionHasNoErrors();

    expect($property->coverImage()->first()?->id)->toBe($second->id);
});

test('reordering must include every photo of the listing and nothing else', function () {
    $property = Property::factory()->create();
    $own = PropertyImage::factory()->for($property)->count(2)->create();
    $foreign = PropertyImage::factory()->create();

    $this->actingAs($property->owner)
        ->patch(route('host.properties.images.reorder', $property), ['images' => [$own[0]->id, $foreign->id]])
        ->assertSessionHasErrors('images.1');
});

test('a photo is deleted with its files, but not through another listing', function () {
    Storage::disk('public')->put('properties/1/a.webp', 'x');
    $property = Property::factory()->create();
    $image = PropertyImage::factory()->for($property)->create(['path' => 'properties/1/a.webp']);
    $other = Property::factory()->for($property->owner, 'owner')->create();

    $this->actingAs($property->owner)
        ->delete(route('host.properties.images.destroy', ['property' => $other, 'image' => $image]))
        ->assertNotFound();

    $this->actingAs($property->owner)
        ->delete(route('host.properties.images.destroy', ['property' => $property, 'image' => $image]));

    expect(PropertyImage::count())->toBe(0);
    Storage::disk('public')->assertMissing('properties/1/a.webp');
});
