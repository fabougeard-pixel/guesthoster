<?php

use App\Models\Property;
use App\Pricing\PricingCalculator;
use Carbon\CarbonImmutable;

test('the quote adds nights, cleaning fee and the service fee on both', function () {
    $property = new Property(['price_per_night' => 8000, 'cleaning_fee' => 2500]);

    $quote = (new PricingCalculator(0.1))->quote($property, CarbonImmutable::parse('2027-04-01'), CarbonImmutable::parse('2027-04-04'));

    expect($quote->toArray())->toBe([
        'nights' => 3,
        'price_per_night' => 8000,
        'lodging_total' => 24000,
        'cleaning_fee' => 2500,
        'service_fee' => 2650,
        'total_price' => 29150,
    ]);
});

test('the service fee is rounded to the cent', function () {
    $property = new Property(['price_per_night' => 3333, 'cleaning_fee' => 0]);

    $quote = (new PricingCalculator(0.125))->quote($property, CarbonImmutable::parse('2027-04-01'), CarbonImmutable::parse('2027-04-02'));

    expect($quote->serviceFee)->toBe(417);
});
