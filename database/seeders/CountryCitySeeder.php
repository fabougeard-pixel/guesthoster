<?php

namespace Database\Seeders;

use App\Models\Country;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/**
 * Reference data: destinations offered on the platform. Idempotent.
 */
class CountryCitySeeder extends Seeder
{
    public function run(): void
    {
        $countries = [
            [
                'name' => 'France',
                'code' => 'FR',
                'flag_emoji' => '🇫🇷',
                'is_active' => true,
                'sort_order' => 1,
                'cities' => [
                    ['name' => 'Paris', 'is_popular' => true, 'sort_order' => 1, 'latitude' => 48.8566, 'longitude' => 2.3522],
                    ['name' => 'Lyon', 'is_popular' => true, 'sort_order' => 2, 'latitude' => 45.7640, 'longitude' => 4.8357],
                    ['name' => 'Marseille', 'is_popular' => true, 'sort_order' => 3, 'latitude' => 43.2965, 'longitude' => 5.3698],
                    ['name' => 'Nice', 'is_popular' => true, 'sort_order' => 4, 'latitude' => 43.7102, 'longitude' => 7.2620],
                    ['name' => 'Bordeaux', 'is_popular' => true, 'sort_order' => 5, 'latitude' => 44.8378, 'longitude' => -0.5792],
                    ['name' => 'Toulouse', 'is_popular' => true, 'sort_order' => 6, 'latitude' => 43.6047, 'longitude' => 1.4442],
                    ['name' => 'Strasbourg', 'is_popular' => false, 'sort_order' => 7, 'latitude' => 48.5734, 'longitude' => 7.7521],
                    ['name' => 'Lille', 'is_popular' => false, 'sort_order' => 8, 'latitude' => 50.6292, 'longitude' => 3.0573],
                    ['name' => 'Nantes', 'is_popular' => false, 'sort_order' => 9, 'latitude' => 47.2184, 'longitude' => -1.5536],
                    ['name' => 'Cannes', 'is_popular' => false, 'sort_order' => 10, 'latitude' => 43.5528, 'longitude' => 7.0174],
                ],
            ],
            [
                'name' => 'Espagne',
                'code' => 'ES',
                'flag_emoji' => '🇪🇸',
                'is_active' => true,
                'sort_order' => 2,
                'cities' => [
                    ['name' => 'Madrid', 'is_popular' => true, 'sort_order' => 1, 'latitude' => 40.4168, 'longitude' => -3.7038],
                    ['name' => 'Barcelone', 'is_popular' => true, 'sort_order' => 2, 'latitude' => 41.3851, 'longitude' => 2.1734],
                    ['name' => 'Séville', 'is_popular' => true, 'sort_order' => 3, 'latitude' => 37.3886, 'longitude' => -5.9823],
                    ['name' => 'Valence', 'is_popular' => false, 'sort_order' => 4, 'latitude' => 39.4699, 'longitude' => -0.3763],
                    ['name' => 'Bilbao', 'is_popular' => false, 'sort_order' => 5, 'latitude' => 43.2627, 'longitude' => -2.9253],
                    ['name' => 'Malaga', 'is_popular' => false, 'sort_order' => 6, 'latitude' => 36.7213, 'longitude' => -4.4214],
                    ['name' => 'Grenade', 'is_popular' => false, 'sort_order' => 7, 'latitude' => 37.1773, 'longitude' => -3.5986],
                ],
            ],
            [
                'name' => 'Italie',
                'code' => 'IT',
                'flag_emoji' => '🇮🇹',
                'is_active' => true,
                'sort_order' => 3,
                'cities' => [
                    ['name' => 'Rome', 'is_popular' => true, 'sort_order' => 1, 'latitude' => 41.9028, 'longitude' => 12.4964],
                    ['name' => 'Milan', 'is_popular' => true, 'sort_order' => 2, 'latitude' => 45.4642, 'longitude' => 9.1900],
                    ['name' => 'Florence', 'is_popular' => true, 'sort_order' => 3, 'latitude' => 43.7696, 'longitude' => 11.2558],
                    ['name' => 'Venise', 'is_popular' => true, 'sort_order' => 4, 'latitude' => 45.4408, 'longitude' => 12.3155],
                    ['name' => 'Naples', 'is_popular' => false, 'sort_order' => 5, 'latitude' => 40.8518, 'longitude' => 14.2681],
                    ['name' => 'Turin', 'is_popular' => false, 'sort_order' => 6, 'latitude' => 45.0703, 'longitude' => 7.6869],
                    ['name' => 'Bologne', 'is_popular' => false, 'sort_order' => 7, 'latitude' => 44.4949, 'longitude' => 11.3426],
                ],
            ],
            [
                'name' => 'Portugal',
                'code' => 'PT',
                'flag_emoji' => '🇵🇹',
                'is_active' => true,
                'sort_order' => 4,
                'cities' => [
                    ['name' => 'Lisbonne', 'is_popular' => true, 'sort_order' => 1, 'latitude' => 38.7223, 'longitude' => -9.1393],
                    ['name' => 'Porto', 'is_popular' => true, 'sort_order' => 2, 'latitude' => 41.1579, 'longitude' => -8.6291],
                    ['name' => 'Faro', 'is_popular' => false, 'sort_order' => 3, 'latitude' => 37.0194, 'longitude' => -7.9322],
                ],
            ],
            [
                'name' => 'Allemagne',
                'code' => 'DE',
                'flag_emoji' => '🇩🇪',
                'is_active' => true,
                'sort_order' => 5,
                'cities' => [
                    ['name' => 'Berlin', 'is_popular' => true, 'sort_order' => 1, 'latitude' => 52.5200, 'longitude' => 13.4050],
                    ['name' => 'Munich', 'is_popular' => true, 'sort_order' => 2, 'latitude' => 48.1351, 'longitude' => 11.5820],
                    ['name' => 'Hambourg', 'is_popular' => false, 'sort_order' => 3, 'latitude' => 53.5511, 'longitude' => 9.9937],
                ],
            ],
        ];

        foreach ($countries as $countryData) {
            $cities = $countryData['cities'];
            unset($countryData['cities']);

            $country = Country::query()->updateOrCreate(['code' => $countryData['code']], $countryData);

            foreach ($cities as $cityData) {
                $country->cities()->updateOrCreate(['slug' => Str::slug($cityData['name'])], $cityData);
            }
        }
    }
}
