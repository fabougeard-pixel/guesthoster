import { diffInDays, todayIso } from '@/lib/format';

export type RefundInput = {
    paidAt: Date | string | null;
    totalPrice: number;
    refundedAmount: number;
    checkIn: string;
    guestUserId: number;
};

/**
 * Calcule le remboursement (en centimes) selon qui annule et le délai avant l'arrivée.
 */
export function calculateRefundAmount(
    booking: RefundInput,
    cancelledByUserId: number,
    options: {
        fullRefundDays?: number;
        lateRefundRate?: number;
        referenceDateIso?: string;
    } = {},
): number {
    if (!booking.paidAt) {
        return 0;
    }

    const paid = Math.max(0, booking.totalPrice - booking.refundedAmount);
    if (paid === 0) {
        return 0;
    }

    if (cancelledByUserId !== booking.guestUserId) {
        return paid;
    }

    const fullRefundDays = options.fullRefundDays ?? 7;
    const lateRefundRate = options.lateRefundRate ?? 0.5;
    const today = options.referenceDateIso ?? todayIso();
    const daysBeforeArrival = diffInDays(today, booking.checkIn);

    if (daysBeforeArrival >= fullRefundDays) {
        return paid;
    }

    return Math.round(paid * lateRefundRate);
}

export function describeRefundPolicy(
    fullRefundDays = 7,
    lateRefundRate = 0.5,
): string {
    const latePercent = Math.round(lateRefundRate * 100);
    return `Annulation gratuite jusqu’à ${fullRefundDays} jours avant l’arrivée, puis remboursement à ${latePercent} %.`;
}

