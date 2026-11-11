<?php

namespace App\Enums;

use App\Enums\Concerns\HasOptions;

/**
 * Booking lifecycle.
 *
 * - instant mode : awaiting_payment → confirmed
 * - request mode : pending → awaiting_payment → confirmed (or declined by the host)
 * - any active booking may be cancelled ; unpaid ones expire ; confirmed stays end up completed.
 */
enum BookingStatus: string
{
    use HasOptions;

    case Pending = 'pending';
    case AwaitingPayment = 'awaiting_payment';
    case Confirmed = 'confirmed';
    case Declined = 'declined';
    case Cancelled = 'cancelled';
    case Expired = 'expired';
    case Completed = 'completed';

    public function label(): string
    {
        return match ($this) {
            self::Pending => 'En attente de l’hôte',
            self::AwaitingPayment => 'En attente de paiement',
            self::Confirmed => 'Confirmée',
            self::Declined => 'Refusée',
            self::Cancelled => 'Annulée',
            self::Expired => 'Expirée',
            self::Completed => 'Terminée',
        };
    }

    /**
     * Statuses reachable from the current one.
     *
     * @return list<self>
     */
    public function allowedTransitions(): array
    {
        return match ($this) {
            self::Pending => [self::AwaitingPayment, self::Declined, self::Cancelled, self::Expired],
            self::AwaitingPayment => [self::Confirmed, self::Cancelled, self::Expired],
            self::Confirmed => [self::Cancelled, self::Completed],
            self::Declined, self::Cancelled, self::Expired, self::Completed => [],
        };
    }

    public function canTransitionTo(self $status): bool
    {
        return in_array($status, $this->allowedTransitions(), true);
    }

    /**
     * Statuses that hold the dates and prevent overlapping bookings.
     *
     * @return list<self>
     */
    public static function blocking(): array
    {
        return [self::Pending, self::AwaitingPayment, self::Confirmed];
    }

    public function isFinal(): bool
    {
        return $this->allowedTransitions() === [];
    }
}
