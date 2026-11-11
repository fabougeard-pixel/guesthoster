'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getFreshSessionUser, isHostOrAdmin } from '@/lib/auth/session';
import {
    approvePendingBooking,
    declinePendingBooking,
} from '@/lib/domain/bookings';
import {
    BLOCKING_BOOKING_STATUSES,
    canPropertyTransitionTo,
    nextPropertyFormStep,
    type PropertyFormStep,
    type PropertyStatus,
} from '@/lib/domain/enums';
import {
    deletePropertyImageFiles,
    DomainError,
    generatePropertySlug,
    MAX_PHOTOS,
    missingPropertyRequirements,
} from '@/lib/domain/properties';
import { addDays, isValidIsoDate, parseDate, todayIso } from '@/lib/format';
import { prisma } from '@/lib/prisma';
import {
    cloudinaryDeliveryUrls,
    isValidPropertyPublicId,
    verifyCloudinaryUploadSignature,
} from '@/lib/services/cloudinary';
import { type ActionResult, zodToFieldErrors } from './types';

async function requireEditableHostProperty(slug: string) {
    const user = await getFreshSessionUser();
    if (!user || !user.emailVerifiedAt || !isHostOrAdmin(user)) {
        return { error: 'Accès réservé aux hôtes vérifiés.' as const };
    }

    const property = await prisma.property.findUnique({
        where: { slug },
        include: {
            images: { orderBy: { position: 'asc' } },
        },
    });

    if (!property) {
        return { error: 'Logement introuvable.' as const };
    }

    if (property.userId !== user.id && user.role !== 'admin') {
        return { error: 'Vous n’êtes pas autorisé à modifier ce logement.' as const };
    }

    return { user, property };
}

const detailsSchema = z.object({
    title: z
        .string()
        .trim()
        .min(10, 'Le titre doit contenir au moins 10 caractères.')
        .max(120, 'Le titre ne doit pas dépasser 120 caractères.'),
    property_type_id: z.coerce
        .number()
        .int()
        .positive('Choisissez un type de logement.'),
    description: z
        .string()
        .trim()
        .min(80, 'La description doit contenir au moins 80 caractères.')
        .max(5000, 'La description ne doit pas dépasser 5000 caractères.'),
});

export async function createPropertyAction(input: {
    title: string;
    property_type_id: number;
    description: string;
}): Promise<ActionResult> {
    const user = await getFreshSessionUser();
    if (!user || !user.emailVerifiedAt || !isHostOrAdmin(user)) {
        return { ok: false, error: 'Accès réservé aux hôtes vérifiés.' };
    }

    const parsed = detailsSchema.safeParse(input);
    if (!parsed.success) {
        return { ok: false, fieldErrors: zodToFieldErrors(parsed.error) };
    }

    const propertyType = await prisma.propertyType.findFirst({
        where: { id: parsed.data.property_type_id, isActive: true },
        select: { id: true },
    });
    if (!propertyType) {
        return {
            ok: false,
            fieldErrors: { property_type_id: 'Type de logement indisponible.' },
        };
    }

    const created = await prisma.property.create({
        data: {
            userId: user.id,
            title: parsed.data.title,
            slug: generatePropertySlug(parsed.data.title),
            propertyTypeId: propertyType.id,
            description: parsed.data.description,
            status: 'draft',
            bookingMode: 'request',
        },
    });

    revalidatePath('/hote');

    return {
        ok: true,
        redirectTo: `/hote/logements/${created.slug}/modifier/location`,
        toast: {
            type: 'success',
            message: 'Brouillon créé. Poursuivez avec l’emplacement.',
        },
    };
}

const locationSchema = z.object({
    city_id: z.coerce.number().int().positive('Choisissez une ville.'),
    address: z
        .string()
        .trim()
        .min(2, 'Saisissez l’adresse.')
        .max(255),
    postal_code: z.string().trim().max(20).optional().nullable(),
});

const capacitySchema = z.object({
    max_guests: z.coerce.number().int().min(1).max(30),
    bedrooms: z.coerce.number().int().min(0).max(30),
    beds: z.coerce.number().int().min(1).max(50),
    bathrooms: z.coerce.number().int().min(0).max(20),
});

