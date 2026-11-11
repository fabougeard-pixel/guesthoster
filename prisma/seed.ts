import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/auth/password';
import { slugify } from '../src/lib/utils';

const prisma = new PrismaClient();

const COUNTRIES = [
    {
        name: 'France',
        code: 'FR',
        flagEmoji: '🇫🇷',
        sortOrder: 1,
        cities: [
            { name: 'Paris', isPopular: true, sortOrder: 1, latitude: 48.8566, longitude: 2.3522 },
            { name: 'Lyon', isPopular: true, sortOrder: 2, latitude: 45.764, longitude: 4.8357 },
            { name: 'Marseille', isPopular: true, sortOrder: 3, latitude: 43.2965, longitude: 5.3698 },
            { name: 'Nice', isPopular: true, sortOrder: 4, latitude: 43.7102, longitude: 7.262 },
            { name: 'Bordeaux', isPopular: true, sortOrder: 5, latitude: 44.8378, longitude: -0.5792 },
            { name: 'Toulouse', isPopular: true, sortOrder: 6, latitude: 43.6047, longitude: 1.4442 },
            { name: 'Strasbourg', isPopular: false, sortOrder: 7, latitude: 48.5734, longitude: 7.7521 },
            { name: 'Lille', isPopular: false, sortOrder: 8, latitude: 50.6292, longitude: 3.0573 },
            { name: 'Nantes', isPopular: false, sortOrder: 9, latitude: 47.2184, longitude: -1.5536 },
            { name: 'Cannes', isPopular: false, sortOrder: 10, latitude: 43.5528, longitude: 7.0174 },
        ],
    },
    {
        name: 'Espagne',
        code: 'ES',
        flagEmoji: '🇪🇸',
        sortOrder: 2,
        cities: [
            { name: 'Madrid', isPopular: true, sortOrder: 1, latitude: 40.4168, longitude: -3.7038 },
            { name: 'Barcelone', isPopular: true, sortOrder: 2, latitude: 41.3851, longitude: 2.1734 },
            { name: 'Séville', isPopular: true, sortOrder: 3, latitude: 37.3886, longitude: -5.9823 },
            { name: 'Valence', isPopular: false, sortOrder: 4, latitude: 39.4699, longitude: -0.3763 },
            { name: 'Bilbao', isPopular: false, sortOrder: 5, latitude: 43.2627, longitude: -2.9253 },
            { name: 'Malaga', isPopular: false, sortOrder: 6, latitude: 36.7213, longitude: -4.4214 },
            { name: 'Grenade', isPopular: false, sortOrder: 7, latitude: 37.1773, longitude: -3.5986 },
        ],
    },
    {
        name: 'Italie',
        code: 'IT',
        flagEmoji: '🇮🇹',
        sortOrder: 3,
        cities: [
            { name: 'Rome', isPopular: true, sortOrder: 1, latitude: 41.9028, longitude: 12.4964 },
            { name: 'Milan', isPopular: true, sortOrder: 2, latitude: 45.4642, longitude: 9.19 },
            { name: 'Florence', isPopular: true, sortOrder: 3, latitude: 43.7696, longitude: 11.2558 },
            { name: 'Venise', isPopular: true, sortOrder: 4, latitude: 45.4408, longitude: 12.3155 },
            { name: 'Naples', isPopular: false, sortOrder: 5, latitude: 40.8518, longitude: 14.2681 },
            { name: 'Turin', isPopular: false, sortOrder: 6, latitude: 45.0703, longitude: 7.6869 },
            { name: 'Bologne', isPopular: false, sortOrder: 7, latitude: 44.4949, longitude: 11.3426 },
        ],
    },
    {
        name: 'Portugal',
        code: 'PT',
        flagEmoji: '🇵🇹',
        sortOrder: 4,
        cities: [
            { name: 'Lisbonne', isPopular: true, sortOrder: 1, latitude: 38.7223, longitude: -9.1393 },
            { name: 'Porto', isPopular: true, sortOrder: 2, latitude: 41.1579, longitude: -8.6291 },
            { name: 'Faro', isPopular: false, sortOrder: 3, latitude: 37.0194, longitude: -7.9322 },
        ],
    },
    {
        name: 'Allemagne',
        code: 'DE',
        flagEmoji: '🇩🇪',
        sortOrder: 5,
        cities: [
            { name: 'Berlin', isPopular: true, sortOrder: 1, latitude: 52.52, longitude: 13.405 },
            { name: 'Munich', isPopular: true, sortOrder: 2, latitude: 48.1351, longitude: 11.582 },
            { name: 'Hambourg', isPopular: false, sortOrder: 3, latitude: 53.5511, longitude: 9.9937 },
        ],
    },
] as const;

