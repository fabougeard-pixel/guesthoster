import { z } from 'zod';
import type { PropertyStatus, RentalDuration } from '@/lib/domain/enums';

export const CUSTOM_PROPERTY_TYPE_OPTION = 'other';

function parseOptionalCoordinate(val: unknown): unknown {
    if (val === '' || val === null || val === undefined) {
        return null;
    }
    const parsed = Number(val);
    return Number.isNaN(parsed) ? val : parsed;
}

function parseOptionalNumber(val: unknown, fallback: number | null): unknown {
    if (val === '' || val === null || val === undefined) {
        return fallback;
    }
    const parsed = Number(val);
    return Number.isNaN(parsed) ? val : parsed;
}

function parseBooleanInput(val: unknown, fallback = true): boolean {
    if (typeof val === 'boolean') {
        return val;
    }
    if (val === 'false' || val === '0' || val === 'without_charges') {
        return false;
    }
    if (val === 'true' || val === '1' || val === 'charges_included') {
        return true;
    }
    return fallback;
}

function parsePropertyTypeSelection(val: unknown): number | null {
    if (val === CUSTOM_PROPERTY_TYPE_OPTION || val === '' || val === null || val === undefined) {
        return null;
    }
    const parsed = Number(val);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : -1;
}

function refinePropertyTypeSelection(
    data: {
        property_type_id: number | null;
        custom_property_type?: string | null;
    },
    ctx: z.RefinementCtx,
): void {
    const customName = data.custom_property_type?.trim() ?? '';
    if (data.property_type_id === null) {
        if (customName.length === 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['property_type_id'],
                message: 'Choisissez un type de logement.',
            });
            return;
        }
        if (customName.length < 2 || customName.length > 80) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['custom_property_type'],
                message: 'Saisissez un nom de type entre 2 et 80 caractères.',
            });
        }
        return;
    }

    if (data.property_type_id < 1) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['property_type_id'],
            message: 'Choisissez un type de logement.',
        });
    }
}

function parseTextInput(val: unknown): string {
    return typeof val === 'string' ? val : '';
}

function parseOptionalEnumInput(val: unknown): unknown {
    return val === null || val === undefined || val === '' ? undefined : val;
}

function parseOptionalTimeInput(val: unknown, fallback: string): string {
    return typeof val === 'string' && val.trim() !== '' ? val : fallback;
}

export const detailsSchema = z
    .object({
        rental_duration: z.preprocess(
            parseOptionalEnumInput,
            z.enum(['short_term', 'long_term']).default('short_term'),
        ),
        title: z.preprocess(
            parseTextInput,
            z
                .string()
                .trim()
                .min(10, 'Le titre doit contenir au moins 10 caractères.')
                .max(120, 'Le titre ne doit pas dépasser 120 caractères.'),
        ),
        property_type_id: z.preprocess(
            parsePropertyTypeSelection,
            z.number().int().nullable(),
        ),
        custom_property_type: z.preprocess(
            parseTextInput,
            z
                .string()
                .trim()
                .max(80, 'Le nom du type ne doit pas dépasser 80 caractères.')
                .default(''),
        ),
        description: z.preprocess(
            parseTextInput,
            z
                .string()
                .trim()
                .min(80, 'La description doit contenir au moins 80 caractères.')
                .max(5000, 'La description ne doit pas dépasser 5000 caractères.'),
        ),
    })
    .superRefine(refinePropertyTypeSelection);

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
    beds: z.coerce.number().int().min(0).max(50),
    bathrooms: z.coerce.number().int().min(0).max(20),
});

export const amenitiesSchema = z.object({
    amenities: z.array(z.coerce.number().int().positive()).default([]),
});

export const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

const pricingFieldsObject = {
    rental_duration: z.preprocess(
        parseOptionalEnumInput,
        z.enum(['short_term', 'long_term']).default('short_term'),
    ),
    price_per_night: z.preprocess(
        (v) => parseOptionalNumber(v, 0),
        z.number({ message: 'Montant invalide.' }),
    ),
    cleaning_fee: z.preprocess(
        (v) => parseOptionalNumber(v, 0),
        z.number({ message: 'Montant invalide.' }),
    ),
    min_nights: z.preprocess(
        (v) => parseOptionalNumber(v, 1),
        z.number({ message: 'Valeur invalide.' }).int(),
    ),
    max_nights: z.preprocess(
        (v) => parseOptionalNumber(v, null),
        z.number({ message: 'Valeur invalide.' }).int().nullable(),
    ),
    check_in_time: z.preprocess(
        (v) => parseOptionalTimeInput(v, '15:00'),
        z.string().default('15:00'),
    ),
    check_out_time: z.preprocess(
        (v) => parseOptionalTimeInput(v, '11:00'),
        z.string().default('11:00'),
    ),
    monthly_rent: z.preprocess(
        (v) => parseOptionalNumber(v, 0),
        z.number({ message: 'Montant invalide.' }),
    ),
    security_deposit: z.preprocess(
        (v) => parseOptionalNumber(v, 0),
        z.number({ message: 'Montant invalide.' }),
    ),
    monthly_charges: z.preprocess(
        (v) => parseOptionalNumber(v, 0),
        z.number({ message: 'Montant invalide.' }),
    ),
    charges_included: z.preprocess(
        (v) => parseBooleanInput(v, true),
        z.boolean(),
    ),
    advance_rent_months: z.preprocess(
        (v) => parseOptionalNumber(v, 1),
        z.number({ message: 'Nombre de mois invalide.' }).int(),
    ),
    booking_mode: z.preprocess(
        parseOptionalEnumInput,
        z.enum(['instant', 'request'], {
            message: 'Veuillez choisir un mode de réservation.',
        }),
    ),
    cancellation_days: z.preprocess(
        (v) => parseOptionalNumber(v, 7),
        z
            .number({ message: 'Délai d’annulation invalide.' })
            .int()
            .min(0, 'Le délai minimum est de 0 jour.')
            .max(60, 'Le délai maximum est de 60 jours.'),
    ),
};

