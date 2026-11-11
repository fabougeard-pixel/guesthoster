<?php

namespace App\Pricing;

/**
 * Price of a stay, in cents.
 */
final readonly class BookingQuote
{
    public function __construct(
        public int $nights,
        public int $pricePerNight,
        public int $cleaningFee,
        public int $serviceFee,
    ) {}

    public function lodgingTotal(): int
    {
        return $this->nights * $this->pricePerNight;
    }

    public function total(): int
    {
        return $this->lodgingTotal() + $this->cleaningFee + $this->serviceFee;
    }

    /**
     * @return array{nights: int, price_per_night: int, lodging_total: int, cleaning_fee: int, service_fee: int, total_price: int}
     */
    public function toArray(): array
    {
        return [
            'nights' => $this->nights,
            'price_per_night' => $this->pricePerNight,
            'lodging_total' => $this->lodgingTotal(),
            'cleaning_fee' => $this->cleaningFee,
            'service_fee' => $this->serviceFee,
            'total_price' => $this->total(),
        ];
    }
}
