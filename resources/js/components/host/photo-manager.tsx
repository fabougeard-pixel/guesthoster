import { Form, router, usePoll } from '@inertiajs/react';
import { type FormEvent, type RefObject, useRef, useState } from 'react';
import { Button } from '@/components/button';
import { InputError } from '@/components/form';
import { cn } from '@/lib/utils';
import { destroy, reorder, store } from '@/routes/host/properties/images';
import type { HostProperty } from '@/types';

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MIN_IMAGE_WIDTH = 800;
const MIN_IMAGE_HEIGHT = 500;

type SignedUploadResponse = {
    upload_url: string;
    params: {
        api_key: string;
        folder: string;
        timestamp: number;
        signature: string;
    };
};

type CloudinaryUploadedPhoto = {
    public_id: string;
    version: number;
    signature: string;
    width?: number;
    height?: number;
};

function getXsrfToken(): string | null {
    const match = document.cookie
        .split('; ')
        .find((entry) => entry.startsWith('XSRF-TOKEN='));

    return match ? decodeURIComponent(match.slice('XSRF-TOKEN='.length)) : null;
}

function readImageDimensions(
    file: File,
): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
        const objectUrl = URL.createObjectURL(file);
        const image = new Image();

        image.onload = () => {
            URL.revokeObjectURL(objectUrl);
            resolve({ width: image.naturalWidth, height: image.naturalHeight });
        };

        image.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(
                new Error(
                    `Impossible de lire les dimensions de « ${file.name} ».`,
                ),
            );
        };

        image.src = objectUrl;
    });
}

async function validateSelectedPhotos(
    files: File[],
    remaining: number,
): Promise<string | null> {
    if (files.length === 0) {
        return 'Veuillez sélectionner au moins une photo.';
    }

    if (files.length > remaining) {
        return `Vous pouvez encore ajouter ${remaining} photo(s) au maximum.`;
    }

    for (const file of files) {
        if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
            return `Le format de « ${file.name} » doit être JPEG, PNG ou WebP.`;
        }

        if (file.size > MAX_IMAGE_BYTES) {
            return `La photo « ${file.name} » dépasse la taille maximale de 10 Mo.`;
        }

        const dimensions = await readImageDimensions(file);

        if (
            dimensions.width < MIN_IMAGE_WIDTH ||
            dimensions.height < MIN_IMAGE_HEIGHT
        ) {
            return `La photo « ${file.name} » doit mesurer au moins ${MIN_IMAGE_WIDTH} × ${MIN_IMAGE_HEIGHT} px.`;
        }
    }

    return null;
}

function uploadFileToCloudinary(
    uploadUrl: string,
    params: SignedUploadResponse['params'],
    file: File,
    onProgress: (ratio: number) => void,
): Promise<CloudinaryUploadedPhoto> {
    return new Promise((resolve, reject) => {
        const formData = new FormData();
        formData.append('api_key', params.api_key);
        formData.append('folder', params.folder);
        formData.append('timestamp', String(params.timestamp));
        formData.append('signature', params.signature);
        formData.append('file', file);

        const xhr = new XMLHttpRequest();
        xhr.open('POST', uploadUrl);

        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable && event.total > 0) {
                onProgress(event.loaded / event.total);
            }
        };

        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const data = JSON.parse(
                        xhr.responseText,
                    ) as CloudinaryUploadedPhoto;

                    if (
                        typeof data.public_id === 'string' &&
                        typeof data.version === 'number' &&
                        typeof data.signature === 'string'
                    ) {
                        resolve({
                            public_id: data.public_id,
                            version: data.version,
                            signature: data.signature,
                            width: data.width,
                            height: data.height,
                        });
                        return;
                    }
                } catch {
                    // Handled below
                }

                reject(new Error('Réponse Cloudinary invalide.'));
                return;
            }

            reject(
                new Error(`Échec de l’envoi vers Cloudinary (${xhr.status}).`),
            );
        };

        xhr.onerror = () => {
            reject(new Error('Erreur réseau lors de l’envoi vers Cloudinary.'));
        };

        xhr.send(formData);
    });
}

