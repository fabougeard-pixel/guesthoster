<?php

use App\Http\Controllers\BookingController;
use App\Http\Controllers\BookingPaymentController;
use App\Http\Controllers\CronController;
use App\Http\Controllers\FavoriteController;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\MessageController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\PropertyController;
use App\Http\Controllers\ReviewController;
use App\Http\Controllers\RobotsController;
use App\Http\Controllers\SitemapController;
use App\Http\Controllers\StripeWebhookController;
use Illuminate\Support\Facades\Route;

Route::get('/', HomeController::class)->name('home');

Route::get('/logements', [PropertyController::class, 'index'])->name('properties.index');
Route::get('/logements/{property}', [PropertyController::class, 'show'])->name('properties.show');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/logements/{property}/reserver', [BookingController::class, 'create'])->name('bookings.create');
    Route::post('/logements/{property}/reserver', [BookingController::class, 'store'])->name('bookings.store')->middleware('throttle:10,1');

    Route::get('/voyages', [BookingController::class, 'index'])->name('bookings.index');
    Route::get('/reservations/{booking}', [BookingController::class, 'show'])->name('bookings.show');
    Route::post('/reservations/{booking}/annuler', [BookingController::class, 'cancel'])->name('bookings.cancel');
    Route::post('/reservations/{booking}/paiement', [BookingPaymentController::class, 'store'])->name('bookings.payment.store')->middleware('throttle:10,1');
    Route::get('/messages', [MessageController::class, 'index'])->name('messages.index');
    Route::get('/messages/{booking}', [MessageController::class, 'show'])->name('messages.show');
    Route::post('/messages/{booking}', [MessageController::class, 'store'])->name('messages.store')->middleware('throttle:30,1');
    Route::get('/reservations/{booking}/paiement/retour', [BookingPaymentController::class, 'return'])->name('bookings.payment.return');

    Route::post('/reservations/{booking}/avis', [ReviewController::class, 'store'])->name('reviews.store')->middleware('throttle:10,1');
    Route::post('/reservations/{booking}/avis/reponse', [ReviewController::class, 'reply'])->name('reviews.reply')->middleware('throttle:10,1');
});

Route::middleware('auth')->group(function () {
    Route::get('/favoris', [FavoriteController::class, 'index'])->name('favorites.index');
    Route::post('/favoris/{property}', [FavoriteController::class, 'store'])->name('favorites.store')->middleware('throttle:60,1');
    Route::delete('/favoris/{property}', [FavoriteController::class, 'destroy'])->name('favorites.destroy')->middleware('throttle:60,1');

    Route::get('/notifications', [NotificationController::class, 'index'])->name('notifications.index');
    Route::post('/notifications/tout-lire', [NotificationController::class, 'readAll'])->name('notifications.read-all');
    Route::get('/notifications/{notification}', [NotificationController::class, 'show'])->name('notifications.show');
});

Route::post('/stripe/webhook', StripeWebhookController::class)->name('stripe.webhook');
Route::get('/internal/cron', CronController::class)->name('cron.run');

Route::get('/sitemap.xml', SitemapController::class)->name('sitemap');
Route::get('/robots.txt', RobotsController::class)->name('robots');

require __DIR__.'/settings.php';
require __DIR__.'/host.php';
require __DIR__.'/admin.php';
