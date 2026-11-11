import { diffInDays } from '@/lib/format';

export type PriceQuote = {
    nights: number;
    price_per_night: number;
    cleaning_fee: number;
    lodging_total: number;
    service_fee: number;
    total_price: number;
};

export type LongTermPriceQuote = {
    monthly_rent: number;
    monthly_charges: number;
    charges_included: boolean;
    advance_rent_months: number;
    upfront_rent: number;
    upfront_charges: number;
    security_deposit: number;
    service_fee: number;
    total_price: number;
};

/**
 * Calcul exact en centimes pour une location longue durée à l'entrée :
 * - Charges comprises : (loyer × mois d'avance) + caution (sans charges)
 * - Sans charges      : (loyer × mois d'avance) + (charges × mois d'avance) + caution
 */
export function quoteLongTermUpfront({
    monthlyRent,
    securityDeposit,
    monthlyCharges,
    chargesIncluded,
    advanceRentMonths = 1,
}: {
    monthlyRent: number;
    securityDeposit: number;
    monthlyCharges: number;
    chargesIncluded: boolean;
    advanceRentMonths?: number;
}): LongTermPriceQuote {
    const months = Math.max(1, Math.trunc(advanceRentMonths));
    const safeRent = Math.max(0, Math.round(monthlyRent));
    const safeDeposit = Math.max(0, Math.round(securityDeposit));
    const safeCharges = chargesIncluded ? 0 : Math.max(0, Math.round(monthlyCharges));

    const upfrontRent = safeRent * months;
    const upfrontCharges = safeCharges * months;
    const totalPrice = upfrontRent + upfrontCharges + safeDeposit;

    return {
        monthly_rent: safeRent,
        monthly_charges: chargesIncluded ? 0 : Math.max(0, Math.round(monthlyCharges)),
        charges_included: chargesIncluded,
        advance_rent_months: months,
        upfront_rent: upfrontRent,
        upfront_charges: upfrontCharges,
        security_deposit: safeDeposit,
        service_fee: 0,
        total_price: totalPrice,
    };
}

/**
 * Calcul exact en centimes identique à PricingCalculator.php :
 * subtotal = nights * pricePerNight + cleaningFee
 * serviceFee = Math.round(subtotal * serviceFeeRate)
 */
export function quotePrice({
    pricePerNight,
    cleaningFee,
    checkIn,
    checkOut,
    serviceFeeRate = 0.1,
}: {
    pricePerNight: number;
    cleaningFee: number;
    checkIn: string;
    checkOut: string;
    serviceFeeRate?: number;
}): PriceQuote {
    const nights = Math.max(0, diffInDays(checkIn, checkOut));
    const lodgingTotal = nights * pricePerNight;
    const subtotal = lodgingTotal + cleaningFee;
    const serviceFee = Math.round(subtotal * serviceFeeRate);

    return {
        nights,
        price_per_night: pricePerNight,
        cleaning_fee: cleaningFee,
        lodging_total: lodgingTotal,
        service_fee: serviceFee,
        total_price: subtotal + serviceFee,
    };
}

