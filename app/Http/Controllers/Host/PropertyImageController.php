<?php

namespace App\Http\Controllers\Host;

use App\Http\Controllers\Controller;
use App\Http\Requests\Host\ReorderPropertyImagesRequest;
use App\Http\Requests\Host\StorePropertyImagesRequest;
use App\Jobs\ProcessPropertyImage;
use App\Media\CloudinaryStorage;
use App\Models\Property;
use App\Models\PropertyImage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class PropertyImageController extends Controller
{
    /**
     * Signs a short-lived direct upload payload for Cloudinary.
     */
    public function signature(Request $request, Property $property, CloudinaryStorage $cloudinary): JsonResponse
    {
        if (! $cloudinary->isConfigured()) {
            return response()->json([
                'message' => 'Cloudinary n’est pas configuré.',
            ], 503);
        }

        $remaining = Property::MAX_PHOTOS - $property->images()->count();

        if ($remaining <= 0) {
            return response()->json([
                'message' => 'Ce logement a déjà le nombre maximal de photos.',
            ], 422);
        }

        $count = $request->integer('count', 1);

        if ($count < 1 || $count > $remaining) {
            return response()->json([
                'message' => "Vous pouvez encore ajouter {$remaining} photo(s) au maximum.",
            ], 422);
        }

        return response()->json($cloudinary->signUpload($property));
    }

    /**
     * Keeps the uploads privately and queues their processing, or registers signed Cloudinary uploads.
     */
    public function store(StorePropertyImagesRequest $request, Property $property, CloudinaryStorage $cloudinary): RedirectResponse
    {
        $position = (int) $property->images()->max('position');

        if ($cloudinary->isConfigured() && $request->has('uploads')) {
            /** @var list<array{public_id: string}> $uploads */
            $uploads = $request->array('uploads');

            foreach ($uploads as $upload) {
                $urls = $cloudinary->deliveryUrls($upload['public_id']);

                $image = $property->images()->make(['position' => ++$position]);
                $image->forceFill([
                    'path' => $urls['url'],
                    'thumbnail_path' => $urls['thumbnail_url'],
                    'cloudinary_public_id' => $upload['public_id'],
                    'processed_at' => now(),
                ])->save();
            }

            Inertia::flash('toast', ['type' => 'success', 'message' => count($uploads) > 1
                ? count($uploads).' photos ajoutées.'
                : 'Photo ajoutée.']);

            return back();
        }

        /** @var list<UploadedFile> $photos */
        $photos = $request->file('photos', []);

        foreach ($photos as $photo) {
            $image = $property->images()->make(['position' => ++$position]);
            $image->forceFill(['original_path' => $photo->store('property-uploads', 'local')])->save();

            ProcessPropertyImage::dispatch($image);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => count($photos) > 1
            ? count($photos).' photos ajoutées, traitement en cours.'
            : 'Photo ajoutée, traitement en cours.']);

        return back();
    }

    public function reorder(ReorderPropertyImagesRequest $request, Property $property): RedirectResponse
    {
        DB::transaction(function () use ($request, $property): void {
            foreach ($request->array('images') as $position => $imageId) {
                $property->images()->whereKey($imageId)->update(['position' => $position]);
            }
        });

        return back();
    }

    public function destroy(Property $property, PropertyImage $image): RedirectResponse
    {
        $image->delete();

        Inertia::flash('toast', ['type' => 'info', 'message' => 'Photo supprimée.']);

        return back();
    }
}
