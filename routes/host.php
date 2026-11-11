<?php

use App\Http\Controllers\Host\BlockedPeriodController;
use App\Http\Controllers\Host\BookingController;
use App\Http\Controllers\Host\DashboardController;
use App\Http\Controllers\Host\PropertyController;
use App\Http\Controllers\Host\PropertyImageController;
use App\Http\Controllers\Host\PropertyStatusController;
use App\Models\Property;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified', 'role:host,admin'])
    ->prefix('hote')
    ->name('host.')
    ->group(function () {
        Route::get('/', DashboardController::class)->name('dashboard');

        Route::get('reservations', [BookingController::class, 'index'])->name('bookings.index');
        Route::post('reservations/{booking}/accepter', [BookingController::class, 'approve'])->name('bookings.approve');
        Route::post('reservations/{booking}/refuser', [BookingController::class, 'decline'])->name('bookings.decline');

        Route::get('logements/nouveau', [PropertyController::class, 'create'])->name('properties.create')->can('create', Property::class);
        Route::post('logements', [PropertyController::class, 'store'])->name('properties.store');

        Route::middleware('can:update,property')->scopeBindings()->group(function () {
            Route::get('logements/{property}/modifier/{step?}', [PropertyController::class, 'edit'])->name('properties.edit');
            Route::patch('logements/{property}/{step}', [PropertyController::class, 'update'])->name('properties.update');
            Route::delete('logements/{property}', [PropertyController::class, 'destroy'])->name('properties.destroy');

            Route::post('logements/{property}/soumettre', [PropertyStatusController::class, 'submit'])->name('properties.submit');
            Route::post('logements/{property}/retirer', [PropertyStatusController::class, 'withdraw'])->name('properties.withdraw');
            Route::post('logements/{property}/archiver', [PropertyStatusController::class, 'archive'])->name('properties.archive');
            Route::post('logements/{property}/restaurer', [PropertyStatusController::class, 'restore'])->name('properties.restore');

            Route::post('logements/{property}/photos', [PropertyImageController::class, 'store'])->name('properties.images.store');
            Route::post('logements/{property}/photos/signature', [PropertyImageController::class, 'signature'])->name('properties.images.signature');
            Route::patch('logements/{property}/photos/ordre', [PropertyImageController::class, 'reorder'])->name('properties.images.reorder');
            Route::delete('logements/{property}/photos/{image}', [PropertyImageController::class, 'destroy'])->name('properties.images.destroy');

            Route::get('logements/{property}/calendrier', [BlockedPeriodController::class, 'index'])->name('properties.calendar');
            Route::post('logements/{property}/calendrier', [BlockedPeriodController::class, 'store'])->name('properties.blocked-periods.store');
            Route::delete('logements/{property}/calendrier/{blockedPeriod}', [BlockedPeriodController::class, 'destroy'])->name('properties.blocked-periods.destroy');
        });
    });
