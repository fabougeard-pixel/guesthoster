'use server';

import crypto from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getFreshSessionUser, isAdmin } from '@/lib/auth/session';
import {
    AMENITY_CATEGORIES,
    canPropertyTransitionTo,
    type PropertyStatus,
    USER_ROLES,
} from '@/lib/domain/enums';
import {
    notifyPropertyPublished,
    notifyPropertyRejected,
} from '@/lib/notifications/service';
import { prisma } from '@/lib/prisma';
import { slugify } from '@/lib/utils';
import { type ActionResult, zodToFieldErrors } from './types';

async function requireAdminActor() {
    const user = await getFreshSessionUser();
    if (!user || !user.emailVerifiedAt || !isAdmin(user)) {
        return null;
    }
    return user;
}

export async function publishPropertyAction(
    slug: string,
): Promise<ActionResult> {
    const admin = await requireAdminActor();
    if (!admin) {
        return { ok: false, error: 'Accès administrateur requis.' };
    }

    const property = await prisma.property.findUnique({ where: { slug } });
    if (!property) {
        return { ok: false, error: 'Logement introuvable.' };
    }

    const currentStatus = property.status as PropertyStatus;
    if (!canPropertyTransitionTo(currentStatus, 'published')) {
        return {
            ok: false,
            error: 'Ce logement ne peut pas être publié dans son état actuel.',
        };
    }

    await prisma.property.update({
        where: { id: property.id },
        data: {
            status: 'published',
            publishedAt: property.publishedAt ?? new Date(),
            rejectionReason: null,
        },
    });

    await notifyPropertyPublished(property.id);

    revalidatePath('/admin/logements');
    revalidatePath(`/logements/${property.slug}`);
    return {
        ok: true,
        toast: { type: 'success', message: 'Logement publié et visible.' },
    };
}

export async function rejectPropertyAction(input: {
    slug: string;
    reason: string;
}): Promise<ActionResult> {
    const admin = await requireAdminActor();
    if (!admin) {
        return { ok: false, error: 'Accès administrateur requis.' };
    }

    const reasonSchema = z.object({
        reason: z
            .string()
            .trim()
            .min(10, 'Précisez le motif en au moins 10 caractères.')
            .max(1000, 'Le motif ne doit pas dépasser 1000 caractères.'),
    });
    const parsed = reasonSchema.safeParse(input);
    if (!parsed.success) {
        return { ok: false, fieldErrors: zodToFieldErrors(parsed.error) };
    }

    const property = await prisma.property.findUnique({
        where: { slug: input.slug },
    });
    if (!property) {
        return { ok: false, error: 'Logement introuvable.' };
    }

    const currentStatus = property.status as PropertyStatus;
    if (!canPropertyTransitionTo(currentStatus, 'rejected')) {
        return {
            ok: false,
            error: 'Ce logement ne peut pas être refusé dans son état actuel.',
        };
    }

    const wasPublished = currentStatus === 'published';
    await prisma.property.update({
        where: { id: property.id },
        data: {
            status: 'rejected',
            rejectionReason: parsed.data.reason,
        },
    });

    await notifyPropertyRejected(property.id, wasPublished);

    revalidatePath('/admin/logements');
    revalidatePath(`/logements/${property.slug}`);
    return {
        ok: true,
        toast: {
            type: 'info',
            message: wasPublished
                ? 'Logement retiré du catalogue.'
                : 'Logement refusé et hôte notifié.',
        },
    };
}

export async function updateUserRoleAction(input: {
    userId: number;
    role: string;
}): Promise<ActionResult> {
    const admin = await requireAdminActor();
    if (!admin) {
        return { ok: false, error: 'Accès administrateur requis.' };
    }

    if (!USER_ROLES.includes(input.role as (typeof USER_ROLES)[number])) {
        return { ok: false, error: 'Rôle invalide.' };
    }

    const target = await prisma.user.findUnique({ where: { id: input.userId } });
    if (!target) {
        return { ok: false, error: 'Utilisateur introuvable.' };
    }

    await prisma.user.update({
        where: { id: target.id },
        data: { role: input.role },
    });

    revalidatePath('/admin/utilisateurs');
    return {
        ok: true,
        toast: {
            type: 'success',
            message: `Rôle de ${target.name} mis à jour.`,
        },
    };
}