const amenitiesSchema = z.object({
    amenities: z.array(z.coerce.number().int().positive()).default([]),
});

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

const pricingSchema = z
    .object({
        price_per_night: z.coerce
            .number()
            .min(10, 'Le tarif minimum par nuit est de 10 €.')
            .max(10_000, 'Le tarif maximum par nuit est de 10 000 €.'),
        cleaning_fee: z.coerce
            .number()
            .min(0)
            .max(1_000)
            .optional()
            .nullable(),
        min_nights: z.coerce.number().int().min(1).max(90),
        max_nights: z.preprocess(
            (val) => (val === '' || val === null || val === undefined ? null : Number(val)),
            z.number().int().min(1).max(365).nullable(),
        ),
        check_in_time: z.string().regex(timePattern, 'Format HH:MM attendu.'),
        check_out_time: z.string().regex(timePattern, 'Format HH:MM attendu.'),
        booking_mode: z.enum(['instant', 'request']),
    })
    .refine(
        (d) => d.max_nights === null || d.max_nights >= d.min_nights,
        {
            path: ['max_nights'],
            message:
                'Le séjour maximum doit être supérieur ou égal au séjour minimum.',
        },
    );

export async function updatePropertyStepAction(input: {
    slug: string;
    step: PropertyFormStep;
    values: Record<string, unknown>;
}): Promise<ActionResult> {
    const auth = await requireEditableHostProperty(input.slug);
    if ('error' in auth) {
        return { ok: false, error: auth.error };
    }
    const { property } = auth;

    if (input.step === 'details') {
        const parsed = detailsSchema.safeParse(input.values);
        if (!parsed.success) {
            return { ok: false, fieldErrors: zodToFieldErrors(parsed.error) };
        }
        const typeRow = await prisma.propertyType.findFirst({
            where: {
                id: parsed.data.property_type_id,
                OR: [{ isActive: true }, { id: property.propertyTypeId }],
            },
            select: { id: true },
        });
        if (!typeRow) {
            return {
                ok: false,
                fieldErrors: { property_type_id: 'Type de logement invalide.' },
            };
        }
        await prisma.property.update({
            where: { id: property.id },
            data: {
                title: parsed.data.title,
                propertyTypeId: typeRow.id,
                description: parsed.data.description,
            },
        });
    } else if (input.step === 'location') {
        const parsed = locationSchema.safeParse(input.values);
        if (!parsed.success) {
            return { ok: false, fieldErrors: zodToFieldErrors(parsed.error) };
        }
        const cityRow = await prisma.city.findFirst({
            where: { id: parsed.data.city_id, isActive: true },
            select: { id: true },
        });
        if (!cityRow) {
            return {
                ok: false,
                fieldErrors: { city_id: 'Cette ville n’est pas disponible.' },
            };
        }
        await prisma.property.update({
            where: { id: property.id },
            data: {
                cityId: cityRow.id,
                address: parsed.data.address,
                postalCode: parsed.data.postal_code?.trim() || null,
            },
        });
    } else if (input.step === 'capacity') {
        const parsed = capacitySchema.safeParse(input.values);
        if (!parsed.success) {
            return { ok: false, fieldErrors: zodToFieldErrors(parsed.error) };
        }
        await prisma.property.update({
            where: { id: property.id },
            data: {
                maxGuests: parsed.data.max_guests,
                bedrooms: parsed.data.bedrooms,
                beds: parsed.data.beds,
                bathrooms: parsed.data.bathrooms,
            },
        });
    } else if (input.step === 'amenities') {
        const parsed = amenitiesSchema.safeParse(input.values);
        if (!parsed.success) {
            return { ok: false, fieldErrors: zodToFieldErrors(parsed.error) };
        }
        const uniqueIds = [...new Set(parsed.data.amenities)];
        const validAmenities = await prisma.amenity.findMany({
            where: { id: { in: uniqueIds } },
            select: { id: true },
        });
        await prisma.$transaction([
            prisma.amenityProperty.deleteMany({
                where: { propertyId: property.id },
            }),
            ...(validAmenities.length > 0
                ? [
                      prisma.amenityProperty.createMany({
                          data: validAmenities.map((a) => ({
                              propertyId: property.id,
                              amenityId: a.id,
                          })),
                      }),
                  ]
                : []),
        ]);
    } else if (input.step === 'pricing') {
        const parsed = pricingSchema.safeParse(input.values);
        if (!parsed.success) {
            return { ok: false, fieldErrors: zodToFieldErrors(parsed.error) };
        }
        await prisma.property.update({
            where: { id: property.id },
            data: {
                pricePerNight: Math.round(parsed.data.price_per_night * 100),
                cleaningFee: Math.round((parsed.data.cleaning_fee ?? 0) * 100),
                minNights: parsed.data.min_nights,
                maxNights: parsed.data.max_nights,
                checkInTime: parsed.data.check_in_time,
                checkOutTime: parsed.data.check_out_time,
                bookingMode: parsed.data.booking_mode,
            },
        });
    }

    const nextStep = nextPropertyFormStep(input.step) ?? input.step;
    revalidatePath(`/hote/logements/${property.slug}/modifier`, 'layout');
    revalidatePath(`/logements/${property.slug}`);

    return {
        ok: true,
        redirectTo: `/hote/logements/${property.slug}/modifier/${nextStep}`,
        toast: { type: 'success', message: 'Modifications enregistrées.' },
    };
}

