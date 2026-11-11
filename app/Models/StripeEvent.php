<?php

namespace App\Models;

use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\WithoutIncrementing;
use Illuminate\Database\Eloquent\Attributes\WithoutTimestamps;
use Illuminate\Database\Eloquent\Model;

/**
 * Stripe webhook events already handled, so that retried deliveries are ignored.
 *
 * @property string $id
 * @property string $type
 * @property CarbonImmutable $processed_at
 */
#[Fillable(['id', 'type', 'processed_at'])]
#[WithoutIncrementing]
#[WithoutTimestamps]
class StripeEvent extends Model
{
    protected $keyType = 'string';

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return ['processed_at' => 'datetime'];
    }
}
