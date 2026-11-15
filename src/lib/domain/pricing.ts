import { diffInDays } from '@/lib/format';

export type SeasonalPaymentSchedule = {
    ratio: number;
    percentage: number;
    upfront_amount: number;
    remaining_balance: number;
    rule_label: string;
    description: string;
};

export type PriceQuote = {
    nights: number;
    price_per_night: number;
    cleaning_fee: number;
    lodging_total: number;
    service_fee: number;
    total_price: number;
    upfront_amount: number;
    remaining_balance: number;
    deposit_percentage: number;
    deposit_ratio: number;
    deposit_rule_label: string;
    deposit_description: string;
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
    upfront_amount: number;
    remaining_balance: number;
    deposit_percentage: number;
    deposit_ratio: number;
    deposit_rule_label: string;
    deposit_description: string;
};

/**
 * Ratios de paiement pour la location saisonnière :
 * - 1 nuit           : 100 % du montant total à l'avance.
 * - 2 à 6 nuits      : acompte de 60 % à la réservation, solde à l'arrivée.
 * - 7 nuits ou plus  : acompte de 50 % à la réservation, solde à l'arrivée.
 */
export function calculateSeasonalPaymentSchedule(
    nights: number,
    totalPrice: number,
): SeasonalPaymentSchedule {
    const safeNights = Math.max(1, Math.trunc(nights));
    const safeTotal = Math.max(0, Math.round(totalPrice));

    let ratio = 1.0;
    let percentage = 100;
    let ruleLabel = '1 nuit : 100 % à la réservation';
    let description =
        'Location pour 1 nuit : paiement de 100 % du montant total de la réservation à l’avance.';

    if (safeNights === 1) {
        ratio = 1.0;
        percentage = 100;
        ruleLabel = '1 nuit : 100 % à la réservation';
        description =
            'Location pour 1 nuit : paiement de 100 % du montant total de la réservation à l’avance.';
    } else if (safeNights >= 2 && safeNights <= 6) {
        ratio = 0.6;
        percentage = 60;
        ruleLabel = '2 à 6 nuits : acompte de 60 %';
        description =
            'Location de 2 à 6 nuits : versement d’un acompte de 60 % du montant total à la réservation. Le solde sera réglé à l’arrivée.';
    } else {
        ratio = 0.5;
        percentage = 50;
        ruleLabel = '7 nuits ou plus : acompte de 50 %';
        description =
            'Location à partir de 7 nuits (1 semaine ou plus) : versement d’un acompte de 50 % du montant total à la réservation. Le solde sera réglé à l’arrivée.';
    }

    const upfrontAmount = Math.round(safeTotal * ratio);
    const remainingBalance = Math.max(0, safeTotal - upfrontAmount);

    return {
        ratio,
        percentage,
        upfront_amount: upfrontAmount,
        remaining_balance: remainingBalance,
        rule_label: ruleLabel,
        description,
    };
}

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
        upfront_amount: totalPrice,
        remaining_balance: 0,
        deposit_percentage: 100,
        deposit_ratio: 1.0,
        deposit_rule_label: 'Paiement à l’entrée (100 %)',
        deposit_description: 'Total à régler à l’entrée (loyer d’avance + caution)',
    };
}

/**
 * Calcul exact en centimes identique à PricingCalculator.php :
 * subtotal = nights * pricePerNight + cleaningFee
 * serviceFee = Math.round(subtotal * serviceFeeRate)
 * + Ratios d'acompte saisonnier (100% si 1 nuit, 60% de 2 à 6 nuits, 50% dès 7 nuits)
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
    const totalPrice = subtotal + serviceFee;
    const schedule = calculateSeasonalPaymentSchedule(nights, totalPrice);

    return {
        nights,
        price_per_night: pricePerNight,
        cleaning_fee: cleaningFee,
        lodging_total: lodgingTotal,
        service_fee: serviceFee,
        total_price: totalPrice,
        upfront_amount: schedule.upfront_amount,
        remaining_balance: schedule.remaining_balance,
        deposit_percentage: schedule.percentage,
        deposit_ratio: schedule.ratio,
        deposit_rule_label: schedule.rule_label,
        deposit_description: schedule.description,
    };
}

