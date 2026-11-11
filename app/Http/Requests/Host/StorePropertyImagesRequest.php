<?php

namespace App\Http\Requests\Host;

use App\Media\CloudinaryStorage;
use App\Models\Property;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StorePropertyImagesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $cloudinary = app(CloudinaryStorage::class);

        if ($cloudinary->isConfigured() && $this->has('uploads')) {
            return [
                'uploads' => ['required', 'array', 'min:1', 'max:'.Property::MAX_PHOTOS],
                'uploads.*.public_id' => ['required', 'string', 'max:255'],
                'uploads.*.version' => ['required', 'integer', 'min:1'],
                'uploads.*.signature' => ['required', 'string', 'max:128'],
                'uploads.*.width' => ['nullable', 'integer', 'min:800'],
                'uploads.*.height' => ['nullable', 'integer', 'min:500'],
            ];
        }

        return [
            'photos' => ['required', 'array', 'min:1', 'max:'.Property::MAX_PHOTOS],
            'photos.*' => ['image', 'mimes:jpg,jpeg,png,webp', 'max:10240', 'dimensions:min_width=800,min_height=500'],
        ];
    }

    /**
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                /** @var Property $property */
                $property = $this->route('property');
                $remaining = Property::MAX_PHOTOS - $property->images()->count();
                $cloudinary = app(CloudinaryStorage::class);
                $uploads = $this->input('uploads');
                $photos = $this->file('photos', []);

                $incomingCount = ($cloudinary->isConfigured() && $this->has('uploads'))
                    ? (is_array($uploads) ? count($uploads) : 0)
                    : (is_array($photos) ? count($photos) : 0);

                if ($incomingCount > $remaining) {
                    $validator->errors()->add('photos', $remaining > 0
                        ? "Vous pouvez encore ajouter {$remaining} photo(s) au maximum."
                        : 'Ce logement a déjà le nombre maximal de photos.');
                }

                if (! $cloudinary->isConfigured() || ! $this->has('uploads') || ! is_array($uploads)) {
                    return;
                }

                foreach (array_values($uploads) as $index => $upload) {
                    if (! is_array($upload)) {
                        continue;
                    }

                    $publicId = is_string($upload['public_id'] ?? null) ? $upload['public_id'] : '';
                    $version = is_numeric($upload['version'] ?? null) ? (int) $upload['version'] : 0;
                    $signature = is_string($upload['signature'] ?? null) ? $upload['signature'] : '';

                    if ($publicId === '' || $version < 1 || $signature === '') {
                        continue;
                    }

                    $number = $index + 1;

                    if (! $cloudinary->isValidPropertyPublicId($property, $publicId)) {
                        $validator->errors()->add('photos', "La photo #{$number} n’appartient pas au dossier de ce logement.");

                        continue;
                    }

                    if (! $cloudinary->verifyUploadSignature($publicId, $version, $signature)) {
                        $validator->errors()->add('photos', "La signature Cloudinary de la photo #{$number} est invalide.");
                    }
                }
            },
        ];
    }
}
