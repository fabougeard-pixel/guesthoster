'use server';

import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { hashPassword } from '@/lib/auth/password';
import { getFreshSessionUser, isHostOrAdmin } from '@/lib/auth/session';
import {
    approvePendingBooking,
    declinePendingBooking,
} from '@/lib/domain/bookings';
import {
    BLOCKING_BOOKING_STATUSES,
    canPropertyTransitionTo,
    isPropertyEditable,
    nextPropertyFormStep,
    type PropertyFormStep,
    type PropertyStatus,
    type RentalDuration,
} from '@/lib/domain/enums';
import {
    deletePropertyImageFiles,
    DomainError,
    generatePropertySlug,
    getHostPropertyForEdit,
    MAX_PHOTOS,
    missingPropertyRequirements,
    serializePropertyImages,
} from '@/lib/domain/properties';
import {
    adminOwnerSchema,
    amenitiesSchema,
    capacitySchema,
    detailsSchema,
    fullPropertyDraftSchema,
    locationSchema,
    pricingSchema,
} from '@/lib/domain/property-schemas';
import { resolveOrCreatePropertyType } from '@/lib/domain/taxonomy';
import { addDays, isValidIsoDate, parseDate, todayIso } from '@/lib/format';
import { notifyPropertyPublished } from '@/lib/notifications/service';
import { prisma } from '@/lib/prisma';
import {
    cloudinaryDeliveryUrls,
    isCloudinaryConfigured,
    isValidPropertyPublicId,
    verifyCloudinaryUploadSignature,
} from '@/lib/services/cloudinary';
import type { HostProperty } from '@/types';
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

function revalidatePropertyPaths(slug: string): void {
    revalidatePath('/hote');
    revalidatePath('/admin');
    revalidatePath('/admin/logements');
    revalidatePath(`/hote/logements/${slug}/modifier`, 'layout');
    revalidatePath(`/admin/logements/${slug}/modifier`, 'layout');
    revalidatePath(`/logements/${slug}`);
    revalidatePath('/logements');
    revalidatePath('/');
}

async function resolvePropertyTypeForSave(input: {
    propertyTypeId: number | null;
    customPropertyType?: string;
    existingPropertyTypeId?: number;
}): Promise<{ id: number; name: string; created: boolean } | null> {
    if (input.propertyTypeId === null) {
        const customName = input.customPropertyType?.trim();
        if (!customName) {
            return null;
        }
        const resolved = await resolveOrCreatePropertyType(customName);
        if (resolved.created) {
            revalidatePath('/admin/types-de-logement');
            revalidatePath('/logements');
        }
        return { id: resolved.id, name: resolved.name, created: resolved.created };
    }

    const found = await prisma.propertyType.findFirst({
        where: {
            id: input.propertyTypeId,
            ...(input.existingPropertyTypeId
                ? {
                      OR: [
                          { isActive: true },
                          { id: input.existingPropertyTypeId },
                      ],
                  }
                : { isActive: true }),
        },
        select: { id: true, name: true },
    });

    return found ? { ...found, created: false } : null;
}

function mapPricingToDbFields(input: {
    rental_duration: RentalDuration;
    price_per_night: number;
    cleaning_fee: number;
    min_nights: number;
    max_nights: number | null;
    monthly_rent: number;
    security_deposit: number;
    monthly_charges: number;
    charges_included: boolean;
    advance_rent_months: number;
    check_in_time: string;
    check_out_time: string;
    booking_mode: 'instant' | 'request';
}) {
    if (input.rental_duration === 'long_term') {
        return {
            rentalDuration: 'long_term',
            pricePerNight: 0,
            cleaningFee: 0,
            minNights: 1,
            maxNights: null,
            monthlyRent: Math.round(input.monthly_rent * 100),
            securityDeposit: Math.round(input.security_deposit * 100),
            monthlyCharges: input.charges_included
                ? 0
                : Math.round(input.monthly_charges * 100),
            chargesIncluded: input.charges_included,
            advanceRentMonths: Math.max(1, input.advance_rent_months),
            checkInTime: '15:00',
            checkOutTime: '11:00',
            bookingMode: input.booking_mode,
        };
    }

    return {
        rentalDuration: 'short_term',
        pricePerNight: Math.round(input.price_per_night * 100),
        cleaningFee: Math.round(input.cleaning_fee * 100),
        minNights: input.min_nights,
        maxNights: input.max_nights,
        monthlyRent: 0,
        securityDeposit: 0,
        monthlyCharges: 0,
        chargesIncluded: true,
        advanceRentMonths: 1,
        checkInTime: input.check_in_time,
        checkOutTime: input.check_out_time,
        bookingMode: input.booking_mode,
    };
}

