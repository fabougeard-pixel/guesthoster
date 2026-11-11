<?php

namespace App\Media;

use App\Models\Property;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class CloudinaryStorage
{
    public function isConfigured(): bool
    {
        $credentials = $this->credentials();

        return $credentials['cloud_name'] !== null
            && $credentials['api_key'] !== null
            && $credentials['api_secret'] !== null;
    }

    public function cloudName(): ?string
    {
        return $this->credentials()['cloud_name'];
    }

    public function folderFor(Property $property): string
    {
        $folder = trim($this->credentials()['folder'], '/');

        return $folder !== ''
            ? "{$folder}/properties/{$property->id}"
            : "properties/{$property->id}";
    }

    /**
     * Generates a short-lived signed payload so the browser can upload
     * photos directly to Cloudinary without passing through Vercel's payload limit.
     *
     * @return array{upload_url: string, params: array{api_key: string, folder: string, timestamp: int, signature: string}}
     */
    public function signUpload(Property $property, ?int $timestamp = null): array
    {
        $credentials = $this->requireCredentials();
        $unixTimestamp = $timestamp ?? time();
        $folder = $this->folderFor($property);

        $signature = $this->signature([
            'folder' => $folder,
            'timestamp' => $unixTimestamp,
        ], $credentials['api_secret']);

        return [
            'upload_url' => sprintf('https://api.cloudinary.com/v1_1/%s/image/upload', $credentials['cloud_name']),
            'params' => [
                'api_key' => $credentials['api_key'],
                'folder' => $folder,
                'timestamp' => $unixTimestamp,
                'signature' => $signature,
            ],
        ];
    }

    public function verifyUploadSignature(string $publicId, int $version, string $signature): bool
    {
        $credentials = $this->credentials();

        if ($credentials['api_secret'] === null || $signature === '') {
            return false;
        }

        $expected = $this->signature([
            'public_id' => $publicId,
            'version' => $version,
        ], $credentials['api_secret']);

        return hash_equals($expected, $signature);
    }

    public function isValidPropertyPublicId(Property $property, string $publicId): bool
    {
        $prefix = $this->folderFor($property).'/';

        return ! str_contains($publicId, '..')
            && str_starts_with($publicId, $prefix)
            && strlen($publicId) > strlen($prefix);
    }

    /**
     * @return array{url: string, thumbnail_url: string}
     */
    public function deliveryUrls(string $publicId): array
    {
        $credentials = $this->requireCredentials();
        $normalizedId = ltrim($publicId, '/');
        $base = sprintf('https://res.cloudinary.com/%s/image/upload', $credentials['cloud_name']);

        return [
            'url' => "{$base}/f_auto,q_auto,c_limit,w_1600,h_1600/{$normalizedId}",
            'thumbnail_url' => "{$base}/f_auto,q_auto,c_limit,w_640,h_640/{$normalizedId}",
        ];
    }

    /**
     * Uploads a local file from the application server to Cloudinary.
     *
     * @return array{public_id: string, url: string, thumbnail_url: string}
     */
    public function upload(string $filePath, Property $property): array
    {
        $signed = $this->signUpload($property);
        $handle = fopen($filePath, 'rb');

        if ($handle === false) {
            throw new RuntimeException("Impossible d'ouvrir le fichier image [{$filePath}].");
        }

        try {
            $response = Http::timeout(30)
                ->acceptJson()
                ->attach('file', $handle, basename($filePath))
                ->post($signed['upload_url'], $signed['params']);
        } finally {
            fclose($handle);
        }

        if ($response->failed()) {
            $message = $response->json('error.message');
            $detail = is_string($message) && $message !== '' ? $message : $response->body();

            throw new RuntimeException("Échec d'upload Cloudinary: {$detail}");
        }

        $publicId = $response->json('public_id');
        if (! is_string($publicId) || $publicId === '') {
            throw new RuntimeException('Réponse Cloudinary invalide: public_id manquant.');
        }

        $urls = $this->deliveryUrls($publicId);

        return [
            'public_id' => $publicId,
            'url' => $urls['url'],
            'thumbnail_url' => $urls['thumbnail_url'],
        ];
    }

    public function destroy(?string $publicId): void
    {
        if ($publicId === null || $publicId === '' || ! $this->isConfigured()) {
            return;
        }

        $credentials = $this->requireCredentials();
        $timestamp = time();
        $signature = $this->signature([
            'public_id' => $publicId,
            'timestamp' => $timestamp,
        ], $credentials['api_secret']);

        $response = Http::timeout(15)
            ->acceptJson()
            ->asForm()
            ->post(sprintf('https://api.cloudinary.com/v1_1/%s/image/destroy', $credentials['cloud_name']), [
                'public_id' => $publicId,
                'api_key' => $credentials['api_key'],
                'timestamp' => $timestamp,
                'signature' => $signature,
            ]);

        if ($response->failed()) {
            Log::warning('Échec de suppression de média Cloudinary.', [
                'public_id' => $publicId,
                'status' => $response->status(),
                'body' => $response->body(),
            ]);
        }
    }

    /**
     * @return array{cloud_name: string|null, api_key: string|null, api_secret: string|null, folder: string}
     */
    private function credentials(): array
    {
        /** @var array<string, mixed> $config */
        $config = config('services.cloudinary', []);

        $cloudName = $this->nonEmptyString($config['cloud_name'] ?? null);
        $apiKey = $this->nonEmptyString($config['api_key'] ?? null);
        $apiSecret = $this->nonEmptyString($config['api_secret'] ?? null);
        $folder = $this->nonEmptyString($config['folder'] ?? null) ?? 'guesthoster';
        $url = $this->nonEmptyString($config['url'] ?? null);

        if ($url !== null && ($cloudName === null || $apiKey === null || $apiSecret === null)) {
            $parsed = parse_url($url);

            if (is_array($parsed) && ($parsed['scheme'] ?? null) === 'cloudinary') {
                $cloudName ??= $this->nonEmptyString($parsed['host'] ?? null);

                if (is_string($parsed['user'] ?? null)) {
                    $apiKey ??= $this->nonEmptyString(rawurldecode($parsed['user']));
                }

                if (is_string($parsed['pass'] ?? null)) {
                    $apiSecret ??= $this->nonEmptyString(rawurldecode($parsed['pass']));
                }
            }
        }

        return [
            'cloud_name' => $cloudName,
            'api_key' => $apiKey,
            'api_secret' => $apiSecret,
            'folder' => $folder,
        ];
    }

    /**
     * @return array{cloud_name: string, api_key: string, api_secret: string, folder: string}
     */
    private function requireCredentials(): array
    {
        $credentials = $this->credentials();

        if ($credentials['cloud_name'] === null || $credentials['api_key'] === null || $credentials['api_secret'] === null) {
            throw new RuntimeException('Configuration Cloudinary incomplète.');
        }

        return [
            'cloud_name' => $credentials['cloud_name'],
            'api_key' => $credentials['api_key'],
            'api_secret' => $credentials['api_secret'],
            'folder' => $credentials['folder'],
        ];
    }

    /**
     * @param  array<string, int|string>  $params
     */
    private function signature(array $params, string $apiSecret): string
    {
        ksort($params);

        $parts = [];
        foreach ($params as $key => $value) {
            $parts[] = "{$key}={$value}";
        }

        return sha1(implode('&', $parts).$apiSecret);
    }

    private function nonEmptyString(mixed $value): ?string
    {
        return is_string($value) && trim($value) !== '' ? trim($value) : null;
    }
}