const AMENITIES: Record<string, Record<string, [string, string]>> = {
    essentials: {
        wifi: ['Wi-Fi', 'wifi'],
        heating: ['Chauffage', 'flame'],
        'air-conditioning': ['Climatisation', 'snowflake'],
        'washing-machine': ['Lave-linge', 'washing-machine'],
        linen: ['Linge de maison fourni', 'bed-double'],
        workspace: ['Espace de travail', 'laptop'],
    },
    kitchen: {
        kitchen: ['Cuisine équipée', 'cooking-pot'],
        dishwasher: ['Lave-vaisselle', 'utensils'],
        'coffee-maker': ['Machine à café', 'coffee'],
        microwave: ['Micro-ondes', 'microwave'],
    },
    comfort: {
        tv: ['Télévision', 'tv'],
        elevator: ['Ascenseur', 'arrow-up-down'],
        'pets-allowed': ['Animaux acceptés', 'paw-print'],
        accessible: ['Accessible PMR', 'accessibility'],
    },
    outdoor: {
        parking: ['Parking gratuit', 'car'],
        balcony: ['Balcon ou terrasse', 'sun'],
        garden: ['Jardin', 'trees'],
        pool: ['Piscine', 'waves'],
        bbq: ['Barbecue', 'flame-kindling'],
    },
    safety: {
        'smoke-detector': ['Détecteur de fumée', 'siren'],
        'first-aid-kit': ['Trousse de secours', 'cross'],
        'fire-extinguisher': ['Extincteur', 'fire-extinguisher'],
    },
};

const PROPERTY_TYPES: Record<string, string> = {
    appartement: 'Appartement',
    maison: 'Maison',
    gite: 'Gîte',
    studio: 'Studio',
    chambre: 'Chambre',
    villa: 'Villa',
};

async function main() {
    for (const countryData of COUNTRIES) {
        const { cities, ...countryFields } = countryData;
        const country = await prisma.country.upsert({
            where: { code: countryFields.code },
            update: {
                name: countryFields.name,
                flagEmoji: countryFields.flagEmoji,
                isActive: true,
                sortOrder: countryFields.sortOrder,
            },
            create: {
                ...countryFields,
                isActive: true,
            },
        });

        for (const cityData of cities) {
            const slug = slugify(cityData.name);
            await prisma.city.upsert({
                where: {
                    countryId_slug: {
                        countryId: country.id,
                        slug,
                    },
                },
                update: {
                    name: cityData.name,
                    isPopular: cityData.isPopular,
                    isActive: true,
                    sortOrder: cityData.sortOrder,
                    latitude: cityData.latitude,
                    longitude: cityData.longitude,
                },
                create: {
                    countryId: country.id,
                    name: cityData.name,
                    slug,
                    isPopular: cityData.isPopular,
                    isActive: true,
                    sortOrder: cityData.sortOrder,
                    latitude: cityData.latitude,
                    longitude: cityData.longitude,
                },
            });
        }
    }

    let amenityOrder = 0;
    for (const [category, items] of Object.entries(AMENITIES)) {
        for (const [slug, [name, icon]] of Object.entries(items)) {
            amenityOrder += 1;
            await prisma.amenity.upsert({
                where: { slug },
                update: {
                    name,
                    category,
                    icon,
                    sortOrder: amenityOrder,
                },
                create: {
                    slug,
                    name,
                    category,
                    icon,
                    sortOrder: amenityOrder,
                },
            });
        }
    }

    let typeOrder = 0;
    for (const [slug, name] of Object.entries(PROPERTY_TYPES)) {
        typeOrder += 1;
        await prisma.propertyType.upsert({
            where: { slug },
            update: {
                name,
                isActive: true,
                sortOrder: typeOrder,
            },
            create: {
                slug,
                name,
                isActive: true,
                sortOrder: typeOrder,
            },
        });
    }

    // Assurer un compte administrateur initial uniquement si aucun admin n'existe encore
    const existingAdmin = await prisma.user.findFirst({
        where: { role: 'admin' },
        select: { id: true },
    });

    if (!existingAdmin && process.env.ADMIN_SEED_EMAIL && process.env.ADMIN_SEED_PASSWORD) {
        const password = await hashPassword(process.env.ADMIN_SEED_PASSWORD);
        await prisma.user.create({
            data: {
                name: process.env.ADMIN_SEED_NAME?.trim() || 'Administrateur',
                email: process.env.ADMIN_SEED_EMAIL.trim().toLowerCase(),
                role: 'admin',
                emailVerifiedAt: new Date(),
                password,
            },
        });
    }

    console.log('Seed GuestHoster terminé avec succès.');
}

main()
    .catch((error) => {
        console.error(error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