function refinePricingFields(
    data: {
        rental_duration: RentalDuration;
        price_per_night: number;
        cleaning_fee: number;
        min_nights: number;
        max_nights: number | null;
        check_in_time: string;
        check_out_time: string;
        monthly_rent: number;
        security_deposit: number;
        monthly_charges: number;
        charges_included: boolean;
        advance_rent_months: number;
    },
    ctx: z.RefinementCtx,
): void {
    if (data.rental_duration === 'long_term') {
        if (data.monthly_rent < 50) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['monthly_rent'],
                message: 'Le loyer mensuel minimum est de 50 €.',
            });
        } else if (data.monthly_rent > 50_000) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['monthly_rent'],
                message: 'Le loyer mensuel maximum est de 50 000 €.',
            });
        }

        if (data.security_deposit < 0 || data.security_deposit > 100_000) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['security_deposit'],
                message: 'La caution doit être comprise entre 0 € et 100 000 €.',
            });
        }

        if (data.advance_rent_months < 1 || data.advance_rent_months > 12) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['advance_rent_months'],
                message: 'Choisissez entre 1 et 12 mois de loyer à l’entrée.',
            });
        }

        if (!data.charges_included) {
            if (data.monthly_charges < 0 || data.monthly_charges > 10_000) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ['monthly_charges'],
                    message:
                        'Les charges mensuelles doivent être comprises entre 0 € et 10 000 €.',
                });
            }
        }
        return;
    }

    if (data.price_per_night < 10) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['price_per_night'],
            message: 'Le tarif minimum par nuit est de 10 €.',
        });
    } else if (data.price_per_night > 10_000) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['price_per_night'],
            message: 'Le tarif maximum par nuit est de 10 000 €.',
        });
    }

    if (data.cleaning_fee < 0 || data.cleaning_fee > 1_000) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['cleaning_fee'],
            message: 'Les frais de ménage doivent être compris entre 0 € et 1 000 €.',
        });
    }

    if (data.min_nights < 1 || data.min_nights > 90) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['min_nights'],
            message: 'Le séjour minimum doit être compris entre 1 et 90 nuits.',
        });
    }

    if (data.max_nights !== null) {
        if (data.max_nights < 1 || data.max_nights > 365) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['max_nights'],
                message: 'Le séjour maximum ne peut pas dépasser 365 nuits.',
            });
        } else if (data.max_nights < data.min_nights) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['max_nights'],
                message:
                    'Le séjour maximum doit être supérieur ou égal au séjour minimum.',
            });
        }
    }

    if (!timePattern.test(data.check_in_time)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['check_in_time'],
            message: 'Format HH:MM attendu.',
        });
    }

    if (!timePattern.test(data.check_out_time)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['check_out_time'],
            message: 'Format HH:MM attendu.',
        });
    }
}

export const pricingSchema = z
    .object(pricingFieldsObject)
    .superRefine(refinePricingFields);

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
        owner_name: z.preprocess(
            parseTextInput,
            z.string().trim().max(120).default(''),
        ),
        owner_email: z.preprocess(
            parseTextInput,
            z.string().trim().toLowerCase().max(255).default(''),
        ),
        owner_password: z.preprocess(
            parseTextInput,
            z.string().max(128).default(''),
        ),
        initial_status: z.preprocess(
            parseOptionalEnumInput,
            z.enum(['draft', 'pending', 'published']).default('draft'),
        ),
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
        custom_property_type: detailsSchema.shape.custom_property_type,
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
        ...pricingFieldsObject,
    })
    .superRefine((data, ctx) => {
        refinePropertyTypeSelection(data, ctx);

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

        refinePricingFields(data, ctx);
    });

export type PropertyWizardDraftValues = {
    owner_mode: 'existing' | 'new';
    owner_id: string;
    owner_name: string;
    owner_email: string;
    owner_password: string;
    initial_status: 'draft' | 'pending' | 'published';
    rental_duration: RentalDuration;
    title: string;
    property_type_id: string;
    custom_property_type: string;
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
    monthly_rent: number;
    security_deposit: number;
    monthly_charges: number;
    charges_included: boolean;
    advance_rent_months: number;
    check_in_time: string;
    check_out_time: string;
    booking_mode: 'instant' | 'request';
    cancellation_days: number;
};

export const DEFAULT_WIZARD_VALUES: PropertyWizardDraftValues = {
    owner_mode: 'existing',
    owner_id: '',
    owner_name: '',
    owner_email: '',
    owner_password: '',
    initial_status: 'draft',
    rental_duration: 'short_term',
    title: '',
    property_type_id: '',
    custom_property_type: '',
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
    monthly_rent: 85000,
    security_deposit: 85000,
    monthly_charges: 0,
    charges_included: true,
    advance_rent_months: 1,
    check_in_time: '15:00',
    check_out_time: '11:00',
    booking_mode: 'request',
    cancellation_days: 7,
};
