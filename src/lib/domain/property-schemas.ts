import { z } from 'zod';
import type { PropertyStatus } from '@/lib/domain/enums';

export const detailsSchema = z.object({
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

function parseOptionalCoordinate(val: unknown): unknown {
    if (val === '' || val === null || val === undefined) {
        return null;
    }
    const parsed = Number(val);
    return Number.isNaN(parsed) ? val : parsed;
}

export const locationSchema = z
    .object({
        city_id: z.coerce.number().int().positive('Choisissez une ville.'),
        address: z
            .string()
            .trim()
            .min(2, 'Saisissez l’adresse.')
            .max(255),
        postal_code: z.string().trim().max(20).optional().nullable(),
        latitude: z.preprocess(
            parseOptionalCoordinate,
            z
                .number({ message: 'Latitude invalide.' })
                .min(-90, 'La latitude doit être comprise entre -90 et 90.')
                .max(90, 'La latitude doit être comprise entre -90 et 90.')
                .nullable(),
        ),
        longitude: z.preprocess(
            parseOptionalCoordinate,
            z
                .number({ message: 'Longitude invalide.' })
                .min(-180, 'La longitude doit être comprise entre -180 et 180.')
                .max(180, 'La longitude doit être comprise entre -180 et 180.')
                .nullable(),
        ),
    })
    .superRefine((data, ctx) => {
        const hasLat = data.latitude !== null;
        const hasLng = data.longitude !== null;
        if (hasLat !== hasLng) {
            if (!hasLat) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ['latitude'],
                    message:
                        'Indiquez la latitude ou laissez les deux coordonnées vides.',
                });
            }
            if (!hasLng) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ['longitude'],
                    message:
                        'Indiquez la longitude ou laissez les deux coordonnées vides.',
                });
            }
        }
    });

export const capacitySchema = z.object({
    max_guests: z.coerce.number().int().min(1).max(30),
    bedrooms: z.coerce.number().int().min(0).max(30),
    beds: z.coerce.number().int().min(1).max(50),
    bathrooms: z.coerce.number().int().min(0).max(20),
});

export const amenitiesSchema = z.object({
    amenities: z.array(z.coerce.number().int().positive()).default([]),
});

export const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

export const pricingSchema = z
    .object({
        price_per_night: z.coerce
            .number()
            .min(10, 'Le tarif minimum par nuit est de 10 €.')
            .max(10_000, 'Le tarif maximum par nuit est de 10 000 €.'),
        cleaning_fee: z.preprocess(
            (val) =>
                val === '' || val === null || val === undefined
                    ? 0
                    : Number(val),
            z
                .number({ message: 'Montant invalide.' })
                .min(0, 'Les frais de ménage doivent être positifs.')
                .max(1_000, 'Les frais de ménage ne peuvent pas dépasser 1 000 €.'),
        ),
        min_nights: z.coerce.number().int().min(1).max(90),
        max_nights: z.preprocess(
            (val) =>
                val === '' || val === null || val === undefined
                    ? null
                    : Number(val),
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

export const ADMIN_CREATE_STATUSES: readonly PropertyStatus[] = [
    'draft',
    'pending',
    'published',
];

export const adminOwnerSchema = z
    .object({
        owner_mode: z.enum(['existing', 'new']),
        owner_id: z.preprocess(
            (val) =>
                val === '' || val === null || val === undefined
                    ? null
                    : Number(val),
            z.number().int().positive().nullable(),
        ),
        owner_name: z.string().trim().max(120).optional().default(''),
        owner_email: z
            .string()
            .trim()
            .toLowerCase()
            .max(255)
            .optional()
            .default(''),
        owner_password: z.string().max(128).optional().default(''),
        initial_status: z.enum(['draft', 'pending', 'published']).default('draft'),
    })
    .superRefine((data, ctx) => {
        if (data.owner_mode === 'existing') {
            if (!data.owner_id) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ['owner_id'],
                    message: 'Sélectionnez le compte propriétaire du logement.',
                });
            }
            return;
        }

        if (data.owner_name.length < 2) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['owner_name'],
                message: 'Saisissez le nom complet du propriétaire.',
            });
        }

        const emailCheck = z.string().email().safeParse(data.owner_email);
        if (!emailCheck.success) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['owner_email'],
                message: 'Saisissez une adresse e-mail valide.',
            });
        }

        if (data.owner_password.length < 8) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['owner_password'],
                message:
                    'Le mot de passe initial doit contenir au moins 8 caractères.',
            });
        }
    });

