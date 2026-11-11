<?php

namespace App\Enums;

use App\Enums\Concerns\HasOptions;

/**
 * Moderation lifecycle of a listing: draft → pending → published | rejected, then archived.
 * An admin may also take a published listing down (published → rejected).
 */
enum PropertyStatus: string
{
    use HasOptions;

    case Draft = 'draft';
    case Pending = 'pending';
    case Published = 'published';
    case Rejected = 'rejected';
    case Archived = 'archived';

    public function label(): string
    {
        return match ($this) {
            self::Draft => 'Brouillon',
            self::Pending => 'En attente de validation',
            self::Published => 'Publié',
            self::Rejected => 'Refusé',
            self::Archived => 'Archivé',
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
            self::Draft, self::Rejected => [self::Pending, self::Archived],
            self::Pending => [self::Published, self::Rejected, self::Draft],
            self::Published => [self::Archived, self::Draft, self::Rejected],
            self::Archived => [self::Draft],
        };
    }

    public function canTransitionTo(self $status): bool
    {
        return in_array($status, $this->allowedTransitions(), true);
    }

    /**
     * Whether the host may edit the listing without going back to moderation.
     */
    public function isEditable(): bool
    {
        return in_array($this, [self::Draft, self::Rejected], true);
    }
}