export async function deletePropertyAction(
    slug: string,
): Promise<ActionResult> {
    const auth = await requireEditableHostProperty(slug);
    if ('error' in auth) {
        return { ok: false, error: auth.error };
    }
    const { property } = auth;

    const hasBookings = await prisma.booking.findFirst({
        where: { propertyId: property.id },
        select: { id: true },
    });

    if (hasBookings) {
        return {
            ok: false,
            error:
                'Ce logement possède un historique de réservations : archivez-le plutôt.',
        };
    }

    await Promise.all(
        property.images.map((img) => deletePropertyImageFiles(img)),
    );
    await prisma.property.delete({ where: { id: property.id } });

    revalidatePath('/hote');
    return {
        ok: true,
        redirectTo: '/hote',
        toast: { type: 'info', message: 'Le logement a été supprimé.' },
    };
}

async function transitionHostProperty(
    slug: string,
    target: PropertyStatus,
    successMessage: string,
): Promise<ActionResult> {
    const auth = await requireEditableHostProperty(slug);
    if ('error' in auth) {
        return { ok: false, error: auth.error };
    }
    const { property } = auth;
    const currentStatus = property.status as PropertyStatus;

    if (target === 'pending') {
        const processedCount = property.images.filter(
            (i) => i.processedAt !== null,
        ).length;
        const missing = missingPropertyRequirements({
            cityId: property.cityId,
            address: property.address,
            pricePerNight: property.pricePerNight,
            processedImagesCount: processedCount,
        });
        const firstMissingKey = Object.keys(missing)[0];
        if (firstMissingKey) {
            return {
                ok: false,
                error: missing[firstMissingKey],
            };
        }
    }

    if (!canPropertyTransitionTo(currentStatus, target)) {
        return {
            ok: false,
            error: 'Cette action n’est pas possible pour ce logement.',
        };
    }

    await prisma.property.update({
        where: { id: property.id },
        data: {
            status: target,
            ...(target === 'pending'
                ? { submittedAt: new Date(), rejectionReason: null }
                : {}),
        },
    });

    revalidatePath(`/hote/logements/${property.slug}/modifier`, 'layout');
    revalidatePath('/hote');
    revalidatePath('/admin/logements');

    return {
        ok: true,
        toast: { type: 'success', message: successMessage },
    };
}

export async function submitPropertyAction(slug: string) {
    return transitionHostProperty(
        slug,
        'pending',
        'Logement envoyé en validation. Nous revenons vers vous rapidement.',
    );
}

export async function withdrawPropertyAction(slug: string) {
    return transitionHostProperty(slug, 'draft', 'Logement repassé en brouillon.');
}

export async function archivePropertyAction(slug: string) {
    return transitionHostProperty(
        slug,
        'archived',
        'Logement archivé : il n’apparaît plus dans les recherches.',
    );
}

