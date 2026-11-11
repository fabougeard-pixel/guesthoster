<?php

use App\Http\Controllers\Admin\AmenityController;
use App\Http\Controllers\Admin\BookingController;
use App\Http\Controllers\Admin\CityController;
use App\Http\Controllers\Admin\CountryController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\PropertyController;
use App\Http\Controllers\Admin\PropertyTypeController;
use App\Http\Controllers\Admin\UserController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified', 'role:admin'])
    ->prefix('admin')
    ->name('admin.')
    ->group(function () {
        Route::get('/', DashboardController::class)->name('dashboard');

        Route::get('logements', [PropertyController::class, 'index'])->name('properties.index');
        Route::post('logements/{property}/publier', [PropertyController::class, 'publish'])->name('properties.publish');
        Route::post('logements/{property}/refuser', [PropertyController::class, 'reject'])->name('properties.reject');

        Route::get('utilisateurs', [UserController::class, 'index'])->name('users.index');
        Route::patch('utilisateurs/{user}/role', [UserController::class, 'updateRole'])->name('users.role');
        Route::post('utilisateurs/{user}/suspendre', [UserController::class, 'suspend'])->name('users.suspend');
        Route::post('utilisateurs/{user}/reactiver', [UserController::class, 'reinstate'])->name('users.reinstate');

        Route::get('reservations', [BookingController::class, 'index'])->name('bookings.index');

        Route::get('pays', [CountryController::class, 'index'])->name('countries.index');
        Route::post('pays', [CountryController::class, 'store'])->name('countries.store');
        Route::put('pays/{country}', [CountryController::class, 'update'])->name('countries.update');
        Route::delete('pays/{country}', [CountryController::class, 'destroy'])->name('countries.destroy');

        Route::get('villes', [CityController::class, 'index'])->name('cities.index');
        Route::post('villes', [CityController::class, 'store'])->name('cities.store');
        Route::put('villes/{city}', [CityController::class, 'update'])->name('cities.update');
        Route::delete('villes/{city}', [CityController::class, 'destroy'])->name('cities.destroy');

        Route::get('equipements', [AmenityController::class, 'index'])->name('amenities.index');
        Route::post('equipements', [AmenityController::class, 'store'])->name('amenities.store');
        Route::put('equipements/{amenity}', [AmenityController::class, 'update'])->name('amenities.update');
        Route::delete('equipements/{amenity}', [AmenityController::class, 'destroy'])->name('amenities.destroy');

        Route::get('types-de-logement', [PropertyTypeController::class, 'index'])->name('property-types.index');
        Route::post('types-de-logement', [PropertyTypeController::class, 'store'])->name('property-types.store');
        Route::put('types-de-logement/{propertyType}', [PropertyTypeController::class, 'update'])->name('property-types.update');
        Route::delete('types-de-logement/{propertyType}', [PropertyTypeController::class, 'destroy'])->name('property-types.destroy');
    });
