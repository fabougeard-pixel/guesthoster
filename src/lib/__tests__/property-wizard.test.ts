import { describe, expect, it } from 'vitest';
import {
    adminOwnerSchema,
    capacitySchema,
    detailsSchema,
    fullPropertyDraftSchema,
    locationSchema,
    pricingSchema,
} from '@/lib/domain/property-schemas';
import { isSectionLinkActive } from '@/lib/navigation/section-nav';

const validDescription =
    'Bel appartement lumineux situé à deux pas du port, équipé pour accueillir des séjours professionnels ou familiaux tout au long de l’année.';

describe('Property wizard Zod schemas', () => {
    it('validates property details lengths and required type', () => {
        expect(
            detailsSchema.safeParse({
                title: 'Trop court',
                property_type_id: '',
                description: 'Trop courte',
            }).success,
        ).toBe(false);

        const valid = detailsSchema.safeParse({
            title: 'Appartement vue mer près du Vieux-Port',
            property_type_id: '2',
            description: validDescription,
        });
        expect(valid.success).toBe(true);
        if (valid.success) {
            expect(valid.data.property_type_id).toBe(2);
        }
    });

    it('validates location with optional paired latitude/longitude coordinates', () => {
        const withoutGps = locationSchema.safeParse({
            city_id: 3,
            address: '14 Quai du Port',
            postal_code: '13002',
            latitude: '',
            longitude: '',
        });
        expect(withoutGps.success).toBe(true);
        if (withoutGps.success) {
            expect(withoutGps.data.latitude).toBeNull();
            expect(withoutGps.data.longitude).toBeNull();
        }

        const halfGps = locationSchema.safeParse({
            city_id: 3,
            address: '14 Quai du Port',
            postal_code: '13002',
            latitude: '43.2965',
            longitude: '',
        });
        expect(halfGps.success).toBe(false);
        if (!halfGps.success) {
            expect(halfGps.error.issues[0]?.path).toEqual(['longitude']);
        }

        const outOfRange = locationSchema.safeParse({
            city_id: 3,
            address: '14 Quai du Port',
            latitude: 95,
            longitude: 5,
        });
        expect(outOfRange.success).toBe(false);

        const validGps = locationSchema.safeParse({
            city_id: 3,
            address: '14 Quai du Port',
            postal_code: '13002',
            latitude: '43.296482',
            longitude: '5.36978',
        });
        expect(validGps.success).toBe(true);
        if (validGps.success) {
            expect(validGps.data.latitude).toBeCloseTo(43.296482);
            expect(validGps.data.longitude).toBeCloseTo(5.36978);
        }
    });

    it('validates capacity and pricing constraints', () => {
        expect(
            capacitySchema.safeParse({
                max_guests: 4,
                bedrooms: 2,
                beds: 3,
                bathrooms: 1,
            }).success,
        ).toBe(true);

        expect(
            pricingSchema.safeParse({
                price_per_night: 85.5,
                cleaning_fee: 25,
                min_nights: 5,
                max_nights: 3,
                check_in_time: '15:00',
                check_out_time: '11:00',
                booking_mode: 'instant',
            }).success,
        ).toBe(false);

        const validPricing = pricingSchema.safeParse({
            price_per_night: 85.5,
            cleaning_fee: '',
            min_nights: 2,
            max_nights: '',
            check_in_time: '15:00',
            check_out_time: '11:00',
            booking_mode: 'instant',
        });
        expect(validPricing.success).toBe(true);
        if (validPricing.success) {
            expect(Math.round(validPricing.data.price_per_night * 100)).toBe(
                8550,
            );
            expect(validPricing.data.cleaning_fee).toBe(0);
            expect(validPricing.data.max_nights).toBeNull();
        }
    });

    it('validates admin owner selection vs inline new host account creation', () => {
        expect(
            adminOwnerSchema.safeParse({
                owner_mode: 'existing',
                owner_id: '',
                initial_status: 'published',
            }).success,
        ).toBe(false);

        expect(
            adminOwnerSchema.safeParse({
                owner_mode: 'existing',
                owner_id: '7',
                initial_status: 'published',
            }).success,
        ).toBe(true);

        const invalidNewOwner = adminOwnerSchema.safeParse({
            owner_mode: 'new',
            owner_id: null,
            owner_name: 'A',
            owner_email: 'not-an-email',
            owner_password: '123',
            initial_status: 'draft',
        });
        expect(invalidNewOwner.success).toBe(false);
        if (!invalidNewOwner.success) {
            const fields = invalidNewOwner.error.issues.map((i) => i.path[0]);
            expect(fields).toContain('owner_name');
            expect(fields).toContain('owner_email');
            expect(fields).toContain('owner_password');
        }

        const validNewOwner = adminOwnerSchema.safeParse({
            owner_mode: 'new',
            owner_id: null,
            owner_name: 'Camille Laurent',
            owner_email: 'Camille@Example.com',
            owner_password: 'StrongPassword123!',
            initial_status: 'published',
        });
        expect(validNewOwner.success).toBe(true);
        if (validNewOwner.success) {
            expect(validNewOwner.data.owner_email).toBe('camille@example.com');
        }
    });

    it('validates the full unified property payload in one pass', () => {
        const res = fullPropertyDraftSchema.safeParse({
            title: 'Villa contemporaine avec piscine chauffée',
            property_type_id: 1,
            description: validDescription,
            city_id: 10,
            address: '8 Avenue de la Plage',
            postal_code: '06400',
            latitude: 43.5528,
            longitude: 7.0174,
            max_guests: 6,
            bedrooms: 3,
            beds: 4,
            bathrooms: 2,
            amenities: [1, 4, 9],
            price_per_night: 240,
            cleaning_fee: 60,
            min_nights: 2,
            max_nights: 14,
            check_in_time: '16:00',
            check_out_time: '10:00',
            booking_mode: 'request',
        });

        expect(res.success).toBe(true);
    });
});

describe('Sidebar active link matching', () => {
    const adminListingsLink = {
        label: 'Logements',
        href: '/admin/logements',
        excludePaths: ['/admin/logements/nouveau'],
    };
    const adminCreateLink = {
        label: 'Ajouter un logement',
        href: '/admin/logements/nouveau',
        exact: true,
    };
    const hostListingsLink = {
        label: 'Mes logements',
        href: '/hote',
        exact: true,
        matchPrefixes: ['/hote/logements'],
        excludePaths: ['/hote/logements/nouveau'],
    };
    const hostCreateLink = {
        label: 'Ajouter un logement',
        href: '/hote/logements/nouveau',
        exact: true,
    };

    it('highlights create route distinctly from listings table', () => {
        expect(
            isSectionLinkActive('/admin/logements/nouveau', adminCreateLink),
        ).toBe(true);
        expect(
            isSectionLinkActive('/admin/logements/nouveau', adminListingsLink),
        ).toBe(false);
        expect(
            isSectionLinkActive(
                '/admin/logements/villa-abc/modifier/details',
                adminListingsLink,
            ),
        ).toBe(true);
    });

    it('highlights host listings on dashboard and editor, but not on create', () => {
        expect(isSectionLinkActive('/hote', hostListingsLink)).toBe(true);
        expect(
            isSectionLinkActive(
                '/hote/logements/loft-marais/modifier/pricing',
                hostListingsLink,
            ),
        ).toBe(true);
        expect(
            isSectionLinkActive('/hote/logements/nouveau', hostListingsLink),
        ).toBe(false);
        expect(
            isSectionLinkActive('/hote/logements/nouveau', hostCreateLink),
        ).toBe(true);
    });
});