export async function suspendUserAction(userId: number): Promise<ActionResult> {
    const admin = await requireAdminActor();
    if (!admin) {
        return { ok: false, error: 'Accès administrateur requis.' };
    }

    if (userId === admin.id) {
        return {
            ok: false,
            error: 'Vous ne pouvez pas suspendre votre propre compte.',
        };
    }

    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target) {
        return { ok: false, error: 'Utilisateur introuvable.' };
    }

    await prisma.user.update({
        where: { id: target.id },
        data: { suspendedAt: new Date() },
    });

    revalidatePath('/admin/utilisateurs');
    return {
        ok: true,
        toast: {
            type: 'info',
            message: `Le compte de ${target.name} est suspendu.`,
        },
    };
}

export async function reinstateUserAction(userId: number): Promise<ActionResult> {
    const admin = await requireAdminActor();
    if (!admin) {
        return { ok: false, error: 'Accès administrateur requis.' };
    }

    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target) {
        return { ok: false, error: 'Utilisateur introuvable.' };
    }

    await prisma.user.update({
        where: { id: target.id },
        data: { suspendedAt: null },
    });

    revalidatePath('/admin/utilisateurs');
    return {
        ok: true,
        toast: {
            type: 'success',
            message: `Le compte de ${target.name} est réactivé.`,
        },
    };
}

const countrySchema = z.object({
    name: z.string().trim().min(2, 'Nom requis.').max(120),
    code: z
        .string()
        .trim()
        .length(2, 'Code ISO à 2 lettres.')
        .transform((v) => v.toUpperCase()),
    flag_emoji: z.string().trim().max(16).optional().nullable(),
    is_active: z.boolean().default(true),
    sort_order: z.coerce.number().int().min(0).max(9999).default(0),
});

export async function saveCountryAction(input: {
    id?: number;
    values: Record<string, unknown>;
}): Promise<ActionResult> {
    const admin = await requireAdminActor();
    if (!admin) {
        return { ok: false, error: 'Accès administrateur requis.' };
    }

    const parsed = countrySchema.safeParse(input.values);
    if (!parsed.success) {
        return { ok: false, fieldErrors: zodToFieldErrors(parsed.error) };
    }

    const collision = await prisma.country.findFirst({
        where: {
            code: parsed.data.code,
            ...(input.id ? { id: { not: input.id } } : {}),
        },
        select: { id: true },
    });

    if (collision) {
        return {
            ok: false,
            fieldErrors: { code: 'Ce code pays existe déjà.' },
        };
    }

    const data = {
        name: parsed.data.name,
        code: parsed.data.code,
        flagEmoji: parsed.data.flag_emoji || null,
        isActive: parsed.data.is_active,
        sortOrder: parsed.data.sort_order,
    };

    if (input.id) {
        await prisma.country.update({ where: { id: input.id }, data });
    } else {
        await prisma.country.create({ data });
    }

    revalidatePath('/admin/pays');
    return {
        ok: true,
        toast: {
            type: 'success',
            message: input.id ? 'Pays mis à jour.' : 'Pays ajouté.',
        },
    };
}

export async function deleteCountryAction(id: number): Promise<ActionResult> {
    const admin = await requireAdminActor();
    if (!admin) {
        return { ok: false, error: 'Accès administrateur requis.' };
    }

    const hasCities = await prisma.city.findFirst({
        where: { countryId: id },
        select: { id: true },
    });
    if (hasCities) {
        return {
            ok: false,
            error: 'Ce pays a des villes : désactivez-le plutôt.',
        };
    }

    await prisma.country.delete({ where: { id } });
    revalidatePath('/admin/pays');
    return { ok: true, toast: { type: 'success', message: 'Pays supprimé.' } };
}