function PhotoUploadFields({
    remaining,
    processing,
    progress,
    error,
    inputRef,
}: {
    remaining: number;
    processing: boolean;
    progress: number | null;
    error?: string;
    inputRef?: RefObject<HTMLInputElement | null>;
}) {
    return (
        <>
            <label htmlFor="photos" className="text-sm font-medium">
                Choisir jusqu’à {remaining} photo{remaining > 1 ? 's' : ''}
            </label>
            <input
                ref={inputRef}
                id="photos"
                name="photos[]"
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                className="text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-primary-50 file:px-4 file:py-2 file:font-medium file:text-primary-700 dark:file:bg-primary-950 dark:file:text-primary-300"
            />
            {progress !== null && (
                <progress
                    value={progress}
                    max={100}
                    className="h-2 w-full accent-primary-600"
                >
                    {progress} %
                </progress>
            )}
            <InputError message={error} />
            <Button
                type="submit"
                variant="outline"
                loading={processing}
                className="self-start"
            >
                Envoyer
            </Button>
        </>
    );
}

function DirectCloudinaryUploadForm({
    propertySlug,
    remaining,
}: {
    propertySlug: string;
    remaining: number;
}) {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [processing, setProcessing] = useState(false);
    const [progress, setProgress] = useState<number | null>(null);
    const [error, setError] = useState<string | undefined>(undefined);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const files = Array.from(inputRef.current?.files ?? []);
        setError(undefined);

        setProcessing(true);
        setProgress(0);

        try {
            const validationError = await validateSelectedPhotos(
                files,
                remaining,
            );
            if (validationError !== null) {
                setError(validationError);
                setProcessing(false);
                setProgress(null);
                return;
            }

            const headers: Record<string, string> = {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            };

            const xsrfToken = getXsrfToken();
            if (xsrfToken !== null) {
                headers['X-XSRF-TOKEN'] = xsrfToken;
            }

            const storeUrl = store.url(propertySlug);
            const signResponse = await fetch(`${storeUrl}/signature`, {
                method: 'POST',
                headers,
                credentials: 'same-origin',
                body: JSON.stringify({ count: files.length }),
            });

            if (!signResponse.ok) {
                const payload = (await signResponse
                    .json()
                    .catch(() => null)) as { message?: string } | null;

                throw new Error(
                    payload?.message ??
                        'Impossible de préparer l’envoi des photos.',
                );
            }

            const signed = (await signResponse.json()) as SignedUploadResponse;
            const uploaded: CloudinaryUploadedPhoto[] = [];

            for (let index = 0; index < files.length; index++) {
                const photo = await uploadFileToCloudinary(
                    signed.upload_url,
                    signed.params,
                    files[index],
                    (ratio) => {
                        const completed = (index + ratio) / files.length;
                        setProgress(Math.round(completed * 100));
                    },
                );
                uploaded.push(photo);
            }

            setProgress(100);

            router.post(
                storeUrl,
                { uploads: uploaded },
                {
                    preserveScroll: true,
                    onSuccess: () => {
                        if (inputRef.current !== null) {
                            inputRef.current.value = '';
                        }
                    },
                    onError: (errors) => {
                        setError(
                            errors.photos ??
                                Object.values(errors)[0] ??
                                'Enregistrement impossible.',
                        );
                    },
                    onFinish: () => {
                        setProcessing(false);
                        setProgress(null);
                    },
                },
            );
        } catch (caughtError) {
            setError(
                caughtError instanceof Error
                    ? caughtError.message
                    : 'Une erreur est survenue lors de l’envoi.',
            );
            setProcessing(false);
            setProgress(null);
        }
    }

    return (
        <form
            onSubmit={(event) => {
                void handleSubmit(event);
            }}
            className="flex flex-col gap-3 rounded-xl border-2 border-dashed border-zinc-300 p-6 dark:border-zinc-700"
        >
            <PhotoUploadFields
                remaining={remaining}
                processing={processing}
                progress={progress}
                error={error}
                inputRef={inputRef}
            />
        </form>
    );
}

