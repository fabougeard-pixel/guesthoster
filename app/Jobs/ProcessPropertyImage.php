<?php

namespace App\Jobs;

use App\Media\CloudinaryStorage;
use App\Models\PropertyImage;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Intervention\Image\Drivers\Gd\Driver;
use Intervention\Image\Encoders\WebpEncoder;
use Intervention\Image\ImageManager;
use Throwable;

/**
 * Turns an uploaded photo into an oriented, metadata-free WebP (1600 px)
 * plus a 640 px thumbnail, then discards the original.
 */
class ProcessPropertyImage implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public int $timeout = 120;

    public function __construct(public PropertyImage $image) {}

    public function handle(): void
    {
        $image = $this->image;

        if ($image->isProcessed() || $image->original_path === null) {
            return;
        }

        $source = Storage::disk('local')->path($image->original_path);
        $cloudinary = app(CloudinaryStorage::class);

        if ($cloudinary->isConfigured()) {
            $image->loadMissing('property');
            $uploaded = $cloudinary->upload($source, $image->property);
            Storage::disk('local')->delete($image->original_path);

            $image->forceFill([
                'path' => $uploaded['url'],
                'thumbnail_path' => $uploaded['thumbnail_url'],
                'cloudinary_public_id' => $uploaded['public_id'],
                'original_path' => null,
                'processed_at' => now(),
            ])->save();

            return;
        }

        $manager = ImageManager::usingDriver(Driver::class);
        $basename = "properties/{$image->property_id}/".Str::uuid();

        $web = $manager->decodePath($source)->scaleDown(1600, 1600)->encode(new WebpEncoder(quality: 82, strip: true));
        $thumbnail = $manager->decodePath($source)->scaleDown(640, 640)->encode(new WebpEncoder(quality: 75, strip: true));

        Storage::disk('public')->put("{$basename}.webp", $web->toString());
        Storage::disk('public')->put("{$basename}-thumb.webp", $thumbnail->toString());
        Storage::disk('local')->delete($image->original_path);

        $image->forceFill([
            'path' => "{$basename}.webp",
            'thumbnail_path' => "{$basename}-thumb.webp",
            'original_path' => null,
            'processed_at' => now(),
        ])->save();
    }

    /**
     * An unreadable file is dropped rather than left pending forever.
     */
    public function failed(?Throwable $exception): void
    {
        $this->image->delete();
    }
}
