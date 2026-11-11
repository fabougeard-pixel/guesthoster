import { describe, expect, it } from 'vitest';
import {
    canBookingTransitionTo,
    canPropertyTransitionTo,
    isPropertyEditable,
} from '@/lib/domain/enums';
import { quoteLongTermUpfront, quotePrice } from '@/lib/domain/pricing';
import {
    calculateRefundAmount,
    describeRefundPolicy,
} from '@/lib/domain/refund-policy';
import {
    addDays,
    diffInDays,
    formatPrice,
    isValidIsoDate,
} from '@/lib/format';
import { slugify } from '@/lib/utils';

describe('Pricing calculator', () => {
    it('computes lodging total, service fee and grand total in cents', () => {
        const quote = quotePrice({
            pricePerNight: 12_500,
            cleaningFee: 4_000,
            checkIn: '2026-07-10',
            checkOut: '2026-07-13',
        });

        expect(quote).toEqual({
            nights: 3,
            price_per_night: 12_500,
            cleaning_fee: 4_000,
            lodging_total: 37_500,
            service_fee: 4_150,
            total_price: 45_650,
        });
    });

    it('clamps reversed dates to zero nights', () => {
        const quote = quotePrice({
            pricePerNight: 10_000,
            cleaningFee: 0,
            checkIn: '2026-07-15',
            checkOut: '2026-07-10',
        });

        expect(quote.nights).toBe(0);
        expect(quote.lodging_total).toBe(0);
        expect(quote.total_price).toBe(0);
    });

    it('computes long-term upfront payment with charges included vs excluded and configurable advance months', () => {
        const included = quoteLongTermUpfront({
            monthlyRent: 85_000,
            securityDeposit: 85_000,
            monthlyCharges: 9_000,
            chargesIncluded: true,
            advanceRentMonths: 1,
        });

        expect(included).toEqual({
            monthly_rent: 85_000,
            monthly_charges: 0,
            charges_included: true,
            advance_rent_months: 1,
            upfront_rent: 85_000,
            upfront_charges: 0,
            security_deposit: 85_000,
            service_fee: 0,
            total_price: 170_000,
        });

        const excludedMultiMonths = quoteLongTermUpfront({
            monthlyRent: 90_000,
            securityDeposit: 120_000,
            monthlyCharges: 8_000,
            chargesIncluded: false,
            advanceRentMonths: 2,
        });

        expect(excludedMultiMonths).toEqual({
            monthly_rent: 90_000,
            monthly_charges: 8_000,
            charges_included: false,
            advance_rent_months: 2,
            upfront_rent: 180_000,
            upfront_charges: 16_000,
            security_deposit: 120_000,
            service_fee: 0,
            total_price: 316_000,
        });
    });
});

describe('Refund policy', () => {
    const paidBooking = {
        paidAt: '2026-06-01T10:00:00.000Z',
        totalPrice: 40_000,
        refundedAmount: 0,
        checkIn: '2026-07-10',
        guestUserId: 42,
    };

    it('returns 0 for unpaid or already refunded bookings', () => {
        expect(
            calculateRefundAmount({ ...paidBooking, paidAt: null }, 42, {
                referenceDateIso: '2026-06-15',
            }),
        ).toBe(0);

        expect(
            calculateRefundAmount({ ...paidBooking, refundedAmount: 40_000 }, 42, {
                referenceDateIso: '2026-06-15',
            }),
        ).toBe(0);
    });

    it('refunds 100% when cancelled by host or admin regardless of deadline', () => {
        expect(
            calculateRefundAmount(paidBooking, 99, {
                referenceDateIso: '2026-07-09',
            }),
        ).toBe(40_000);
    });

    it('refunds 100% at least 7 days prior and 50% afterwards for the guest', () => {
        expect(
            calculateRefundAmount(paidBooking, 42, {
                referenceDateIso: '2026-07-03',
            }),
        ).toBe(40_000);

        expect(
            calculateRefundAmount(paidBooking, 42, {
                referenceDateIso: '2026-07-04',
            }),
        ).toBe(20_000);
    });

    it('formats policy description in French', () => {
        expect(describeRefundPolicy(7, 0.5)).toContain('7 jours');
        expect(describeRefundPolicy(7, 0.5)).toContain('50 %');
    });
});

describe('State machine transitions', () => {
    it('enforces valid property workflow transitions', () => {
        expect(canPropertyTransitionTo('draft', 'pending')).toBe(true);
        expect(canPropertyTransitionTo('pending', 'published')).toBe(true);
        expect(canPropertyTransitionTo('draft', 'published')).toBe(false);
        expect(canPropertyTransitionTo('archived', 'published')).toBe(false);
        expect(isPropertyEditable('draft')).toBe(true);
        expect(isPropertyEditable('rejected')).toBe(true);
        expect(isPropertyEditable('published')).toBe(false);
    });

    it('enforces valid booking lifecycle transitions', () => {
        expect(canBookingTransitionTo('pending', 'awaiting_payment')).toBe(true);
        expect(canBookingTransitionTo('awaiting_payment', 'confirmed')).toBe(true);
        expect(canBookingTransitionTo('confirmed', 'completed')).toBe(true);
        expect(canBookingTransitionTo('declined', 'confirmed')).toBe(false);
        expect(canBookingTransitionTo('completed', 'cancelled')).toBe(false);
    });
});

describe('Date, price and slug formatting helpers', () => {
    it('handles UTC calendar dates reliably', () => {
        expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
        expect(diffInDays('2026-06-30', '2026-07-02')).toBe(2);
        expect(isValidIsoDate('2026-02-29')).toBe(false);
        expect(isValidIsoDate('2026-08-15')).toBe(true);
    });

    it('normalizes French accented slugs and cent amounts', () => {
        expect(slugify('Château d’Été — Côte d’Azur')).toBe(
            'chateau-d-ete-cote-d-azur',
        );
        expect(formatPrice(12_000)).toContain('120');
        expect(formatPrice(12_050)).toContain('120,50');
    });
});