/**
 * Recharge les photos tant que certaines sont en cours de traitement.
 */
function ProcessingPoller() {
    usePoll(2500, { only: ['property'] });

    return null;
}

export function PhotoManager({
    property,
    minPhotos,
    maxPhotos,
    cloudinaryDirectUpload = false,
}: {
    property: HostProperty;
    minPhotos: number;
    maxPhotos: number;
    cloudinaryDirectUpload?: boolean;
}) {
    const images = property.images;
    const hasPending = images.some((image) => !image.is_processed);
    const remaining = maxPhotos - images.length;

    function move(from: number, to: number) {
        const ids = images.map((image) => image.id);
        const [moved] = ids.splice(from, 1);
        ids.splice(to, 0, moved);

        router.patch(
            reorder.url(property.slug),
            { images: ids },
            { preserveScroll: true, only: ['property'] },
        );
    }

    function remove(imageId: number) {
        if (!window.confirm('Supprimer cette photo ?')) {
            return;
        }

        router.delete(
            destroy.url({ property: property.slug, image: imageId }),
            {
                preserveScroll: true,
            },
        );
    }

    return (
        <div className="flex flex-col gap-6">
            {hasPending && <ProcessingPoller />}

            <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Ajoutez au moins {minPhotos} photos (JPEG, PNG ou WebP, 800 ×
                500 px minimum, 10 Mo maximum). La première photo sert de
                couverture.
            </p>

            {remaining > 0 &&
                (cloudinaryDirectUpload ? (
                    <DirectCloudinaryUploadForm
                        propertySlug={property.slug}
                        remaining={remaining}
                    />
                ) : (
                    <Form
                        {...store.form(property.slug)}
                        options={{ preserveScroll: true }}
                        resetOnSuccess
                        className="flex flex-col gap-3 rounded-xl border-2 border-dashed border-zinc-300 p-6 dark:border-zinc-700"
                    >
                        {({ errors, processing, progress }) => (
                            <PhotoUploadFields
                                remaining={remaining}
                                processing={processing}
                                progress={progress?.percentage ?? null}
                                error={
                                    errors.photos ??
                                    Object.entries(errors).find(([key]) =>
                                        key.startsWith('photos.'),
                                    )?.[1]
                                }
                            />
                        )}
                    </Form>
                ))}

            {images.length > 0 && (
                <ol className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    {images.map((image, position) => (
                        <li key={image.id} className="flex flex-col gap-2">
                            <div
                                className={cn(
                                    'relative aspect-4/3 overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800',
                                    position === 0 &&
                                        'ring-2 ring-primary-500 ring-offset-2 dark:ring-offset-zinc-950',
                                )}
                            >
                                {image.is_processed && image.url ? (
                                    <img
                                        src={image.url}
                                        alt={`Photo ${position + 1}`}
                                        className="size-full object-cover"
                                    />
                                ) : (
                                    <div
                                        className="flex size-full animate-pulse items-center justify-center text-xs text-zinc-500"
                                        role="status"
                                    >
                                        Traitement en cours…
                                    </div>
                                )}
                                {position === 0 && (
                                    <span className="absolute top-2 left-2 rounded-full bg-primary-600 px-2 py-0.5 text-xs font-medium text-white">
                                        Couverture
                                    </span>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-1">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    disabled={position === 0}
                                    onClick={() => move(position, position - 1)}
                                    aria-label={`Avancer la photo ${position + 1}`}
                                >
                                    ←
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    disabled={position === images.length - 1}
                                    onClick={() => move(position, position + 1)}
                                    aria-label={`Reculer la photo ${position + 1}`}
                                >
                                    →
                                </Button>
                                {position > 0 && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => move(position, 0)}
                                    >
                                        Couverture
                                    </Button>
                                )}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-600 dark:text-red-400"
                                    onClick={() => remove(image.id)}
                                    aria-label={`Supprimer la photo ${position + 1}`}
                                >
                                    Supprimer
                                </Button>
                            </div>
                        </li>
                    ))}
                </ol>
            )}
        </div>
    );
}
