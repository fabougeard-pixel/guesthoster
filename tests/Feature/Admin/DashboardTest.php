<?php

use App\Models\Booking;
use App\Models\Property;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('the dashboard counts paid stays and ranks hosts by volume', function () {
    $bigHost = Property::factory()->published()->create();
    $smallHost = Property::factory()->published()->create();
    Booking::factory()->for($bigHost)->confirmed()->count(2)->create(['paid_at' => now(), 'total_price' => 50000, 'service_fee' => 4000]);
    Booking::factory()->for($smallHost)->confirmed()->create(['paid_at' => now(), 'total_price' => 20000, 'service_fee' => 1500]);
    Booking::factory()->for($smallHost)->cancelled()->create(['paid_at' => now(), 'total_price' => 90000]);
    Property::factory()->pending()->create();

    $this->actingAs(User::factory()->admin()->create())
        ->get(route('admin.dashboard'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/dashboard')
            ->where('stats.published', 2)
            ->where('stats.pending_review', 1)
            ->where('revenue.volume', 120000)
            ->where('revenue.fees', 9500)
            ->has('revenue.months', 6)
            ->has('topHosts', 2)
            ->where('topHosts.0.id', $bigHost->user_id)
            ->where('topHosts.0.stays', 2)
            ->has('reviewQueue', 1)
        );
});