export async function createCustomPropertyTypeAction(
    name: string,
): Promise<ActionResult<{ id: number; name: string; slug: string; created: boolean }>> {
    const user = await getFreshSessionUser();
    if (!user || !user.emailVerifiedAt || !isHostOrAdmin(user)) {
        return { ok: false, error: 'Accès réservé aux hôtes vérifiés.' };
    }

    const parsed = z
        .string()
        .trim()
        .min(2, 'Saisissez un nom de type entre 2 et 80 caractères.')
        .max(80, 'Saisissez un nom de type entre 2 et 80 caractères.')
        .safeParse(name);

    if (!parsed.success) {
        return {
            ok: false,
            fieldErrors: {
                custom_property_type:
                    parsed.error.issues[0]?.message ?? 'Nom invalide.',
            },
        };
    }

    const resolved = await resolveOrCreatePropertyType(parsed.data);
    if (resolved.created) {
        revalidatePath('/admin/types-de-logement');
        revalidatePath('/logements');
    }

    return {
        ok: true,
        data: resolved,
        toast: {
            type: 'success',
            message: resolved.created
                ? `Type « ${resolved.name} » ajouté à la taxonomie.`
                : `Type « ${resolved.name} » sélectionné.`,
        },
    };
}

export async function createPropertyAction(input: {
    rental_duration?: RentalDuration;
    title: string;
    property_type_id: number | string;
    custom_property_type?: string;
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

    const propertyType = await resolvePropertyTypeForSave({
        propertyTypeId: parsed.data.property_type_id,
        customPropertyType: parsed.data.custom_property_type,
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
            rentalDuration: parsed.data.rental_duration,
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

export async function saveWizardPropertyAction(input: {
    mode: 'host' | 'admin';
    draftSlug?: string | null;
    owner?: Record<string, unknown>;
    values: Record<string, unknown>;
}): Promise<
    ActionResult<{
        slug: string;
        property: HostProperty;
        ownerId: number;
    }>
> {
    const user = await getFreshSessionUser();
    if (!user || !user.emailVerifiedAt || !isHostOrAdmin(user)) {
        return { ok: false, error: 'Accès réservé aux hôtes vérifiés.' };
    }

    if (input.mode === 'admin' && user.role !== 'admin') {
        return { ok: false, error: 'Accès administrateur requis.' };
    }

    const parsedOwner =
        input.mode === 'admin'
            ? adminOwnerSchema.safeParse(input.owner ?? {})
            : null;
    if (parsedOwner && !parsedOwner.success) {
        return {
            ok: false,
            fieldErrors: zodToFieldErrors(parsedOwner.error),
        };
    }

    const parsed = fullPropertyDraftSchema.safeParse(input.values);
    if (!parsed.success) {
        return { ok: false, fieldErrors: zodToFieldErrors(parsed.error) };
    }

    const uniqueAmenityIds = [...new Set(parsed.data.amenities)];

    const [propertyType, cityRow, validAmenities] = await Promise.all([
        resolvePropertyTypeForSave({
            propertyTypeId: parsed.data.property_type_id,
            customPropertyType: parsed.data.custom_property_type,
        }),
        prisma.city.findFirst({
            where: { id: parsed.data.city_id, isActive: true },
            select: { id: true },
        }),
        uniqueAmenityIds.length > 0
            ? prisma.amenity.findMany({
                  where: { id: { in: uniqueAmenityIds } },
                  select: { id: true },
              })
            : Promise.resolve([]),
    ]);

    if (!propertyType) {
        return {
            ok: false,
            fieldErrors: { property_type_id: 'Type de logement indisponible.' },
        };
    }

    if (!cityRow) {
        return {
            ok: false,
            fieldErrors: { city_id: 'Cette ville n’est pas disponible.' },
        };
    }

    let passwordHashForNewOwner: string | null = null;
    if (parsedOwner?.success && parsedOwner.data.owner_mode === 'new') {
        const existingEmail = await prisma.user.findUnique({
            where: { email: parsedOwner.data.owner_email },
            select: { id: true },
        });
        if (existingEmail) {
            return {
                ok: false,
                fieldErrors: {
                    owner_email:
                        'Un compte existe déjà avec cet e-mail. Choisissez « Compte existant ».',
                },
            };
        }
        passwordHashForNewOwner = await hashPassword(
            parsedOwner.data.owner_password,
        );
    }

    try {
        const saved = await prisma.$transaction(async (tx) => {
            let resolvedOwnerId = user.id;

            if (parsedOwner?.success) {
                if (parsedOwner.data.owner_mode === 'existing') {
                    const targetOwner = await tx.user.findUnique({
                        where: { id: parsedOwner.data.owner_id! },
                        select: { id: true, role: true, suspendedAt: true },
                    });
                    if (!targetOwner || targetOwner.suspendedAt) {
                        throw new DomainError(
                            'Le compte propriétaire sélectionné est introuvable ou suspendu.',
                            422,
                        );
                    }
                    if (targetOwner.role === 'client') {
                        await tx.user.update({
                            where: { id: targetOwner.id },
                            data: { role: 'host' },
                        });
                    }
                    resolvedOwnerId = targetOwner.id;
                } else {
                    const createdOwner = await tx.user.create({
                        data: {
                            name: parsedOwner.data.owner_name,
                            email: parsedOwner.data.owner_email,
                            password: passwordHashForNewOwner!,
                            role: 'host',
                            emailVerifiedAt: new Date(),
                        },
                        select: { id: true },
                    });
                    resolvedOwnerId = createdOwner.id;
                }
            }

            const propertyFields = {
                cityId: cityRow.id,
                title: parsed.data.title,
                propertyTypeId: propertyType.id,
                description: parsed.data.description,
                address: parsed.data.address,
                postalCode: parsed.data.postal_code?.trim() || null,
                latitude: parsed.data.latitude,
                longitude: parsed.data.longitude,
                maxGuests: parsed.data.max_guests,
                bedrooms: parsed.data.bedrooms,
                beds: parsed.data.beds,
                bathrooms: parsed.data.bathrooms,
                ...mapPricingToDbFields(parsed.data),
            };

            let targetProperty: { id: number; slug: string };

            if (input.draftSlug) {
                const existingProperty = await tx.property.findUnique({
                    where: { slug: input.draftSlug },
                    select: { id: true, slug: true, userId: true, status: true },
                });
                if (!existingProperty) {
                    throw new DomainError('Brouillon introuvable.', 404);
                }
                if (
                    existingProperty.userId !== user.id &&
                    user.role !== 'admin'
                ) {
                    throw new DomainError(
                        'Vous n’êtes pas autorisé à modifier ce logement.',
                        403,
                    );
                }
                if (
                    !isPropertyEditable(
                        existingProperty.status as PropertyStatus,
                    ) &&
                    user.role !== 'admin'
                ) {
                    throw new DomainError(
                        'Ce logement ne peut plus être modifié via cet assistant.',
                        422,
                    );
                }

                targetProperty = await tx.property.update({
                    where: { id: existingProperty.id },
                    data: {
                        ...propertyFields,
                        ...(input.mode === 'admin'
                            ? { userId: resolvedOwnerId }
                            : {}),
                    },
                    select: { id: true, slug: true },
                });

                await tx.amenityProperty.deleteMany({
                    where: { propertyId: targetProperty.id },
                });
            } else {
                targetProperty = await tx.property.create({
                    data: {
                        userId: resolvedOwnerId,
                        slug: generatePropertySlug(parsed.data.title),
                        status: 'draft',
                        ...propertyFields,
                    },
                    select: { id: true, slug: true },
                });
            }

            if (validAmenities.length > 0) {
                await tx.amenityProperty.createMany({
                    data: validAmenities.map((amenity) => ({
                        propertyId: targetProperty.id,
                        amenityId: amenity.id,
                    })),
                });
            }

            return { slug: targetProperty.slug, ownerId: resolvedOwnerId };
        });

        const property = await getHostPropertyForEdit(saved.slug);
        if (!property) {
            return {
                ok: false,
                error: 'Impossible de charger le logement enregistré.',
            };
        }

        revalidatePropertyPaths(saved.slug);
        if (parsedOwner?.success && parsedOwner.data.owner_mode === 'new') {
            revalidatePath('/admin/utilisateurs');
        }

        return {
            ok: true,
            data: {
                slug: saved.slug,
                property,
                ownerId: saved.ownerId,
            },
        };
    } catch (error) {
        if (error instanceof DomainError) {
            return { ok: false, error: error.message };
        }
        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2002'
        ) {
            return {
                ok: false,
                fieldErrors: {
                    owner_email:
                        'Un compte existe déjà avec cet e-mail. Choisissez « Compte existant ».',
                },
            };
        }
        throw error;
    }
}

export async function finalizeWizardPropertyAction(input: {
    slug: string;
    targetStatus: 'draft' | 'pending' | 'published';
    isAdminContext?: boolean;
}): Promise<ActionResult> {
    const auth = await requireEditableHostProperty(input.slug);
    if ('error' in auth) {
        return { ok: false, error: auth.error };
    }
    const { user, property } = auth;
    const redirectTo = input.isAdminContext ? '/admin/logements' : '/hote';

    if (input.targetStatus === 'draft') {
        revalidatePropertyPaths(property.slug);
        return {
            ok: true,
            redirectTo,
            toast: {
                type: 'success',
                message: 'Logement enregistré en brouillon.',
            },
        };
    }

    const processedCount = property.images.filter(
        (img) => img.processedAt !== null,
    ).length;

    if (input.targetStatus === 'pending') {
        const missing = missingPropertyRequirements({
            cityId: property.cityId,
            address: property.address,
            rentalDuration: property.rentalDuration,
            pricePerNight: property.pricePerNight,
            monthlyRent: property.monthlyRent,
            processedImagesCount: isCloudinaryConfigured()
                ? processedCount
                : Math.max(processedCount, 3),
        });
        const firstMissingKey = Object.keys(missing)[0];
        if (firstMissingKey) {
            return { ok: false, error: missing[firstMissingKey] };
        }

        await prisma.property.update({
            where: { id: property.id },
            data: {
                status: 'pending',
                submittedAt: property.submittedAt ?? new Date(),
                rejectionReason: null,
            },
        });

        revalidatePropertyPaths(property.slug);
        return {
            ok: true,
            redirectTo,
            toast: {
                type: 'success',
                message: 'Logement enregistré et envoyé en validation.',
            },
        };
    }

    if (user.role !== 'admin') {
        return {
            ok: false,
            error: 'Seul un administrateur peut publier un logement directement.',
        };
    }

    const missingForPublish = missingPropertyRequirements({
        cityId: property.cityId,
        address: property.address,
        rentalDuration: property.rentalDuration,
        pricePerNight: property.pricePerNight,
        monthlyRent: property.monthlyRent,
        processedImagesCount: isCloudinaryConfigured()
            ? processedCount
            : Math.max(processedCount, 3),
    });
    const firstMissingKey = Object.keys(missingForPublish)[0];
    if (firstMissingKey) {
        return { ok: false, error: missingForPublish[firstMissingKey] };
    }

    await prisma.property.update({
        where: { id: property.id },
        data: {
            status: 'published',
            submittedAt: property.submittedAt ?? new Date(),
            publishedAt: property.publishedAt ?? new Date(),
            rejectionReason: null,
        },
    });

    if (property.userId !== user.id) {
        await notifyPropertyPublished(property.id);
    }

    revalidatePropertyPaths(property.slug);
    return {
        ok: true,
        redirectTo,
        toast: {
            type: 'success',
            message:
                processedCount === 0 && !isCloudinaryConfigured()
                    ? 'Logement créé et publié (ajoutez des photos dès que Cloudinary sera configuré).'
                    : 'Logement créé et publié dans le catalogue.',
        },
    };
}

export async function reassignPropertyOwnerAction(input: {
    slug: string;
    ownerId: number;
}): Promise<ActionResult> {
    const user = await getFreshSessionUser();
    if (!user || !user.emailVerifiedAt || user.role !== 'admin') {
        return { ok: false, error: 'Accès administrateur requis.' };
    }

    const [property, targetOwner] = await Promise.all([
        prisma.property.findUnique({
            where: { slug: input.slug },
            select: { id: true, slug: true, userId: true },
        }),
        prisma.user.findUnique({
            where: { id: input.ownerId },
            select: { id: true, name: true, role: true, suspendedAt: true },
        }),
    ]);

    if (!property) {
        return { ok: false, error: 'Logement introuvable.' };
    }

    if (!targetOwner || targetOwner.suspendedAt) {
        return {
            ok: false,
            error: 'Compte propriétaire introuvable ou suspendu.',
        };
    }

    await prisma.$transaction(async (tx) => {
        if (targetOwner.role === 'client') {
            await tx.user.update({
                where: { id: targetOwner.id },
                data: { role: 'host' },
            });
        }
        await tx.property.update({
            where: { id: property.id },
            data: { userId: targetOwner.id },
        });
    });

    revalidatePropertyPaths(property.slug);
    revalidatePath('/admin/utilisateurs');

    return {
        ok: true,
        toast: {
            type: 'success',
            message: `Logement attribué à ${targetOwner.name}.`,
        },
    };
}

export async function updatePropertyStepAction(input: {
    slug: string;
    step: PropertyFormStep;
    values: Record<string, unknown>;
    isAdminContext?: boolean;
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
        const typeRow = await resolvePropertyTypeForSave({
            propertyTypeId: parsed.data.property_type_id,
            customPropertyType: parsed.data.custom_property_type,
            existingPropertyTypeId: property.propertyTypeId,
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
                rentalDuration: parsed.data.rental_duration,
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
                latitude: parsed.data.latitude,
                longitude: parsed.data.longitude,
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
        const parsed = pricingSchema.safeParse({
            ...input.values,
            rental_duration:
                input.values.rental_duration ?? property.rentalDuration,
        });
        if (!parsed.success) {
            return { ok: false, fieldErrors: zodToFieldErrors(parsed.error) };
        }
        await prisma.property.update({
            where: { id: property.id },
            data: mapPricingToDbFields(parsed.data),
        });
    }

    const nextStep = nextPropertyFormStep(input.step) ?? input.step;
    revalidatePropertyPaths(property.slug);

    const modifierBase = input.isAdminContext
        ? `/admin/logements/${property.slug}/modifier`
        : `/hote/logements/${property.slug}/modifier`;

    return {
        ok: true,
        redirectTo: `${modifierBase}/${nextStep}`,
        toast: { type: 'success', message: 'Modifications enregistrées.' },
    };
}

export async function deletePropertyAction(
    slug: string,
    options?: { isAdminContext?: boolean },
): Promise<ActionResult> {
    const auth = await requireEditableHostProperty(slug);
    if ('error' in auth) {
        return { ok: false, error: auth.error };
    }
    const { user, property } = auth;

    await Promise.all(
        property.images.map((img) => deletePropertyImageFiles(img)),
    );

    if (user.role === 'admin') {
        await prisma.$transaction(async (tx) => {
            await tx.bookingMessage.deleteMany({
                where: { booking: { propertyId: property.id } },
            });
            await tx.review.deleteMany({
                where: { booking: { propertyId: property.id } },
            });
            await tx.booking.deleteMany({
                where: { propertyId: property.id },
            });
            await tx.favorite.deleteMany({
                where: { propertyId: property.id },
            });
            await tx.blockedPeriod.deleteMany({
                where: { propertyId: property.id },
            });
            await tx.amenityProperty.deleteMany({
                where: { propertyId: property.id },
            });
            await tx.propertyImage.deleteMany({
                where: { propertyId: property.id },
            });
            await tx.property.delete({ where: { id: property.id } });
        });
    } else {
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

        await prisma.property.delete({ where: { id: property.id } });
    }

    revalidatePath('/hote');
    revalidatePath('/admin');
    revalidatePath('/admin/logements');
    return {
        ok: true,
        redirectTo: options?.isAdminContext ? '/admin/logements' : '/hote',
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
            rentalDuration: property.rentalDuration,
            pricePerNight: property.pricePerNight,
            monthlyRent: property.monthlyRent,
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

async function loadSerializedPropertyImages(
    propertyId: number,
): Promise<HostProperty['images']> {
    const freshImages = await prisma.propertyImage.findMany({
        where: { propertyId },
        orderBy: { position: 'asc' },
        select: {
            id: true,
            thumbnailPath: true,
            path: true,
            cloudinaryPublicId: true,
            processedAt: true,
        },
    });
    return serializePropertyImages(freshImages);
}

export async function confirmPropertyPhotoAction(input: {
    slug: string;
    cloudinary_public_id: string;
    version: number;
    signature: string;
    setAsCover?: boolean;
}): Promise<ActionResult<{ images: HostProperty['images'] }>> {
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

    if (input.setAsCover) {
        await prisma.$transaction([
            prisma.propertyImage.updateMany({
                where: { propertyId: property.id },
                data: { position: { increment: 1 } },
            }),
            prisma.propertyImage.create({
                data: {
                    propertyId: property.id,
                    path: url,
                    thumbnailPath: thumbnail_url,
                    cloudinaryPublicId: input.cloudinary_public_id,
                    processedAt: new Date(),
                    position: 0,
                },
            }),
        ]);
    } else {
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
    }

    const images = await loadSerializedPropertyImages(property.id);
    revalidatePropertyPaths(property.slug);
    return { ok: true, data: { images } };
}

export async function reorderPropertyPhotosAction(input: {
    slug: string;
    order: number[];
}): Promise<ActionResult<{ images: HostProperty['images'] }>> {
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

    const images = await loadSerializedPropertyImages(auth.property.id);
    revalidatePropertyPaths(auth.property.slug);
    return {
        ok: true,
        data: { images },
        toast: { type: 'success', message: 'Ordre des photos enregistré.' },
    };
}

export async function deletePropertyPhotoAction(input: {
    slug: string;
    imageId: number;
}): Promise<ActionResult<{ images: HostProperty['images'] }>> {
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

    const images = await loadSerializedPropertyImages(auth.property.id);
    revalidatePropertyPaths(auth.property.slug);
    return {
        ok: true,
        data: { images },
        toast: { type: 'info', message: 'Photo supprimée.' },
    };
}

