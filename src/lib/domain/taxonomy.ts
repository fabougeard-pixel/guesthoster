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

export type ResolvedCountry = {
    id: number;
    name: string;
    code: string;
    flagEmoji: string | null;
    created: boolean;
};

const COMMON_COUNTRY_CODES: Record<string, { code: string; flag: string }> = {
    france: { code: 'FR', flag: '🇫🇷' },
    senegal: { code: 'SN', flag: '🇸🇳' },
    cotedivoire: { code: 'CI', flag: '🇨🇮' },
    'cote d\'ivoire': { code: 'CI', flag: '🇨🇮' },
    belgique: { code: 'BE', flag: '🇧🇪' },
    suisse: { code: 'CH', flag: '🇨🇭' },
    canada: { code: 'CA', flag: '🇨🇦' },
    maroc: { code: 'MA', flag: '🇲🇦' },
    algerie: { code: 'DZ', flag: '🇩🇿' },
    tunisie: { code: 'TN', flag: '🇹🇳' },
    cameroun: { code: 'CM', flag: '🇨🇲' },
    benin: { code: 'BJ', flag: '🇧🇯' },
    togo: { code: 'TG', flag: '🇹🇬' },
    mali: { code: 'ML', flag: '🇲🇱' },
    guinee: { code: 'GN', flag: '🇬🇳' },
    gabon: { code: 'GA', flag: '🇬🇦' },
    congo: { code: 'CG', flag: '🇨🇬' },
    madagascar: { code: 'MG', flag: '🇲🇬' },
    espagne: { code: 'ES', flag: '🇪🇸' },
    italie: { code: 'IT', flag: '🇮🇹' },
    portugal: { code: 'PT', flag: '🇵🇹' },
    allemagne: { code: 'DE', flag: '🇩🇪' },
    royaumeuni: { code: 'GB', flag: '🇬🇧' },
    'royaume-uni': { code: 'GB', flag: '🇬🇧' },
    etatsunis: { code: 'US', flag: '🇺🇸' },
    'états-unis': { code: 'US', flag: '🇺🇸' },
    usa: { code: 'US', flag: '🇺🇸' },
    luxembourg: { code: 'LU', flag: '🇱🇺' },
    monaco: { code: 'MC', flag: '🇲🇨' },
    dubai: { code: 'AE', flag: '🇦🇪' },
    emiratsarabesunis: { code: 'AE', flag: '🇦🇪' },
    'émirats arabes unis': { code: 'AE', flag: '🇦🇪' },
};

function normalizeText(text: string): string {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
}

/**
 * Résout un pays existant ou en crée un nouveau avec un code ISO 2 lettres et un emoji drapeau.
 */
