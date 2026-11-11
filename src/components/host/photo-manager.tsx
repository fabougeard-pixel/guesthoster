'use client';

import type { ChangeEvent, FormEvent } from 'react';
import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/button';
import { Badge } from '@/components/card';
import { Alert, InputError } from '@/components/form';
import { useActionFeedback } from '@/components/use-action-feedback';
import {
    confirmPropertyPhotoAction,
    deletePropertyPhotoAction,
    reorderPropertyPhotosAction,
} from '@/lib/actions/host';
import { plural } from '@/lib/format';
import { cn } from '@/lib/utils';
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
};

type QueuedPhoto = {
    id: string;
    file: File;
    previewUrl: string;
    width: number | null;
    height: number | null;
    error: string | null;
    isCover: boolean;
};

function readImageDimensions(
    previewUrl: string,
    fileName: string,
): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
        const image = new Image();

        image.onload = () => {
            resolve({ width: image.naturalWidth, height: image.naturalHeight });
        };

        image.onerror = () => {
            reject(
                new Error(`Impossible de lire les dimensions de « ${fileName} ».`),
            );
        };

        image.src = previewUrl;
    });
}

async function buildQueuedPhoto(
    file: File,
    isCover: boolean,
): Promise<QueuedPhoto> {
    const previewUrl = URL.createObjectURL(file);
    let width: number | null = null;
    let height: number | null = null;
    let error: string | null = null;

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
        error = `Format non supporté pour « ${file.name} » (JPEG, PNG ou WebP requis).`;
    } else if (file.size > MAX_IMAGE_BYTES) {
        error = `« ${file.name} » dépasse 10 Mo.`;
    } else {
        try {
            const dims = await readImageDimensions(previewUrl, file.name);
            width = dims.width;
            height = dims.height;
            if (width < MIN_IMAGE_WIDTH || height < MIN_IMAGE_HEIGHT) {
                error = `Dimensions insuffisantes (${width} × ${height} px, min. ${MIN_IMAGE_WIDTH} × ${MIN_IMAGE_HEIGHT} px).`;
            }
        } catch (err) {
            error =
                err instanceof Error
                    ? err.message
                    : `Fichier image illisible (${file.name}).`;
        }
    }

    return {
        id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 7)}`,
        file,
        previewUrl,
        width,
        height,
        error,
        isCover,
    };
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

export function PhotoManager({
    property,
    minPhotos,
    maxPhotos,
    cloudinaryDirectUpload = false,
    onImagesChange,
}: {
    property: HostProperty;
    minPhotos: number;
    maxPhotos: number;
    cloudinaryDirectUpload?: boolean;
    onImagesChange?: (images: HostProperty['images']) => void;
}) {
    const uid = useId();
    const { applyResult, pushToast, router } = useActionFeedback();
    const coverInputRef = useRef<HTMLInputElement | null>(null);
    const galleryInputRef = useRef<HTMLInputElement | null>(null);
    const pendingRef = useRef<QueuedPhoto[]>([]);
    const [pendingPhotos, setPendingPhotos] = useState<QueuedPhoto[]>([]);
    const [processing, setProcessing] = useState(false);
    const [progress, setProgress] = useState<number | null>(null);
    const [error, setError] = useState<string | undefined>(undefined);

    const images = property.images;
    const coverImage = images[0] ?? null;
    const galleryImages = images.slice(1);
    const remaining = maxPhotos - images.length;

    useEffect(() => {
        pendingRef.current = pendingPhotos;
    }, [pendingPhotos]);

    useEffect(() => {
        return () => {
            for (const item of pendingRef.current) {
                URL.revokeObjectURL(item.previewUrl);
            }
        };
    }, []);

    async function queueFiles(files: File[], targetRole: 'cover' | 'gallery') {
        if (files.length === 0) {
            return;
        }
        setError(undefined);

        const availableSlots = Math.max(0, remaining - pendingPhotos.length);
        const accepted =
            targetRole === 'cover'
                ? files.slice(0, 1)
                : files.slice(0, Math.max(1, availableSlots));

        if (targetRole === 'gallery' && files.length > availableSlots && availableSlots > 0) {
            setError(
                `Seules ${availableSlots} photo(s) supplémentaire(s) ont été ajoutées à la file (maximum ${maxPhotos}).`,
            );
        } else if (availableSlots === 0 && !(targetRole === 'cover' && pendingPhotos.some((p) => p.isCover))) {
            setError(`Vous avez déjà atteint la limite de ${maxPhotos} photos.`);
            return;
        }

        const built = await Promise.all(
            accepted.map((file, idx) =>
                buildQueuedPhoto(
                    file,
                    targetRole === 'cover' ||
                        (images.length === 0 &&
                            !pendingPhotos.some((p) => p.isCover) &&
                            idx === 0),
                ),
            ),
        );

        setPendingPhotos((prev) => {
            if (targetRole === 'cover') {
                // Remplace l'éventuelle photo en attente marquée comme couverture
                const withoutOldQueuedCover = prev.filter((item) => {
                    if (item.isCover) {
                        URL.revokeObjectURL(item.previewUrl);
                        return false;
                    }
                    return true;
                });
                return [...built, ...withoutOldQueuedCover];
            }
            return [...prev, ...built];
        });

        if (coverInputRef.current) {
            coverInputRef.current.value = '';
        }
        if (galleryInputRef.current) {
            galleryInputRef.current.value = '';
        }
    }

    function onCoverSelect(event: ChangeEvent<HTMLInputElement>) {
        const files = Array.from(event.target.files ?? []);
        void queueFiles(files, 'cover');
    }

    function onGallerySelect(event: ChangeEvent<HTMLInputElement>) {
        const files = Array.from(event.target.files ?? []);
        void queueFiles(files, 'gallery');
    }

    function setPendingAsCover(id: string) {
        setPendingPhotos((prev) =>
            prev.map((item) => ({
                ...item,
                isCover: item.id === id,
            })),
        );
    }

    function removePending(id: string) {
        setPendingPhotos((prev) => {
            const target = prev.find((item) => item.id === id);
            if (target) {
                URL.revokeObjectURL(target.previewUrl);
            }
            return prev.filter((item) => item.id !== id);
        });
    }

    async function handleUpload(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(undefined);

        if (pendingPhotos.length === 0) {
            setError('Sélectionnez au moins une photo à prévisualiser puis envoyer.');
            return;
        }

        const invalidItem = pendingPhotos.find((p) => p.error !== null);
        if (invalidItem) {
            setError(invalidItem.error ?? 'Une photo sélectionnée est invalide.');
            return;
        }

        if (pendingPhotos.length > remaining) {
            setError(
                `Vous pouvez encore enregistrer ${remaining} photo(s) au maximum.`,
            );
            return;
        }

        setProcessing(true);
        setProgress(0);

        // Mettre l'image marquée comme couverture en dernier ou premier selon stratégie :
        // Envoyer d'abord les photos de galerie puis la photo de couverture avec setAsCover: true,
        // ou envoyer la photo de couverture avec setAsCover: true en premier et les autres sans setAsCover.
        const orderedQueue = [
            ...pendingPhotos.filter((p) => p.isCover),
            ...pendingPhotos.filter((p) => !p.isCover),
        ];

        try {
            const signResponse = await fetch(
                `/api/host/properties/${property.slug}/photos/signature`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'same-origin',
                    body: JSON.stringify({ count: orderedQueue.length }),
                },
            );

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

            for (let index = 0; index < orderedQueue.length; index += 1) {
                const item = orderedQueue[index]!;
                const uploaded = await uploadFileToCloudinary(
                    signed.upload_url,
                    signed.params,
                    item.file,
                    (ratio) => {
                        const completed =
                            (index + ratio) / orderedQueue.length;
                        setProgress(Math.round(completed * 100));
                    },
                );

                const res = await confirmPropertyPhotoAction({
                    slug: property.slug,
                    cloudinary_public_id: uploaded.public_id,
                    version: uploaded.version,
                    signature: uploaded.signature,
                    setAsCover: item.isCover,
                });

                if (!res.ok) {
                    throw new Error(
                        res.error ?? 'Enregistrement de la photo impossible.',
                    );
                }
                if (res.data?.images) {
                    onImagesChange?.(res.data.images);
                }
            }

            for (const item of orderedQueue) {
                URL.revokeObjectURL(item.previewUrl);
            }
            setPendingPhotos([]);
            setProgress(100);
            pushToast({
                type: 'success',
                message:
                    orderedQueue.length > 1
                        ? `${orderedQueue.length} photos ajoutées.`
                        : 'Photo ajoutée.',
            });
            router.refresh();
        } catch (caughtError) {
            setError(
                caughtError instanceof Error
                    ? caughtError.message
                    : 'Une erreur est survenue lors de l’envoi.',
            );
        } finally {
            setProcessing(false);
            setProgress(null);
        }
    }

    async function move(from: number, to: number) {
        const ids = images.map((image) => image.id);
        const [moved] = ids.splice(from, 1);
        if (moved === undefined) {
            return;
        }
        ids.splice(to, 0, moved);
        const res = await reorderPropertyPhotosAction({
            slug: property.slug,
            order: ids,
        });
        if (res.ok && res.data?.images) {
            onImagesChange?.(res.data.images);
        }
        applyResult(res);
    }

    async function remove(imageId: number) {
        if (!window.confirm('Supprimer cette photo ?')) {
            return;
        }
        const res = await deletePropertyPhotoAction({
            slug: property.slug,
            imageId,
        });
        if (res.ok && res.data?.images) {
            onImagesChange?.(res.data.images);
        }
        applyResult(res);
    }

    const hasInvalidPending = pendingPhotos.some((p) => p.error !== null);

    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                <p>
                    Ajoutez au moins {minPhotos} photos (JPEG, PNG ou WebP, 800
                    × 500 px minimum, 10 Mo maximum). Visualisez vos images
                    ci-dessous et choisissez l’<strong>image principale</strong>{' '}
                    ainsi que la <strong>galerie</strong>.
                </p>
                <Badge tone={images.length >= minPhotos ? 'success' : 'neutral'}>
                    {images.length} / {maxPhotos} enregistrée
                    {images.length > 1 ? 's' : ''}
                </Badge>
            </div>

            {remaining > 0 &&
                (cloudinaryDirectUpload ? (
                    <form
                        onSubmit={(event) => void handleUpload(event)}
                        className="flex flex-col gap-5"
                    >
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="flex flex-col justify-between gap-3 rounded-xl border-2 border-dashed border-primary-300 bg-primary-50/40 p-5 dark:border-primary-800 dark:bg-primary-950/20">
                                <div>
                                    <p className="text-sm font-semibold text-primary-800 dark:text-primary-200">
                                        1. Image principale (Couverture)
                                    </p>
                                    <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                                        Affichée en premier sur les résultats de
                                        recherche et en tête de l’annonce.
                                    </p>
                                </div>
                                <input
                                    ref={coverInputRef}
                                    id={`${uid}-cover-photo`}
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    onChange={onCoverSelect}
                                    className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary-600 file:px-3.5 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-primary-700"
                                />
                            </div>

                            <div className="flex flex-col justify-between gap-3 rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50/50 p-5 dark:border-zinc-700 dark:bg-zinc-900/40">
                                <div>
                                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                        2. Photos de la galerie ({plural(remaining, 'emplacement disponible', 'emplacements disponibles')})
                                    </p>
                                    <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                                        Sélectionnez une ou plusieurs photos
                                        (pièces, extérieur, détails) pour
                                        compléter la galerie.
                                    </p>
                                </div>
                                <input
                                    ref={galleryInputRef}
                                    id={`${uid}-gallery-photos`}
                                    name="photos[]"
                                    type="file"
                                    multiple
                                    accept="image/jpeg,image/png,image/webp"
                                    onChange={onGallerySelect}
                                    className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-secondary-800 file:px-3.5 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-secondary-900"
                                />
                            </div>
                        </div>

                        {pendingPhotos.length > 0 && (
                            <div className="space-y-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="text-sm font-semibold">
                                        Aperçu avant envoi ({pendingPhotos.length}{' '}
                                        sélectionnée
                                        {pendingPhotos.length > 1 ? 's' : ''})
                                    </p>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                        Cliquez sur « Définir en image principale »
                                        pour choisir la couverture avant
                                        l’envoi.
                                    </p>
                                </div>

                                <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                                    {pendingPhotos.map((item) => (
                                        <li
                                            key={item.id}
                                            className="flex flex-col gap-2"
                                        >
                                            <div
                                                className={cn(
                                                    'relative aspect-4/3 overflow-hidden rounded-xl bg-zinc-200 dark:bg-zinc-800',
                                                    item.error
                                                        ? 'ring-2 ring-red-500'
                                                        : item.isCover &&
                                                          'ring-2 ring-primary-500 ring-offset-2 dark:ring-offset-zinc-900',
                                                )}
                                            >
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img
                                                    src={item.previewUrl}
                                                    alt={item.file.name}
                                                    className="size-full object-cover"
                                                />
                                                {item.isCover && !item.error && (
                                                    <span className="absolute top-2 left-2 rounded-full bg-primary-600 px-2 py-0.5 text-[11px] font-semibold text-white shadow">
                                                        Image principale
                                                    </span>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        removePending(item.id)
                                                    }
                                                    aria-label={`Retirer ${item.file.name}`}
                                                    className="absolute top-2 right-2 flex size-6 items-center justify-center rounded-full bg-black/70 text-xs font-bold text-white hover:bg-black"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="truncate text-xs font-medium text-zinc-700 dark:text-zinc-300">
                                                    {item.file.name}
                                                </p>
                                                {item.width && item.height && (
                                                    <p className="text-[11px] text-zinc-500">
                                                        {item.width} ×{' '}
                                                        {item.height} px
                                                    </p>
                                                )}
                                                {item.error ? (
                                                    <p className="text-[11px] font-medium text-red-600 dark:text-red-400">
                                                        {item.error}
                                                    </p>
                                                ) : !item.isCover ? (
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="w-full text-xs"
                                                        onClick={() =>
                                                            setPendingAsCover(
                                                                item.id,
                                                            )
                                                        }
                                                    >
                                                        Définir en image
                                                        principale
                                                    </Button>
                                                ) : null}
                                            </div>
                                        </li>
                                    ))}
                                </ul>

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

                                <div className="flex flex-wrap items-center gap-3">
                                    <Button
                                        type="submit"
                                        loading={processing}
                                        disabled={hasInvalidPending}
                                    >
                                        Envoyer et enregistrer (
                                        {pendingPhotos.length})
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        disabled={processing}
                                        onClick={() => {
                                            for (const item of pendingPhotos) {
                                                URL.revokeObjectURL(
                                                    item.previewUrl,
                                                );
                                            }
                                            setPendingPhotos([]);
                                            setError(undefined);
                                        }}
                                    >
                                        Tout effacer
                                    </Button>
                                </div>
                            </div>
                        )}

                        {pendingPhotos.length === 0 && error && (
                            <InputError message={error} />
                        )}
                    </form>
                ) : (
                    <Alert tone="warning">
                        Configurez les variables Cloudinary (`CLOUDINARY_*`)
                        pour activer le téléversement direct de photos.
                    </Alert>
                ))}

            {images.length > 0 && (
                <div className="space-y-6">
                    {coverImage && (
                        <section className="space-y-2">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                    Image principale enregistrée
                                </h3>
                                <Badge tone="primary">Couverture</Badge>
                            </div>
                            <div className="grid gap-4 rounded-xl border border-primary-200 bg-primary-50/20 p-4 sm:grid-cols-[16rem_1fr] sm:items-center dark:border-primary-900/60 dark:bg-primary-950/10">
                                <div className="relative aspect-4/3 overflow-hidden rounded-xl bg-zinc-100 ring-2 ring-primary-500 dark:bg-zinc-800">
                                    {coverImage.is_processed && coverImage.url ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={coverImage.url}
                                            alt="Image principale du logement"
                                            className="size-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex size-full animate-pulse items-center justify-center text-xs text-zinc-500">
                                            Traitement en cours…
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-col items-start gap-2">
                                    <p className="text-sm font-medium">
                                        Photo mise en avant sur le catalogue et
                                        en haut de la fiche.
                                    </p>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                        Pour la remplacer, sélectionnez une
                                        nouvelle photo dans « Image principale »
                                        ou promouvez une photo de la galerie.
                                    </p>
                                    <div className="flex flex-wrap gap-2 pt-1">
                                        {galleryImages.length > 0 && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => void move(0, 1)}
                                            >
                                                Déplacer dans la galerie →
                                            </Button>
                                        )}
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-red-600 dark:text-red-400"
                                            onClick={() =>
                                                void remove(coverImage.id)
                                            }
                                        >
                                            Supprimer
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </section>
                    )}

                    <section className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                Galerie du logement ({galleryImages.length})
                            </h3>
                        </div>

                        {galleryImages.length === 0 ? (
                            <p className="rounded-xl border border-dashed border-zinc-200 p-4 text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                                Ajoutez d’autres photos ci-dessus pour enrichir
                                la galerie du logement.
                            </p>
                        ) : (
                            <ol className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                                {galleryImages.map((image, idx) => {
                                    const position = idx + 1;
                                    return (
                                        <li
                                            key={image.id}
                                            className="flex flex-col gap-2"
                                        >
                                            <div className="relative aspect-4/3 overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800">
                                                {image.is_processed && image.url ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img
                                                        src={image.url}
                                                        alt={`Galerie ${position}`}
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
                                                <span className="absolute top-2 left-2 rounded-full bg-zinc-900/75 px-2 py-0.5 text-[11px] font-medium text-white">
                                                    Galerie #{position}
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    disabled={position === 0}
                                                    onClick={() =>
                                                        void move(
                                                            position,
                                                            position - 1,
                                                        )
                                                    }
                                                    aria-label={`Avancer la photo ${position + 1}`}
                                                >
                                                    ←
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    disabled={
                                                        position ===
                                                        images.length - 1
                                                    }
                                                    onClick={() =>
                                                        void move(
                                                            position,
                                                            position + 1,
                                                        )
                                                    }
                                                    aria-label={`Reculer la photo ${position + 1}`}
                                                >
                                                    →
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() =>
                                                        void move(position, 0)
                                                    }
                                                >
                                                    Image principale
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-red-600 dark:text-red-400"
                                                    onClick={() =>
                                                        void remove(image.id)
                                                    }
                                                    aria-label={`Supprimer la photo ${position + 1}`}
                                                >
                                                    Supprimer
                                                </Button>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ol>
                        )}
                    </section>
                </div>
            )}
        </div>
    );
}
