import { formatPrice, plural } from '@/lib/format';
import { cn } from '@/lib/utils';

export type PriceLines = {
    nights: number;
    price_per_night: number;
    cleaning_fee: number;
    service_fee: number;
    total_price: number;
};

/**
 * Détail du prix d'un séjour (montants en centimes).
 */
export function PriceBreakdown({
    price,
    totalLabel = 'Total',
    className,
}: {
    price: PriceLines;
    totalLabel?: string;
    className?: string;
}) {
    return (
        <dl className={cn('flex flex-col gap-2 text-sm', className)}>
            <div className="flex justify-between gap-4">
                <dt>
                    {formatPrice(price.price_per_night)} ×{' '}
                    {plural(price.nights, 'nuit')}
                </dt>
                <dd>{formatPrice(price.nights * price.price_per_night)}</dd>
            </div>
            {price.cleaning_fee > 0 && (
                <div className="flex justify-between gap-4">
                    <dt>Frais de ménage</dt>
                    <dd>{formatPrice(price.cleaning_fee)}</dd>
                </div>
            )}
            {price.service_fee > 0 && (
                <div className="flex justify-between gap-4">
                    <dt>Frais de service</dt>
                    <dd>{formatPrice(price.service_fee)}</dd>
                </div>
            )}
            <div className="flex justify-between gap-4 border-t border-zinc-200 pt-2 font-semibold dark:border-zinc-800">
                <dt>{totalLabel}</dt>
                <dd>{formatPrice(price.total_price)}</dd>
            </div>
        </dl>
    );
}
