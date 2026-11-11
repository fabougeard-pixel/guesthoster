<?php

namespace App\Pricing;

use App\Models\Property;
use Carbon\CarbonInterface;
use Illuminate\Container\Attributes\Config;

/**
 * Single source of truth for stay prices: nights × nightly rate, cleaning fee,
 * then the platform service fee on top of both.
 */
class PricingCalculator
{
    public function __construct(
        #[Config('booking.service_fee_rate')]
        public readonly float $serviceFeeRate,
    ) {}

    public function quote(Property $property, CarbonInterface $checkIn, CarbonInterface $checkOut): BookingQuote
    {
        $nights = (int) $checkIn->diffInDays($checkOut);
        $subtotal = $nights * $property->price_per_night + $property->cleaning_fee;

        return new BookingQuote(
            nights: $nights,
            pricePerNight: $property->price_per_night,
            cleaningFee: $property->cleaning_fee,
            serviceFee: (int) round($subtotal * $this->serviceFeeRate),
        );
    }
}