export async function resolveOrCreateCountry(
    nameInput: string,
    codeInput?: string,
): Promise<ResolvedCountry> {
    const cleanName = nameInput.trim().replace(/\s+/g, ' ');
    const norm = normalizeText(cleanName);

    // Chercher par nom insensible à la casse ou par code si fourni
    const existing = await prisma.country.findFirst({
        where: {
            OR: [
                { name: { equals: cleanName, mode: 'insensitive' } },
                ...(codeInput ? [{ code: codeInput.trim().toUpperCase() }] : []),
            ],
        },
        select: { id: true, name: true, code: true, flagEmoji: true, isActive: true },
    });

    if (existing) {
        if (!existing.isActive) {
            await prisma.country.update({
                where: { id: existing.id },
                data: { isActive: true },
            });
        }
        return {
            id: existing.id,
            name: existing.name,
            code: existing.code,
            flagEmoji: existing.flagEmoji,
            created: false,
        };
    }

    let code = codeInput ? codeInput.trim().toUpperCase().slice(0, 2) : '';
    let flagEmoji: string | null = null;

    if (!code || code.length < 2) {
        const match = COMMON_COUNTRY_CODES[norm] ?? COMMON_COUNTRY_CODES[norm.replace(/[^a-z]/g, '')];
        if (match) {
            code = match.code;
            flagEmoji = match.flag;
        }
    }

    if (!code || code.length < 2) {
        const letters = norm.replace(/[^a-z]/g, '').toUpperCase();
        code = (letters.length >= 2 ? letters.slice(0, 2) : (letters + 'XX')).slice(0, 2);
    }

    // Vérifier l'unicité du code dans la base
    let finalCode = code;
    const collision = await prisma.country.findUnique({ where: { code: finalCode } });
    if (collision) {
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let found = false;
        for (let i = 0; i < alphabet.length; i++) {
            const candidate = (code[0] + alphabet[i]).toUpperCase();
            const exists = await prisma.country.findUnique({ where: { code: candidate } });
            if (!exists) {
                finalCode = candidate;
                found = true;
                break;
            }
        }
        if (!found) {
            finalCode = 'X' + Math.floor(Math.random() * 10);
        }
    }

    if (!flagEmoji && /^[A-Z]{2}$/.test(finalCode)) {
        try {
            flagEmoji = String.fromCodePoint(
                0x1F1E6 + finalCode.charCodeAt(0) - 65,
                0x1F1E6 + finalCode.charCodeAt(1) - 65,
            );
        } catch {
            flagEmoji = null;
        }
    }

    const created = await prisma.country.create({
        data: {
            name: cleanName,
            code: finalCode,
            flagEmoji,
            isActive: true,
            sortOrder: 0,
        },
        select: { id: true, name: true, code: true, flagEmoji: true },
    });

    return {
        id: created.id,
        name: created.name,
        code: created.code,
        flagEmoji: created.flagEmoji,
        created: true,
    };
}

export type ResolvedCity = {
    id: number;
    countryId: number;
    name: string;
    slug: string;
    latitude: number | null;
    longitude: number | null;
    created: boolean;
};

/**
 * Résout une ville existante pour un pays donné ou en crée une nouvelle active.
 */
export async function resolveOrCreateCity(input: {
    countryId: number;
    name: string;
    latitude?: number | null;
    longitude?: number | null;
}): Promise<ResolvedCity> {
    const cleanName = input.name.trim().replace(/\s+/g, ' ');
    const baseSlug = slugify(cleanName) || 'ville';

    const existing = await prisma.city.findFirst({
        where: {
            countryId: input.countryId,
            OR: [
                { name: { equals: cleanName, mode: 'insensitive' } },
                { slug: baseSlug },
            ],
        },
        select: {
            id: true,
            countryId: true,
            name: true,
            slug: true,
            latitude: true,
            longitude: true,
            isActive: true,
        },
    });

    if (existing) {
        if (!existing.isActive) {
            await prisma.city.update({
                where: { id: existing.id },
                data: { isActive: true },
            });
        }
        return {
            id: existing.id,
            countryId: existing.countryId,
            name: existing.name,
            slug: existing.slug,
            latitude: existing.latitude ? Number(existing.latitude) : null,
            longitude: existing.longitude ? Number(existing.longitude) : null,
            created: false,
        };
    }

    // Vérifier collision slug dans ce pays
    let slug = baseSlug;
    const slugCollision = await prisma.city.findFirst({
        where: { countryId: input.countryId, slug },
        select: { id: true },
    });
    if (slugCollision) {
        slug = `${slug}-${crypto.randomBytes(2).toString('hex')}`;
    }

    const created = await prisma.city.create({
        data: {
            countryId: input.countryId,
            name: cleanName,
            slug,
            latitude:
                input.latitude !== undefined && input.latitude !== null
                    ? input.latitude
                    : null,
            longitude:
                input.longitude !== undefined && input.longitude !== null
                    ? input.longitude
                    : null,
            isActive: true,
            isPopular: false,
            sortOrder: 0,
        },
        select: {
            id: true,
            countryId: true,
            name: true,
            slug: true,
            latitude: true,
            longitude: true,
        },
    });

    return {
        id: created.id,
        countryId: created.countryId,
        name: created.name,
        slug: created.slug,
        latitude: created.latitude ? Number(created.latitude) : null,
        longitude: created.longitude ? Number(created.longitude) : null,
        created: true,
    };
}

