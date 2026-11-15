import type { RentalDuration } from '@/lib/domain/enums';
import { calculateSeasonalPaymentSchedule } from '@/lib/domain/pricing';
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
    upfront_amount?: number;
    remaining_balance?: number;
    deposit_percentage?: number;
    deposit_description?: string;
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
            {nights > 0 && (
                <div className="mt-2 rounded-2xl border border-primary-200/80 bg-primary-50/60 p-3 text-xs dark:border-primary-900/60 dark:bg-primary-950/30">
                    {(() => {
                        const schedule =
                            price.deposit_percentage !== undefined &&
                            price.upfront_amount !== undefined &&
                            price.remaining_balance !== undefined
                                ? {
                                      percentage: price.deposit_percentage,
                                      upfront_amount: price.upfront_amount,
                                      remaining_balance: price.remaining_balance,
                                      description:
                                          price.deposit_description ??
                                          (price.deposit_percentage === 100
                                              ? 'Location pour 1 nuit : 100 % à la réservation.'
                                              : `Acompte de ${price.deposit_percentage} % à la réservation, solde à l’arrivée.`),
                                  }
                                : calculateSeasonalPaymentSchedule(
                                      nights,
                                      price.total_price,
                                  );

                        return (
                            <>
                                <div className="flex items-center justify-between font-semibold text-primary-950 dark:text-primary-100">
                                    <span>
                                        {schedule.percentage === 100
                                            ? 'Paiement à la réservation (100 %)'
                                            : `Acompte à payer aujourd’hui (${schedule.percentage} %)`}
                                    </span>
                                    <span className="text-sm font-bold text-primary-700 dark:text-primary-300">
                                        {formatPrice(schedule.upfront_amount)}
                                    </span>
                                </div>

                                {schedule.remaining_balance > 0 && (
                                    <div className="mt-1 flex items-center justify-between text-zinc-600 dark:text-zinc-400">
                                        <span>
                                            Solde à régler à l’arrivée (
                                            {100 - schedule.percentage} %)
                                        </span>
                                        <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                                            {formatPrice(
                                                schedule.remaining_balance,
                                            )}
                                        </span>
                                    </div>
                                )}

                                <p className="mt-2 border-t border-primary-200/60 pt-1.5 text-[11px] text-zinc-500 dark:border-primary-900/40 dark:text-zinc-400">
                                    {schedule.description}
                                </p>
                            </>
                        );
                    })()}
                </div>
            )}
        </dl>
    );
}

