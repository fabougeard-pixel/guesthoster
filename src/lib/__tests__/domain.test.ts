import { describe, expect, it } from 'vitest';
import {
    getPaymentMethodLabel,
    getSuggestedPaymentMethod,
} from '@/components/payment-error-fallback';
import {
    canBookingTransitionTo,
    canPropertyTransitionTo,
    isPropertyEditable,
} from '@/lib/domain/enums';
import {
    DEFAULT_PLATFORM_RENTAL_SETTINGS,
    DEFAULT_PLATFORM_SEO_SETTINGS,
    SEO_SETTINGS_KEY,
    formatLeaseDuration,
} from '@/lib/domain/platform-settings';
import {
    calculateSeasonalPaymentSchedule,
    quoteLongTermUpfront,
    quotePrice,
} from '@/lib/domain/pricing';
import {
    calculateRefundAmount,
    describeRefundPolicy,
} from '@/lib/domain/refund-policy';
import {
    addDays,
    diffInDays,
    formatDate,
    formatLongDateFr,
    formatShortDateFr,
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
            deposit_ratio: 0.6,
            deposit_percentage: 60,
            upfront_amount: 27_390,
            remaining_balance: 18_260,
            deposit_rule_label: '2 à 6 nuits : acompte de 60 %',
            deposit_description:
                'Location de 2 à 6 nuits : versement d’un acompte de 60 % du montant total à la réservation. Le solde sera réglé à l’arrivée.',
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

    it('calculates seasonal payment ratios: 100% for 1 night, 60% for 2-6 nights, 50% for 7+ nights', () => {
        // 1 nuit = 100%
        const oneNight = calculateSeasonalPaymentSchedule(1, 10_000);
        expect(oneNight.percentage).toBe(100);
        expect(oneNight.ratio).toBe(1.0);
        expect(oneNight.upfront_amount).toBe(10_000);
        expect(oneNight.remaining_balance).toBe(0);

        // 2 nuits = 60% acompte, 40% solde
        const twoNights = calculateSeasonalPaymentSchedule(2, 20_000);
        expect(twoNights.percentage).toBe(60);
        expect(twoNights.ratio).toBe(0.6);
        expect(twoNights.upfront_amount).toBe(12_000);
        expect(twoNights.remaining_balance).toBe(8_000);

        // 6 nuits = 60% acompte, 40% solde
        const sixNights = calculateSeasonalPaymentSchedule(6, 60_000);
        expect(sixNights.percentage).toBe(60);
        expect(sixNights.ratio).toBe(0.6);
        expect(sixNights.upfront_amount).toBe(36_000);
        expect(sixNights.remaining_balance).toBe(24_000);

        // 7 nuits = 50% acompte, 50% solde
        const sevenNights = calculateSeasonalPaymentSchedule(7, 70_000);
        expect(sevenNights.percentage).toBe(50);
        expect(sevenNights.ratio).toBe(0.5);
        expect(sevenNights.upfront_amount).toBe(35_000);
        expect(sevenNights.remaining_balance).toBe(35_000);

        // 14 nuits = 50% acompte, 50% solde
        const fourteenNights = calculateSeasonalPaymentSchedule(14, 100_000);
        expect(fourteenNights.percentage).toBe(50);
        expect(fourteenNights.ratio).toBe(0.5);
        expect(fourteenNights.upfront_amount).toBe(50_000);
        expect(fourteenNights.remaining_balance).toBe(50_000);
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
            upfront_amount: 170_000,
            remaining_balance: 0,
            deposit_percentage: 100,
            deposit_ratio: 1.0,
            deposit_rule_label: 'Paiement à l’entrée (100 %)',
            deposit_description:
                'Total à régler à l’entrée (loyer d’avance + caution)',
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
            upfront_amount: 316_000,
            remaining_balance: 0,
            deposit_percentage: 100,
            deposit_ratio: 1.0,
            deposit_rule_label: 'Paiement à l’entrée (100 %)',
            deposit_description:
                'Total à régler à l’entrée (loyer d’avance + caution)',
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

    it('formats lease durations cleanly in years or months', () => {
        expect(formatLeaseDuration(12)).toBe('1 an');
        expect(formatLeaseDuration(24)).toBe('2 ans');
        expect(formatLeaseDuration(36)).toBe('3 ans');
        expect(formatLeaseDuration(6)).toBe('6 mois');
        expect(formatLeaseDuration(18)).toBe('18 mois');
        expect(DEFAULT_PLATFORM_RENTAL_SETTINGS.longTermVisitFeeMode).toBe('individual');
        expect(DEFAULT_PLATFORM_RENTAL_SETTINGS.longTermWidgetButtonLabel).toBe('RESERVER CE LOGEMENT');
    });

    it('suggests viable alternative payment methods on failure (Lenaonline pattern)', () => {
        expect(getPaymentMethodLabel('card')).toBe('Carte bancaire');
        expect(getPaymentMethodLabel('paypal')).toBe('PayPal');
        expect(getPaymentMethodLabel('bank_transfer')).toBe('Virement bancaire SEPA');

        // If card fails, fallback to bank_transfer if available
        expect(getSuggestedPaymentMethod('card', ['card', 'paypal', 'bank_transfer'])).toBe('bank_transfer');
        // If card fails and only paypal is available
        expect(getSuggestedPaymentMethod('card', ['card', 'paypal'])).toBe('paypal');
        // If paypal fails, fallback to card if available
        expect(getSuggestedPaymentMethod('paypal', ['card', 'paypal', 'bank_transfer'])).toBe('card');
        // If paypal fails and only bank_transfer is available
        expect(getSuggestedPaymentMethod('paypal', ['paypal', 'bank_transfer'])).toBe('bank_transfer');
    });

    it('provides sensible default SEO settings inspired by Lenaonline', () => {
        expect(SEO_SETTINGS_KEY).toBe('platform_seo_settings');
        expect(DEFAULT_PLATFORM_SEO_SETTINGS.metaTitle).toContain('GuestHoster');
        expect(DEFAULT_PLATFORM_SEO_SETTINGS.businessType).toBe('LodgingBusiness');
        expect(DEFAULT_PLATFORM_SEO_SETTINGS.storeCountry).toBe('FR');
        expect(DEFAULT_PLATFORM_SEO_SETTINGS.robotsIndexing).toBe('index_follow');
        expect(DEFAULT_PLATFORM_SEO_SETTINGS.twitterCard).toBe('summary_large_image');
        expect(DEFAULT_PLATFORM_SEO_SETTINGS.rssAfterContent).toContain('{post_link}');
    });

    it('safely formats and calculates dates without throwing RangeError on null, empty or invalid values', () => {
        expect(formatDate(null)).toBe('');
        expect(formatDate(undefined)).toBe('');
        expect(formatDate('')).toBe('');
        expect(formatDate('invalid-date')).toBe('');
        expect(formatDate('2026-11-20')).toContain('2026');

        expect(formatLongDateFr(null)).toBe('');
        expect(formatLongDateFr('')).toBe('');
        expect(formatLongDateFr('2026-11-20')).toContain('novembre');

        expect(formatShortDateFr(null)).toBe('');
        expect(formatShortDateFr('')).toBe('');
        expect(formatShortDateFr('2026-11-20')).toContain('nov.');

        expect(diffInDays(null, '2026-11-20')).toBe(0);
        expect(diffInDays('', '2026-11-20')).toBe(0);
        expect(diffInDays('2026-11-10', null)).toBe(0);
        expect(diffInDays('2026-11-10', '2026-11-15')).toBe(5);

        expect(addDays('', 3)).toBeTruthy();
        expect(addDays('2026-11-10', 2)).toBe('2026-11-12');
    });

    it('suggests bank transfer when credit card fails', () => {
        expect(
            getSuggestedPaymentMethod('card', [
                'card',
                'paypal',
                'bank_transfer',
            ]),
        ).toBe('bank_transfer');
        expect(getPaymentMethodLabel('bank_transfer')).toBe(
            'Virement bancaire SEPA',
        );
    });
});