export const fullPropertyDraftSchema = z
    .object({
        title: detailsSchema.shape.title,
        property_type_id: detailsSchema.shape.property_type_id,
        description: detailsSchema.shape.description,
        city_id: z.coerce.number().int().positive('Choisissez une ville.'),
        address: z
            .string()
            .trim()
            .min(2, 'Saisissez l’adresse.')
            .max(255),
        postal_code: z.string().trim().max(20).optional().nullable(),
        latitude: z.preprocess(
            parseOptionalCoordinate,
            z
                .number({ message: 'Latitude invalide.' })
                .min(-90, 'La latitude doit être comprise entre -90 et 90.')
                .max(90, 'La latitude doit être comprise entre -90 et 90.')
                .nullable(),
        ),
        longitude: z.preprocess(
            parseOptionalCoordinate,
            z
                .number({ message: 'Longitude invalide.' })
                .min(-180, 'La longitude doit être comprise entre -180 et 180.')
                .max(180, 'La longitude doit être comprise entre -180 et 180.')
                .nullable(),
        ),
        max_guests: capacitySchema.shape.max_guests,
        bedrooms: capacitySchema.shape.bedrooms,
        beds: capacitySchema.shape.beds,
        bathrooms: capacitySchema.shape.bathrooms,
        amenities: amenitiesSchema.shape.amenities,
        price_per_night: z.coerce
            .number()
            .min(10, 'Le tarif minimum par nuit est de 10 €.')
            .max(10_000, 'Le tarif maximum par nuit est de 10 000 €.'),
        cleaning_fee: z.preprocess(
            (val) =>
                val === '' || val === null || val === undefined
                    ? 0
                    : Number(val),
            z
                .number({ message: 'Montant invalide.' })
                .min(0, 'Les frais de ménage doivent être positifs.')
                .max(1_000, 'Les frais de ménage ne peuvent pas dépasser 1 000 €.'),
        ),
        min_nights: z.coerce.number().int().min(1).max(90),
        max_nights: z.preprocess(
            (val) =>
                val === '' || val === null || val === undefined
                    ? null
                    : Number(val),
            z.number().int().min(1).max(365).nullable(),
        ),
        check_in_time: z.string().regex(timePattern, 'Format HH:MM attendu.'),
        check_out_time: z.string().regex(timePattern, 'Format HH:MM attendu.'),
        booking_mode: z.enum(['instant', 'request']),
    })
    .superRefine((data, ctx) => {
        const hasLat = data.latitude !== null;
        const hasLng = data.longitude !== null;
        if (hasLat !== hasLng) {
            if (!hasLat) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ['latitude'],
                    message:
                        'Indiquez la latitude ou laissez les deux coordonnées vides.',
                });
            }
            if (!hasLng) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ['longitude'],
                    message:
                        'Indiquez la longitude ou laissez les deux coordonnées vides.',
                });
            }
        }
        if (data.max_nights !== null && data.max_nights < data.min_nights) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['max_nights'],
                message:
                    'Le séjour maximum doit être supérieur ou égal au séjour minimum.',
            });
        }
    });

export type PropertyWizardDraftValues = {
    owner_mode: 'existing' | 'new';
    owner_id: string;
    owner_name: string;
    owner_email: string;
    owner_password: string;
    initial_status: 'draft' | 'pending' | 'published';
    title: string;
    property_type_id: string;
    description: string;
    city_id: string;
    address: string;
    postal_code: string;
    latitude: string;
    longitude: string;
    max_guests: number;
    bedrooms: number;
    beds: number;
    bathrooms: number;
    amenities: number[];
    price_per_night: number;
    cleaning_fee: number;
    min_nights: number;
    max_nights: number | null;
    check_in_time: string;
    check_out_time: string;
    booking_mode: 'instant' | 'request';
};

export const DEFAULT_WIZARD_VALUES: PropertyWizardDraftValues = {
    owner_mode: 'existing',
    owner_id: '',
    owner_name: '',
    owner_email: '',
    owner_password: '',
    initial_status: 'draft',
    title: '',
    property_type_id: '',
    description: '',
    city_id: '',
    address: '',
    postal_code: '',
    latitude: '',
    longitude: '',
    max_guests: 2,
    bedrooms: 1,
    beds: 1,
    bathrooms: 1,
    amenities: [],
    price_per_night: 8000,
    cleaning_fee: 0,
    min_nights: 1,
    max_nights: null,
    check_in_time: '15:00',
    check_out_time: '11:00',
    booking_mode: 'request',
};

