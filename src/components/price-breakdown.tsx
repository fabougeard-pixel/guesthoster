import type { RentalDuration } from '@/lib/domain/enums';
import { formatPrice, plural } from '@/lib/format';
import { cn } from '@/lib/utils';

export type PriceLines = {
    rental_duration?: RentalDuration;
    nights?: number;
    price_per_night?: number;
    cleaning_fee?: number;
    service_fee?: number;
    monthly_rent?: number;
    security_deposit?: number;
    monthly_charges?: number;
    charges_included?: boolean;
    advance_rent_months?: number;
    total_price: number;
};

export function PriceBreakdown({
    price,
    totalLabel = 'Total',
    className,
}: {
    price: PriceLines;
    totalLabel?: string;
    className?: string;
}) {
    if (price.rental_duration === 'long_term') {
        const months = Math.max(1, price.advance_rent_months ?? 1);
        const monthlyRent = price.monthly_rent ?? 0;
        const chargesIncluded = Boolean(price.charges_included);
        const monthlyCharges = chargesIncluded ? 0 : (price.monthly_charges ?? 0);
        const deposit = price.security_deposit ?? 0;
        const serviceFee = price.service_fee ?? 0;

        return (
            <dl className={cn('flex flex-col gap-2 text-sm', className)}>
                <div className="flex justify-between gap-4">
                    <dt>
                        {months === 1
                            ? 'Loyer (1 mois)'
                            : `Loyer (${months} mois × ${formatPrice(monthlyRent)})`}
                    </dt>
                    <dd>{formatPrice(monthlyRent * months)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                    <dt>
                        {chargesIncluded
                            ? 'Charges'
                            : months > 1 && monthlyCharges > 0
                              ? `Charges (${months} mois × ${formatPrice(monthlyCharges)})`
                              : 'Charges mensuelles'}
                    </dt>
                    <dd>
                        {chargesIncluded
                            ? 'Comprises'
                            : formatPrice(monthlyCharges * months)}
                    </dd>
                </div>
                <div className="flex justify-between gap-4">
                    <dt>Caution (hors charges)</dt>
                    <dd>{formatPrice(deposit)}</dd>
                </div>
                {serviceFee > 0 && (
                    <div className="flex justify-between gap-4">
                        <dt>Frais de service</dt>
                        <dd>{formatPrice(serviceFee)}</dd>
                    </div>
                )}
                <div className="flex justify-between gap-4 border-t border-zinc-200 pt-2 font-semibold dark:border-zinc-800">
                    <dt>{totalLabel}</dt>
                    <dd>{formatPrice(price.total_price)}</dd>
                </div>
            </dl>
        );
    }

    const nights = price.nights ?? 0;
    const pricePerNight = price.price_per_night ?? 0;
    const cleaningFee = price.cleaning_fee ?? 0;
    const serviceFee = price.service_fee ?? 0;

    return (
        <dl className={cn('flex flex-col gap-2 text-sm', className)}>
            <div className="flex justify-between gap-4">
                <dt>
                    {formatPrice(pricePerNight)} × {plural(nights, 'nuit')}
                </dt>
                <dd>{formatPrice(nights * pricePerNight)}</dd>
            </div>
            {cleaningFee > 0 && (
                <div className="flex justify-between gap-4">
                    <dt>Frais de ménage</dt>
                    <dd>{formatPrice(cleaningFee)}</dd>
                </div>
            )}
            {serviceFee > 0 && (
                <div className="flex justify-between gap-4">
                    <dt>Frais de service</dt>
                    <dd>{formatPrice(serviceFee)}</dd>
                </div>
            )}
            <div className="flex justify-between gap-4 border-t border-zinc-200 pt-2 font-semibold dark:border-zinc-800">
                <dt>{totalLabel}</dt>
                <dd>{formatPrice(price.total_price)}</dd>
            </div>
        </dl>
    );
}

