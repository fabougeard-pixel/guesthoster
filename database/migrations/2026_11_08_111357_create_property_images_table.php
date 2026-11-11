<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('property_images', function (Blueprint $table) {
            $table->id();
            $table->foreignId('property_id')->constrained()->cascadeOnDelete();
            $table->string('path')->nullable()->comment('version web (1600 px) sur le disque public');
            $table->string('thumbnail_path')->nullable()->comment('vignette (640 px) sur le disque public');
            $table->string('original_path')->nullable()->comment('fichier envoyé, sur le disque local, en attente de traitement');
            $table->timestamp('processed_at')->nullable();
            $table->string('alt')->nullable();
            $table->unsignedSmallInteger('position')->default(0);
            $table->timestamps();

            $table->index(['property_id', 'position']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('property_images');
    }
};
