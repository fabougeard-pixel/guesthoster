<?php

namespace Database\Seeders;

use App\Enums\AmenityCategory;
use App\Models\Amenity;
use Illuminate\Database\Seeder;

/**
 * Reference data: amenities a host can tick on a listing. Idempotent.
 */
class AmenitySeeder extends Seeder
{
    public function run(): void
    {
        $amenities = [
            AmenityCategory::Essentials->value => [
                'wifi' => ['Wi-Fi', 'wifi'],
                'heating' => ['Chauffage', 'flame'],
                'air-conditioning' => ['Climatisation', 'snowflake'],
                'washing-machine' => ['Lave-linge', 'washing-machine'],
                'linen' => ['Linge de maison fourni', 'bed-double'],
                'workspace' => ['Espace de travail', 'laptop'],
            ],
            AmenityCategory::Kitchen->value => [
                'kitchen' => ['Cuisine équipée', 'cooking-pot'],
                'dishwasher' => ['Lave-vaisselle', 'utensils'],
                'coffee-maker' => ['Machine à café', 'coffee'],
                'microwave' => ['Micro-ondes', 'microwave'],
            ],
            AmenityCategory::Comfort->value => [
                'tv' => ['Télévision', 'tv'],
                'elevator' => ['Ascenseur', 'arrow-up-down'],
                'pets-allowed' => ['Animaux acceptés', 'paw-print'],
                'accessible' => ['Accessible PMR', 'accessibility'],
            ],
            AmenityCategory::Outdoor->value => [
                'parking' => ['Parking gratuit', 'car'],
                'balcony' => ['Balcon ou terrasse', 'sun'],
                'garden' => ['Jardin', 'trees'],
                'pool' => ['Piscine', 'waves'],
                'bbq' => ['Barbecue', 'flame-kindling'],
            ],
            AmenityCategory::Safety->value => [
                'smoke-detector' => ['Détecteur de fumée', 'siren'],
                'first-aid-kit' => ['Trousse de secours', 'cross'],
                'fire-extinguisher' => ['Extincteur', 'fire-extinguisher'],
            ],
        ];

        $sortOrder = 0;

        foreach ($amenities as $category => $items) {
            foreach ($items as $slug => [$name, $icon]) {
                Amenity::query()->updateOrCreate(['slug' => $slug], [
                    'name' => $name,
                    'category' => $category,
                    'icon' => $icon,
                    'sort_order' => ++$sortOrder,
                ]);
            }
        }
    }
}