const citySchema = z.object({
    country_id: z.coerce.number().int().positive('Choisissez un pays.'),
    name: z.string().trim().min(2, 'Nom requis.').max(120),
    latitude: z.preprocess(
        (v) => (v === '' || v === null || v === undefined ? null : Number(v)),
        z.number().min(-90).max(90).nullable(),
    ),
    longitude: z.preprocess(
        (v) => (v === '' || v === null || v === undefined ? null : Number(v)),
        z.number().min(-180).max(180).nullable(),
    ),
    is_popular: z.boolean().default(false),
    is_active: z.boolean().default(true),
    sort_order: z.coerce.number().int().min(0).max(9999).default(0),
});

export async function saveCityAction(input: {
    id?: number;
    values: Record<string, unknown>;
}): Promise<ActionResult> {
    const admin = await requireAdminActor();
    if (!admin) {
        return { ok: false, error: 'Accès administrateur requis.' };
    }

    const parsed = citySchema.safeParse(input.values);
    if (!parsed.success) {
        return { ok: false, fieldErrors: zodToFieldErrors(parsed.error) };
    }

    let slug = slugify(parsed.data.name) || 'ville';
    const collision = await prisma.city.findFirst({
        where: {
            countryId: parsed.data.country_id,
            slug,
            ...(input.id ? { id: { not: input.id } } : {}),
        },
        select: { id: true },
    });

    if (collision) {
        slug = `${slug}-${crypto.randomBytes(2).toString('hex')}`;
    }

    const data = {
        countryId: parsed.data.country_id,
        name: parsed.data.name,
        slug,
        latitude: parsed.data.latitude,
        longitude: parsed.data.longitude,
        isPopular: parsed.data.is_popular,
        isActive: parsed.data.is_active,
        sortOrder: parsed.data.sort_order,
    };

    if (input.id) {
        await prisma.city.update({ where: { id: input.id }, data });
    } else {
        await prisma.city.create({ data });
    }

    revalidatePath('/admin/villes');
    return {
        ok: true,
        toast: {
            type: 'success',
            message: input.id ? 'Ville mise à jour.' : 'Ville ajoutée.',
        },
    };
}

export async function deleteCityAction(id: number): Promise<ActionResult> {
    const admin = await requireAdminActor();
    if (!admin) {
        return { ok: false, error: 'Accès administrateur requis.' };
    }

    const hasProperties = await prisma.property.findFirst({
        where: { cityId: id },
        select: { id: true },
    });
    if (hasProperties) {
        return {
            ok: false,
            error:
                'Des logements sont situés dans cette ville : désactivez-la plutôt.',
        };
    }

    await prisma.city.delete({ where: { id } });
    revalidatePath('/admin/villes');
    return { ok: true, toast: { type: 'success', message: 'Ville supprimée.' } };
}

const amenitySchema = z.object({
    name: z.string().trim().min(2, 'Nom requis.').max(120),
    category: z.enum(AMENITY_CATEGORIES),
    icon: z.string().trim().max(60).optional().nullable(),
    sort_order: z.coerce.number().int().min(0).max(9999).default(0),
});

