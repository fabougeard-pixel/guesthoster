<?php

namespace Database\Seeders;

use App\Models\Amenity;
use App\Models\BlockedPeriod;
use App\Models\Booking;
use App\Models\City;
use App\Models\Message;
use App\Models\Property;
use App\Models\Review;
use App\Models\User;
use Database\Factories\ReviewFactory;
use Illuminate\Database\Seeder;

/**
 * Demo listings and bookings for local development. Requires the reference
 * seeders and the demo accounts created by DatabaseSeeder.
 */
class DemoSeeder extends Seeder
{
    public function run(): void
    {
        $cities = City::query()->active()->get();
        $amenityIds = Amenity::query()->pluck('id');
        $demoHost = User::query()->where('email', 'hote@guesthoster.test')->firstOrFail();
        $demoGuest = User::query()->where('email', 'voyageur@guesthoster.test')->firstOrFail();

        $hosts = User::factory()->host()->count(6)->create()->push($demoHost);
        $guests = User::factory()->count(10)->create()->push($demoGuest);

        $createListing = function (User $host, string $state = 'published') use ($cities, $amenityIds): Property {
            $factory = Property::factory()->for($host, 'owner')->for($cities->random());

            $factory = match ($state) {
                'pending' => $factory->pending(),
                'rejected' => $factory->rejected(),
                default => $factory->published(),
            };

            $property = $factory->withImages(fake()->numberBetween(3, 6))->create();

            $property->amenities()->attach($amenityIds->random(fake()->numberBetween(5, 12)));

            return $property;
        };

        $published = $hosts->flatMap(fn (User $host) => collect(range(1, fake()->numberBetween(2, 5)))
            ->map(fn () => $createListing($host)));

        $createListing($demoHost, 'pending');
        $createListing($demoHost, 'rejected');
        Property::factory()->for($demoHost, 'owner')->for($cities->random())->create();

        foreach ($published as $index => $property) {
            $guest = $guests->random();

            match ($index % 4) {
                0 => Booking::factory()->for($property)->for($guest, 'guest')->confirmed()->create([
                    'paid_at' => $paidAt = now()->subDays(fake()->numberBetween(0, 150)),
                    'confirmed_at' => $paidAt,
                ]),
                1 => Review::factory()
                    ->when($index % 3 === 0, fn (ReviewFactory $factory) => $factory->replied())
                    ->create(['booking_id' => Booking::factory()->for($property)->for($guest, 'guest')->completed()])
                    ->property->refreshRating(),
                2 => Booking::factory()->for($property)->for($guest, 'guest')->create(),
                default => BlockedPeriod::factory()->for($property)->create(),
            };
        }

        $demoGuest->favorites()->attach(
            $published->random(min(3, $published->count()))->mapWithKeys(fn (Property $property) => [$property->id => ['created_at' => now()]]),
        );

        $demoHostListing = $published->first(fn (Property $property) => $property->isOwnedBy($demoHost));

        if ($demoHostListing) {
            $demoBooking = Booking::factory()->for($demoHostListing)->for($demoGuest, 'guest')
                ->between(today()->addDays(120)->toDateString(), today()->addDays(124)->toDateString())
                ->create();

            Message::factory()->for($demoBooking)->read()->create(['body' => 'Bonjour ! Nous arriverons vers 18 h, est-ce possible de déposer les bagages plus tôt ?']);
            Message::factory()->for($demoBooking)->create([
                'user_id' => $demoHost->id,
                'body' => 'Bonjour, bien sûr : la consigne à bagages est accessible dès midi.',
            ]);
        }
    }
}
