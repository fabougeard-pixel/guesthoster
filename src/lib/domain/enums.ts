import type { Option } from '@/types';

export const USER_ROLES = ['client', 'host', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const USER_ROLE_LABELS: Record<UserRole, string> = {
    client: 'Voyageur',
    host: 'Hôte',
    admin: 'Administrateur',
};

export const REGISTRABLE_ROLES: Option[] = [
    { value: 'client', label: USER_ROLE_LABELS.client },
    { value: 'host', label: USER_ROLE_LABELS.host },
];

export const ALL_ROLE_OPTIONS: Option[] = USER_ROLES.map((value) => ({
    value,
    label: USER_ROLE_LABELS[value],
}));

export const PROPERTY_STATUSES = [
    'draft',
    'pending',
    'published',
    'rejected',
    'archived',
] as const;
export type PropertyStatus = (typeof PROPERTY_STATUSES)[number];

export const PROPERTY_STATUS_LABELS: Record<PropertyStatus, string> = {
    draft: 'Brouillon',
    pending: 'En attente de validation',
    published: 'Publié',
    rejected: 'Refusé',
    archived: 'Archivé',
};

const PROPERTY_TRANSITIONS: Record<PropertyStatus, PropertyStatus[]> = {
    draft: ['pending', 'archived'],
    rejected: ['pending', 'archived'],
    pending: ['published', 'rejected', 'draft'],
    published: ['archived', 'draft', 'rejected'],
    archived: ['draft'],
};

export function canPropertyTransitionTo(
    from: PropertyStatus,
    to: PropertyStatus,
): boolean {
    return PROPERTY_TRANSITIONS[from].includes(to);
}

export function isPropertyEditable(status: PropertyStatus): boolean {
    return status === 'draft' || status === 'rejected';
}

export const RENTAL_DURATIONS = ['short_term', 'long_term'] as const;
export type RentalDuration = (typeof RENTAL_DURATIONS)[number];

export const RENTAL_DURATION_LABELS: Record<RentalDuration, string> = {
    short_term: 'Location saisonnière',
    long_term: 'Location standard',
};

export const RENTAL_DURATION_OPTIONS: Option[] = RENTAL_DURATIONS.map((value) => ({
    value,
    label: RENTAL_DURATION_LABELS[value],
}));

export const BOOKING_MODES = ['instant', 'request'] as const;
export type BookingMode = (typeof BOOKING_MODES)[number];

export const BOOKING_MODE_LABELS: Record<BookingMode, string> = {
    instant: 'Réservation instantanée',
    request: 'Sur demande',
};

export const BOOKING_MODE_OPTIONS: Option[] = BOOKING_MODES.map((value) => ({
    value,
    label: BOOKING_MODE_LABELS[value],
}));

export const BOOKING_STATUSES = [
    'pending',
    'awaiting_payment',
    'confirmed',
    'declined',
    'cancelled',
    'expired',
    'completed',
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
    pending: 'En attente de l’hôte',
    awaiting_payment: 'En attente de paiement',
    confirmed: 'Confirmée',
    declined: 'Refusée',
    cancelled: 'Annulée',
    expired: 'Expirée',
    completed: 'Terminée',
};

export const BOOKING_STATUS_OPTIONS: Option[] = BOOKING_STATUSES.map((value) => ({
    value,
    label: BOOKING_STATUS_LABELS[value],
}));

const BOOKING_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
    pending: ['awaiting_payment', 'declined', 'cancelled', 'expired'],
    awaiting_payment: ['confirmed', 'cancelled', 'expired'],
    confirmed: ['cancelled', 'completed'],
    declined: [],
    cancelled: [],
    expired: [],
    completed: [],
};

export function canBookingTransitionTo(
    from: BookingStatus,
    to: BookingStatus,
): boolean {
    return BOOKING_TRANSITIONS[from].includes(to);
}

export const BLOCKING_BOOKING_STATUSES: BookingStatus[] = [
    'pending',
    'awaiting_payment',
    'confirmed',
];

export const PROPERTY_SORTS = [
    'newest',
    'price_asc',
    'price_desc',
    'top_rated',
] as const;
export type PropertySort = (typeof PROPERTY_SORTS)[number];

export const PROPERTY_SORT_LABELS: Record<PropertySort, string> = {
    newest: 'Les plus récents',
    price_asc: 'Prix croissant',
    price_desc: 'Prix décroissant',
    top_rated: 'Les mieux notés',
};

export const PROPERTY_SORT_OPTIONS: Option[] = PROPERTY_SORTS.map((value) => ({
    value,
    label: PROPERTY_SORT_LABELS[value],
}));

export const AMENITY_CATEGORIES = [
    'essentials',
    'kitchen',
    'comfort',
    'outdoor',
    'safety',
] as const;
export type AmenityCategory = (typeof AMENITY_CATEGORIES)[number];

export const AMENITY_CATEGORY_LABELS: Record<AmenityCategory, string> = {
    essentials: 'Essentiels',
    kitchen: 'Cuisine',
    comfort: 'Confort',
    outdoor: 'Extérieur',
    safety: 'Sécurité',
};

export const AMENITY_CATEGORY_OPTIONS: Option[] = AMENITY_CATEGORIES.map(
    (value) => ({
        value,
        label: AMENITY_CATEGORY_LABELS[value],
    }),
);

export const PROPERTY_FORM_STEPS = [
    'details',
    'location',
    'capacity',
    'amenities',
    'pricing',
    'photos',
] as const;
export type PropertyFormStep = (typeof PROPERTY_FORM_STEPS)[number];

export const PROPERTY_FORM_STEP_LABELS: Record<PropertyFormStep, string> = {
    details: 'Description',
    location: 'Emplacement',
    capacity: 'Capacité',
    amenities: 'Équipements',
    pricing: 'Tarifs et règles',
    photos: 'Photos',
};

export const LONG_TERM_PROPERTY_FORM_STEP_LABELS: Record<PropertyFormStep, string> = {
    details: 'Bail & Description',
    location: 'Emplacement',
    capacity: 'Configuration & Pièces',
    amenities: 'Prestations & Équipements',
    pricing: 'Loyer & Conditions du bail',
    photos: 'Photos',
};

export function getPropertyFormStepLabel(
    step: PropertyFormStep,
    rentalDuration?: RentalDuration,
): string {
    if (rentalDuration === 'long_term') {
        return (
            LONG_TERM_PROPERTY_FORM_STEP_LABELS[step] ??
            PROPERTY_FORM_STEP_LABELS[step]
        );
    }
    return PROPERTY_FORM_STEP_LABELS[step];
}

export const PROPERTY_FORM_STEP_OPTIONS: Option[] = PROPERTY_FORM_STEPS.map(
    (value) => ({
        value,
        label: PROPERTY_FORM_STEP_LABELS[value],
    }),
);

export function nextPropertyFormStep(
    step: PropertyFormStep,
): PropertyFormStep | null {
    const index = PROPERTY_FORM_STEPS.indexOf(step);
    return PROPERTY_FORM_STEPS[index + 1] ?? null;
}

