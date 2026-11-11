import crypto from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { slugify } from '@/lib/utils';

export type ResolvedPropertyType = {
    id: number;
    name: string;
    slug: string;
    created: boolean;
};

/**
 * Génère un slug unique pour un type de logement en évitant les collisions en base.
 */
export async function buildUniquePropertyTypeSlug(
    name: string,
    excludeId?: number,
): Promise<string> {
    const baseSlug = slugify(name) || 'type';
    const existing = await prisma.propertyType.findFirst({
        where: {
            slug: baseSlug,
            ...(excludeId ? { id: { not: excludeId } } : {}),
        },
        select: { id: true },
    });

    if (!existing) {
        return baseSlug;
    }

    return `${baseSlug}-${crypto.randomBytes(2).toString('hex')}`;
}

/**
 * Résout un type de bien existant (insensible à la casse/au slug) ou crée une
 * nouvelle entrée active dans la taxonomie `property_types`.
 */
export async function resolveOrCreatePropertyType(
    nameInput: string,
): Promise<ResolvedPropertyType> {
    const cleanName = nameInput.trim().replace(/\s+/g, ' ');
    const baseSlug = slugify(cleanName) || 'type';

    const existing = await prisma.propertyType.findFirst({
        where: {
            OR: [
                { name: { equals: cleanName, mode: 'insensitive' } },
                { slug: baseSlug },
            ],
        },
        select: { id: true, name: true, slug: true, isActive: true },
    });

    if (existing) {
        if (!existing.isActive) {
            const reactivated = await prisma.propertyType.update({
                where: { id: existing.id },
                data: { isActive: true },
                select: { id: true, name: true, slug: true },
            });
            return { ...reactivated, created: false };
        }
        return {
            id: existing.id,
            name: existing.name,
            slug: existing.slug,
            created: false,
        };
    }

    const [slug, maxOrder] = await Promise.all([
        buildUniquePropertyTypeSlug(cleanName),
        prisma.propertyType.aggregate({ _max: { sortOrder: true } }),
    ]);

    const created = await prisma.propertyType.create({
        data: {
            name: cleanName,
            slug,
            isActive: true,
            sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
        },
        select: { id: true, name: true, slug: true },
    });

    return { ...created, created: true };
}

