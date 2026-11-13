import { describe, expect, it } from 'vitest';
import { createPropertyVisitAction } from '@/lib/actions/visits';
import { RENTAL_DURATION_LABELS } from '@/lib/domain/enums';
import { pricingSchema } from '@/lib/domain/property-schemas';

describe('Rental duration & standard rentals', () => {
    it('provides clear labels distinguishing standard and seasonal rentals', () => {
        expect(RENTAL_DURATION_LABELS.short_term).toBe('Location saisonnière');
        expect(RENTAL_DURATION_LABELS.long_term).toBe(
            'Location standard (Bail 1 an)',
        );
    });

    it('validates pricing with visit fee for long term properties', () => {
        const parsed = pricingSchema.safeParse({
            rental_duration: 'long_term',
            monthly_rent: 850,
            security_deposit: 850,
            monthly_charges: 60,
            charges_included: false,
            advance_rent_months: 1,
            visit_fee: 20,
            booking_mode: 'request',
            price_per_night: '',
            cleaning_fee: '',
            min_nights: 1,
            max_nights: '',
            check_in_time: '15:00',
            check_out_time: '11:00',
            cancellation_days: 7,
        });

        expect(parsed.success).toBe(true);
        if (parsed.success) {
            expect(parsed.data.visit_fee).toBe(20);
            expect(parsed.data.monthly_rent).toBe(850);
        }
    });

    it('rejects visit bookings with dates in the past', async () => {
        const result = await createPropertyVisitAction({
            propertySlug: 'appartement-t1-longue-duree-c065bb',
            visitDate: '2020-01-01',
            timeSlot: '14:00',
            name: 'Test Candidat',
            email: 'candidat@example.com',
        });

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error).toContain('passé');
        }
    });

    it('rejects visit bookings with invalid email', async () => {
        const result = await createPropertyVisitAction({
            propertySlug: 'appartement-t1-longue-duree-c065bb',
            visitDate: '2026-12-01',
            timeSlot: '14:00',
            name: 'Test Candidat',
            email: 'invalid-email',
        });

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error).toContain('e-mail');
        }
    });
});

