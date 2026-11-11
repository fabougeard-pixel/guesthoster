<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Former enum values and the type each one becomes.
     *
     * @var array<string, array{slug: string, name: string, sort_order: int}>
     */
    private const LEGACY_TYPES = [
        'apartment' => ['slug' => 'appartement', 'name' => 'Appartement', 'sort_order' => 1],
        'house' => ['slug' => 'maison', 'name' => 'Maison', 'sort_order' => 2],
        'studio' => ['slug' => 'studio', 'name' => 'Studio', 'sort_order' => 4],
        'room' => ['slug' => 'chambre', 'name' => 'Chambre', 'sort_order' => 5],
        'villa' => ['slug' => 'villa', 'name' => 'Villa', 'sort_order' => 6],
    ];

    /**
     * Moves existing listings from the `type` string column to the new reference
     * table. Only the types in use are created here; PropertyTypeSeeder adds the rest.
     */
    public function up(): void
    {
        Schema::table('properties', function (Blueprint $table) {
            $table->foreignId('property_type_id')->nullable()->after('description')->constrained()->restrictOnDelete();
        });

        foreach (self::LEGACY_TYPES as $legacyValue => $type) {
            if (! DB::table('properties')->where('type', $legacyValue)->exists()) {
                continue;
            }

            DB::table('property_types')->insertOrIgnore([...$type, 'is_active' => true, 'created_at' => now(), 'updated_at' => now()]);
            $typeId = DB::table('property_types')->where('slug', $type['slug'])->value('id');

            DB::table('properties')->where('type', $legacyValue)->update(['property_type_id' => $typeId]);
        }

        Schema::table('properties', function (Blueprint $table) {
            $table->dropColumn('type');
        });

        Schema::table('properties', function (Blueprint $table) {
            $table->foreignId('property_type_id')->nullable(false)->change();
        });
    }

    public function down(): void
    {
        Schema::table('properties', function (Blueprint $table) {
            $table->string('type', 20)->default('apartment')->after('description');
        });

        foreach (self::LEGACY_TYPES as $legacyValue => $type) {
            $typeId = DB::table('property_types')->where('slug', $type['slug'])->value('id');

            DB::table('properties')->where('property_type_id', $typeId)->update(['type' => $legacyValue]);
        }

        Schema::table('properties', function (Blueprint $table) {
            $table->dropConstrainedForeignId('property_type_id');
        });
    }
};
