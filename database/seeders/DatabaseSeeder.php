<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Model events stay enabled: slugs and booking references are generated on creation.
     *
     * Reference data everywhere. Outside production: demo host and guest
     * accounts (mot de passe : "password") and demo listings. The demo admin
     * only exists locally and in tests, never on a reachable server (staging
     * included): there, use `php artisan users:create-admin`.
     */
    public function run(): void
    {
        $this->call([CountryCitySeeder::class, AmenitySeeder::class, PropertyTypeSeeder::class]);

        if (app()->isProduction()) {
            return;
        }

        if (app()->environment('local', 'testing')) {
            User::factory()->admin()->create([
                'name' => 'Admin GuestHoster',
                'email' => 'admin@guesthoster.test',
            ]);
        }

        User::factory()->host()->create([
            'name' => 'Hôte Démo',
            'email' => 'hote@guesthoster.test',
        ]);

        User::factory()->create([
            'name' => 'Voyageur Démo',
            'email' => 'voyageur@guesthoster.test',
        ]);

        $this->call(DemoSeeder::class);
    }
}