export async function restorePropertyAction(slug: string) {
    return transitionHostProperty(slug, 'draft', 'Logement restauré en brouillon.');
}

export async function approveBookingAction(
    reference: string,
): Promise<ActionResult> {
    const user = await getFreshSessionUser();
    if (!user || !user.emailVerifiedAt || !isHostOrAdmin(user)) {
        return { ok: false, error: 'Accès non autorisé.' };
    }

    try {
        await approvePendingBooking(reference, user);
        revalidatePath('/hote/reservations');
        revalidatePath(`/reservations/${reference}`);
        return {
            ok: true,
            toast: {
                type: 'success',
                message: 'Demande acceptée. Le voyageur a été invité à payer.',
            },
        };
    } catch (error) {
        if (error instanceof DomainError) {
            return { ok: false, error: error.message };
        }
        throw error;
    }
}

export async function declineBookingAction(input: {
    reference: string;
    reason?: string | null;
}): Promise<ActionResult> {
    const user = await getFreshSessionUser();
    if (!user || !user.emailVerifiedAt || !isHostOrAdmin(user)) {
        return { ok: false, error: 'Accès non autorisé.' };
    }

    const reason = input.reason?.trim() || null;
    if (reason && reason.length > 500) {
        return {
            ok: false,
            fieldErrors: {
                reason: 'Le motif ne doit pas dépasser 500 caractères.',
            },
        };
    }

    try {
        await declinePendingBooking(input.reference, user, reason);
        revalidatePath('/hote/reservations');
        revalidatePath(`/reservations/${input.reference}`);
        return {
            ok: true,
            toast: { type: 'info', message: 'Demande refusée.' },
        };
    } catch (error) {
        if (error instanceof DomainError) {
            return { ok: false, error: error.message };
        }
        throw error;
    }
}

export async function storeBlockedPeriodAction(input: {
    slug: string;
    starts_on: string;
    ends_on: string;
    reason?: string | null;
}): Promise<ActionResult> {
    const auth = await requireEditableHostProperty(input.slug);
    if ('error' in auth) {
        return { ok: false, error: auth.error };
    }
    const { property } = auth;

    const maxIso = addDays(todayIso(), 730);
    const schema = z
        .object({
            starts_on: z
                .string()
                .refine(isValidIsoDate, 'Date de début invalide.')
                .refine(
                    (d) => d >= todayIso(),
                    'La date de début ne peut pas être dans le passé.',
                ),
            ends_on: z
                .string()
                .refine(isValidIsoDate, 'Date de fin invalide.')
                .refine(
                    (d) => d <= maxIso,
                    'La date de fin ne doit pas dépasser 2 ans.',
                ),
            reason: z.string().trim().max(100).optional().nullable(),
        })
        .refine((d) => d.ends_on > d.starts_on, {
            path: ['ends_on'],
            message: 'La date de fin doit être postérieure à la date de début.',
        });

    const parsed = schema.safeParse(input);
    if (!parsed.success) {
        return { ok: false, fieldErrors: zodToFieldErrors(parsed.error) };
    }

    const start = parseDate(parsed.data.starts_on);
    const end = parseDate(parsed.data.ends_on);

    const [bookingOverlap, periodOverlap] = await Promise.all([
        prisma.booking.findFirst({
            where: {
                propertyId: property.id,
                status: { in: BLOCKING_BOOKING_STATUSES },
                checkIn: { lt: end },
                checkOut: { gt: start },
            },
            select: { id: true },
        }),
        prisma.blockedPeriod.findFirst({
            where: {
                propertyId: property.id,
                startsOn: { lt: end },
                endsOn: { gt: start },
            },
            select: { id: true },
        }),
    ]);

    if (bookingOverlap) {
        return {
            ok: false,
            fieldErrors: {
                starts_on: 'Ces dates chevauchent une réservation existante.',
            },
        };
    }

    if (periodOverlap) {
        return {
            ok: false,
            fieldErrors: {
                starts_on: 'Ces dates sont déjà bloquées en partie.',
            },
        };
    }

    await prisma.blockedPeriod.create({
        data: {
            propertyId: property.id,
            startsOn: start,
            endsOn: end,
            reason: parsed.data.reason || null,
        },
    });

    revalidatePath(`/hote/logements/${property.slug}/calendrier`);
    revalidatePath(`/logements/${property.slug}`);

    return {
        ok: true,
        toast: { type: 'success', message: 'Dates bloquées.' },
    };
}

