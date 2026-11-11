import { diffInDays } from '@/lib/format';

export type PriceQuote = {
    nights: number;
    price_per_night: number;
    cleaning_fee: number;
    lodging_total: number;
    service_fee: number;
    total_price: number;
};

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

