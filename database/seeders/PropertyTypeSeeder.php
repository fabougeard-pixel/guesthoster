<?php

namespace Database\Seeders;

use App\Models\PropertyType;
use Illuminate\Database\Seeder;

/**
 * Reference data: the default property types. Idempotent; admins add the others.
 */
class PropertyTypeSeeder extends Seeder
{
    public function run(): void
    {
        $types = [
            'appartement' => 'Appartement',
            'maison' => 'Maison',
            'gite' => 'Gîte',
            'studio' => 'Studio',
            'chambre' => 'Chambre',
            'villa' => 'Villa',
        ];

        $sortOrder = 0;

        foreach ($types as $slug => $name) {
            PropertyType::query()->firstOrCreate(['slug' => $slug], ['name' => $name, 'sort_order' => ++$sortOrder]);
        }
    }
}
