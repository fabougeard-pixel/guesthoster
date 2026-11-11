<?php

use App\Jobs\ProcessPropertyImage;
use App\Models\Property;
use App\Models\PropertyImage;
use App\Models\User;
use Illuminate\Http\Client\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

beforeEach(function (): void {
    config()->set('services.cloudinary', [
        'url' => 'cloudinary://123456789:super_secret@demo_cloud',
        'cloud_name' => null,
        'api_key' => null,
        'api_secret' => null,
        'folder' => 'guesthoster',
    ]);
});

test('host can request a signed cloudinary upload payload', function (): void {
    $host = User::factory()->host()->create();
    $property = Property::factory()->create(['user_id' => $host->id]);

    $response = $this->actingAs($host)->postJson(
        route('host.properties.images.signature', $property),
        ['count' => 2],
    );

    $response->assertOk()
        ->assertJsonPath('upload_url', 'https://api.cloudinary.com/v1_1/demo_cloud/image/upload')
        ->assertJsonPath('params.api_key', '123456789')
        ->assertJsonPath('params.folder', "guesthoster/properties/{$property->id}");

    $params = $response->json('params');
    $expected = sha1("folder={$params['folder']}&timestamp={$params['timestamp']}super_secret");

    expect($params['signature'])->toBe($expected);
});

test('other users cannot request a cloudinary upload signature for a property they do not own', function (): void {
    $host = User::factory()->host()->create();
    $otherHost = User::factory()->host()->create();
    $property = Property::factory()->create(['user_id' => $host->id]);

    $this->actingAs($otherHost)
        ->postJson(route('host.properties.images.signature', $property), ['count' => 1])
        ->assertForbidden();
});

test('host can register a verified direct cloudinary upload', function (): void {
    $host = User::factory()->host()->create();
    $property = Property::factory()->create(['user_id' => $host->id]);
    $publicId = "guesthoster/properties/{$property->id}/salon-1";
    $version = 1731320001;
    $signature = sha1("public_id={$publicId}&version={$version}super_secret");

    $this->actingAs($host)->post(route('host.properties.images.store', $property), [
        'uploads' => [
            [
                'public_id' => $publicId,
                'version' => $version,
                'signature' => $signature,
                'width' => 1600,
                'height' => 1066,
            ],
        ],
    ])->assertRedirect();

    $image = PropertyImage::query()->where('property_id', $property->id)->first();

    expect($image)->not->toBeNull()
        ->and($image?->cloudinary_public_id)->toBe($publicId)
        ->and($image?->path)->toBe("https://res.cloudinary.com/demo_cloud/image/upload/f_auto,q_auto,c_limit,w_1600,h_1600/{$publicId}")
        ->and($image?->thumbnail_path)->toBe("https://res.cloudinary.com/demo_cloud/image/upload/f_auto,q_auto,c_limit,w_640,h_640/{$publicId}")
        ->and($image?->original_path)->toBeNull()
        ->and($image?->processed_at)->not->toBeNull();
});

test('signed cloudinary upload rejects invalid signature or foreign folder', function (): void {
    $host = User::factory()->host()->create();
    $property = Property::factory()->create(['user_id' => $host->id]);
    $otherProperty = Property::factory()->create(['user_id' => $host->id]);

    $foreignId = "guesthoster/properties/{$otherProperty->id}/hijack";
    $version = 1731320001;

    $this->actingAs($host)->post(route('host.properties.images.store', $property), [
        'uploads' => [
            [
                'public_id' => $foreignId,
                'version' => $version,
                'signature' => sha1("public_id={$foreignId}&version={$version}super_secret"),
                'width' => 1200,
                'height' => 800,
            ],
        ],
    ])->assertSessionHasErrors('photos');

    $validFolderId = "guesthoster/properties/{$property->id}/bad-sig";

    $this->actingAs($host)->post(route('host.properties.images.store', $property), [
        'uploads' => [
            [
                'public_id' => $validFolderId,
                'version' => $version,
                'signature' => 'invalid-signature',
                'width' => 1200,
                'height' => 800,
            ],
        ],
    ])->assertSessionHasErrors('photos');

    expect(PropertyImage::query()->where('property_id', $property->id)->count())->toBe(0);
});

test('deleting a cloudinary image destroys the remote asset', function (): void {
    $host = User::factory()->host()->create();
    $property = Property::factory()->create(['user_id' => $host->id]);
    $publicId = "guesthoster/properties/{$property->id}/to-delete";

    $image = PropertyImage::factory()->create([
        'property_id' => $property->id,
        'path' => "https://res.cloudinary.com/demo_cloud/image/upload/f_auto,q_auto,c_limit,w_1600,h_1600/{$publicId}",
        'thumbnail_path' => "https://res.cloudinary.com/demo_cloud/image/upload/f_auto,q_auto,c_limit,w_640,h_640/{$publicId}",
        'cloudinary_public_id' => $publicId,
        'processed_at' => now(),
    ]);

    Http::fake([
        'https://api.cloudinary.com/v1_1/demo_cloud/image/destroy' => Http::response(['result' => 'ok'], 200),
    ]);

    $this->actingAs($host)
        ->delete(route('host.properties.images.destroy', [$property, $image]))
        ->assertRedirect();

    Http::assertSent(function (Request $request) use ($publicId): bool {
        return $request->url() === 'https://api.cloudinary.com/v1_1/demo_cloud/image/destroy'
            && $request['public_id'] === $publicId
            && $request['api_key'] === '123456789';
    });

    expect(PropertyImage::query()->find($image->id))->toBeNull();
});

test('server image processing job uploads to cloudinary when configured', function (): void {
    Storage::fake('local');

    $host = User::factory()->host()->create();
    $property = Property::factory()->create(['user_id' => $host->id]);
    $storedPath = UploadedFile::fake()->image('salon.jpg', 1200, 800)->store('property-uploads', 'local');

    $image = PropertyImage::factory()->create([
        'property_id' => $property->id,
        'path' => null,
        'thumbnail_path' => null,
        'original_path' => $storedPath,
        'processed_at' => null,
    ]);

    $publicId = "guesthoster/properties/{$property->id}/uploaded";

    Http::fake([
        'https://api.cloudinary.com/v1_1/demo_cloud/image/upload' => Http::response([
            'public_id' => $publicId,
        ], 200),
    ]);

    (new ProcessPropertyImage($image))->handle();

    $image->refresh();

    expect($image->cloudinary_public_id)->toBe($publicId)
        ->and($image->original_path)->toBeNull()
        ->and($image->processed_at)->not->toBeNull()
        ->and(Storage::disk('local')->exists($storedPath))->toBeFalse();
});
