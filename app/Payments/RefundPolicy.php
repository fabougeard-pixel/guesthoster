<?php

namespace App\Payments;

use App\Models\Booking;
use App\Models\User;
use Illuminate\Container\Attributes\Config;

/**
 * Amount given back when a paid booking is cancelled (in cents).
 */
class RefundPolicy
{
    public function __construct(
        #[Config('booking.full_refund_days')]
        private int $fullRefundDays,
        #[Config('booking.late_refund_rate')]
        private float $lateRefundRate,
    ) {}

    public function amountFor(Booking $booking, User $cancelledBy): int
    {
        if ($booking->paid_at === null) {
            return 0;
        }

        $paid = $booking->total_price - $booking->refunded_amount;

        if ($cancelledBy->isNot($booking->guest)) {
            return $paid;
        }

        $daysBeforeArrival = (int) today()->diffInDays($booking->check_in, false);

        return $daysBeforeArrival >= $this->fullRefundDays
            ? $paid
            : (int) round($paid * $this->lateRefundRate);
    }

    /**
     * Human readable summary of the rules, for the booking pages.
     */
    public function summary(): string
    {
        return sprintf(
            'Remboursement intégral en cas d’annulation jusqu’à %d jours avant l’arrivée, puis %d %% du montant payé. Si l’hôte annule, vous êtes remboursé intégralement.',
            $this->fullRefundDays,
            (int) round($this->lateRefundRate * 100),
        );
    }
}