export async function saveAmenityAction(input: {
    id?: number;
    values: Record<string, unknown>;
}): Promise<ActionResult> {
    const admin = await requireAdminActor();
    if (!admin) {
        return { ok: false, error: 'Accès administrateur requis.' };
    }

    const parsed = amenitySchema.safeParse(input.values);
    if (!parsed.success) {
        return { ok: false, fieldErrors: zodToFieldErrors(parsed.error) };
    }

    const data = {
        name: parsed.data.name,
        category: parsed.data.category,
        icon: parsed.data.icon || null,
        sortOrder: parsed.data.sort_order,
    };

    if (input.id) {
        await prisma.amenity.update({ where: { id: input.id }, data });
    } else {
        let slug = slugify(parsed.data.name) || 'equipement';
        const collision = await prisma.amenity.findUnique({
            where: { slug },
            select: { id: true },
        });
        if (collision) {
            slug = `${slug}-${crypto.randomBytes(2).toString('hex')}`;
        }
        await prisma.amenity.create({ data: { ...data, slug } });
    }

    revalidatePath('/admin/equipements');
    return {
        ok: true,
        toast: {
            type: 'success',
            message: input.id ? 'Équipement mis à jour.' : 'Équipement ajouté.',
        },
    };
}

export async function deleteAmenityAction(id: number): Promise<ActionResult> {
    const admin = await requireAdminActor();
    if (!admin) {
        return { ok: false, error: 'Accès administrateur requis.' };
    }

    const used = await prisma.amenityProperty.findFirst({
        where: { amenityId: id },
        select: { propertyId: true },
    });
    if (used) {
        return {
            ok: false,
            error: 'Cet équipement est utilisé par des logements.',
        };
    }

    await prisma.amenity.delete({ where: { id } });
    revalidatePath('/admin/equipements');
    return {
        ok: true,
        toast: { type: 'success', message: 'Équipement supprimé.' },
    };
}

const propertyTypeSchema = z.object({
    name: z.string().trim().min(2, 'Nom requis.').max(120),
    is_active: z.boolean().default(true),
    sort_order: z.coerce.number().int().min(0).max(9999).default(0),
});

export async function savePropertyTypeAction(input: {
    id?: number;
    values: Record<string, unknown>;
}): Promise<ActionResult> {
    const admin = await requireAdminActor();
    if (!admin) {
        return { ok: false, error: 'Accès administrateur requis.' };
    }

    const parsed = propertyTypeSchema.safeParse(input.values);
    if (!parsed.success) {
        return { ok: false, fieldErrors: zodToFieldErrors(parsed.error) };
    }

    const nameCollision = await prisma.propertyType.findFirst({
        where: {
            name: parsed.data.name,
            ...(input.id ? { id: { not: input.id } } : {}),
        },
        select: { id: true },
    });
    if (nameCollision) {
        return {
            ok: false,
            fieldErrors: { name: 'Ce type existe déjà.' },
        };
    }

    const data = {
        name: parsed.data.name,
        isActive: parsed.data.is_active,
        sortOrder: parsed.data.sort_order,
    };

    if (input.id) {
        await prisma.propertyType.update({ where: { id: input.id }, data });
    } else {
        let slug = slugify(parsed.data.name) || 'type';
        const slugCollision = await prisma.propertyType.findUnique({
            where: { slug },
            select: { id: true },
        });
        if (slugCollision) {
            slug = `${slug}-${crypto.randomBytes(2).toString('hex')}`;
        }
        await prisma.propertyType.create({ data: { ...data, slug } });
    }

    revalidatePath('/admin/types-de-logement');
    return {
        ok: true,
        toast: {
            type: 'success',
            message: input.id
                ? 'Type de logement mis à jour.'
                : 'Type de logement ajouté.',
        },
    };
}

export async function deletePropertyTypeAction(
    id: number,
): Promise<ActionResult> {
    const admin = await requireAdminActor();
    if (!admin) {
        return { ok: false, error: 'Accès administrateur requis.' };
    }

    const used = await prisma.property.findFirst({
        where: { propertyTypeId: id },
        select: { id: true },
    });
    if (used) {
        return {
            ok: false,
            error:
                'Ce type est utilisé par des logements : désactivez-le plutôt.',
        };
    }

    await prisma.propertyType.delete({ where: { id } });
    revalidatePath('/admin/types-de-logement');
    return {
        ok: true,
        toast: { type: 'success', message: 'Type de logement supprimé.' },
    };
}