export async function deleteBlockedPeriodAction(input: {
    slug: string;
    periodId: number;
}): Promise<ActionResult> {
    const auth = await requireEditableHostProperty(input.slug);
    if ('error' in auth) {
        return { ok: false, error: auth.error };
    }

    await prisma.blockedPeriod.deleteMany({
        where: { id: input.periodId, propertyId: auth.property.id },
    });

    revalidatePath(`/hote/logements/${auth.property.slug}/calendrier`);
    revalidatePath(`/logements/${auth.property.slug}`);

    return {
        ok: true,
        toast: { type: 'info', message: 'Dates débloquées.' },
    };
}

export async function confirmPropertyPhotoAction(input: {
    slug: string;
    cloudinary_public_id: string;
    version: number;
    signature: string;
}): Promise<ActionResult> {
    const auth = await requireEditableHostProperty(input.slug);
    if ('error' in auth) {
        return { ok: false, error: auth.error };
    }
    const { property } = auth;

    if (property.images.length >= MAX_PHOTOS) {
        return {
            ok: false,
            error: `Maximum ${MAX_PHOTOS} photos autorisées par logement.`,
        };
    }

    if (
        !isValidPropertyPublicId(property.id, input.cloudinary_public_id) ||
        !verifyCloudinaryUploadSignature(
            input.cloudinary_public_id,
            input.version,
            input.signature,
        )
    ) {
        return { ok: false, error: 'Signature de téléversement invalide.' };
    }

    const { url, thumbnail_url } = cloudinaryDeliveryUrls(
        input.cloudinary_public_id,
    );
    const maxPos = property.images.reduce(
        (max, img) => Math.max(max, img.position),
        -1,
    );

    await prisma.propertyImage.create({
        data: {
            propertyId: property.id,
            path: url,
            thumbnailPath: thumbnail_url,
            cloudinaryPublicId: input.cloudinary_public_id,
            processedAt: new Date(),
            position: maxPos + 1,
        },
    });

    revalidatePath(`/hote/logements/${property.slug}/modifier`, 'layout');
    return { ok: true };
}

export async function reorderPropertyPhotosAction(input: {
    slug: string;
    order: number[];
}): Promise<ActionResult> {
    const auth = await requireEditableHostProperty(input.slug);
    if ('error' in auth) {
        return { ok: false, error: auth.error };
    }

    const existingIds = new Set(auth.property.images.map((i) => i.id));
    const filteredOrder = input.order.filter((id) => existingIds.has(id));

    await prisma.$transaction(
        filteredOrder.map((imageId, index) =>
            prisma.propertyImage.updateMany({
                where: { id: imageId, propertyId: auth.property.id },
                data: { position: index },
            }),
        ),
    );

    revalidatePath(`/hote/logements/${auth.property.slug}/modifier`, 'layout');
    revalidatePath(`/logements/${auth.property.slug}`);
    return {
        ok: true,
        toast: { type: 'success', message: 'Ordre des photos enregistré.' },
    };
}

export async function deletePropertyPhotoAction(input: {
    slug: string;
    imageId: number;
}): Promise<ActionResult> {
    const auth = await requireEditableHostProperty(input.slug);
    if ('error' in auth) {
        return { ok: false, error: auth.error };
    }

    const image = auth.property.images.find((i) => i.id === input.imageId);
    if (!image) {
        return { ok: false, error: 'Photo introuvable.' };
    }

    await deletePropertyImageFiles(image);
    await prisma.propertyImage.delete({ where: { id: image.id } });

    revalidatePath(`/hote/logements/${auth.property.slug}/modifier`, 'layout');
    revalidatePath(`/logements/${auth.property.slug}`);
    return {
        ok: true,
        toast: { type: 'info', message: 'Photo supprimée.' },
    };
}

