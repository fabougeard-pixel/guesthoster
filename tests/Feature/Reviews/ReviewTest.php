<?php

use App\Enums\PropertySort;
use App\Models\Booking;
use App\Models\Property;
use App\Models\Review;
use App\Models\User;
use App\Notifications\ReviewReceived;
use App\Notifications\ReviewRequested;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    Notification::fake();
});

function finishedStay(int $daysSinceCheckOut = 2): Booking
{
    return Booking::factory()
        ->between(today()->subDays($daysSinceCheckOut + 3)->toDateString(), today()->subDays($daysSinceCheckOut)->toDateString())
        ->completed()
        ->create([
            'check_in' => today()->subDays($daysSinceCheckOut + 3),
            'check_out' => today()->subDays($daysSinceCheckOut),
        ]);
}

test('the guest reviews a completed stay, which updates the listing rating and tells the host', function () {
    $booking = finishedStay();
    Review::factory()->create(['booking_id' => Booking::factory()->for($booking->property)->completed(), 'rating' => 3]);
    $booking->property->refreshRating();

    $this->actingAs($booking->guest)
        ->post(route('reviews.store', $booking), ['rating' => 5, 'comment' => 'Logement impeccable et hôte très attentionné.'])
        ->assertRedirect()
        ->assertInertiaFlash('toast.type', 'success');

    expect($booking->property->refresh())
        ->reviews_count->toBe(2)
        ->rating_average->toBe(4.0);
    Notification::assertSentTo($booking->property->owner, ReviewReceived::class);
});

test('a stay can only be reviewed once', function () {
    $booking = finishedStay();
    Review::factory()->create(['booking_id' => $booking->id]);

    $this->actingAs($booking->guest)
        ->post(route('reviews.store', $booking), ['rating' => 4, 'comment' => 'Deuxième avis sur le même séjour.'])
        ->assertForbidden();
});

test('only the guest of a completed stay may review it, within the review window', function (Closure $setup) {
    [$user, $booking] = $setup();

    $this->actingAs($user)
        ->post(route('reviews.store', $booking), ['rating' => 4, 'comment' => 'Un avis qui ne devrait pas passer.'])
        ->assertForbidden();
})->with([
    'host' => [fn () => [($booking = finishedStay())->property->owner, $booking]],
    'other user' => [fn () => [User::factory()->create(), finishedStay()]],
    'not completed' => [fn () => [($booking = Booking::factory()->confirmed()->create())->guest, $booking]],
    'window closed' => [fn () => [($booking = finishedStay(config('booking.review_window_days') + 1))->guest, $booking]],
]);

test('ratings must be between 1 and 5 and comments meaningful', function () {
    $booking = finishedStay();

    $this->actingAs($booking->guest)
        ->post(route('reviews.store', $booking), ['rating' => 6, 'comment' => 'Court'])
        ->assertSessionHasErrors(['rating', 'comment']);
});

test('the host replies once to a review', function () {
    $review = Review::factory()->create();
    $booking = $review->booking;

    $this->actingAs($booking->property->owner)
        ->post(route('reviews.reply', $booking), ['host_reply' => 'Merci, revenez quand vous voulez !'])
        ->assertRedirect();

    expect($review->refresh())
        ->host_reply->toBe('Merci, revenez quand vous voulez !')
        ->replied_at->not->toBeNull();

    $this->actingAs($booking->property->owner)
        ->post(route('reviews.reply', $booking), ['host_reply' => 'Une seconde réponse.'])
        ->assertForbidden();
});

test('the listing page shows its latest reviews with the author first name only', function () {
    $review = Review::factory()->create(['booking_id' => Booking::factory()->for(User::factory()->state(['name' => 'Camille Martin']), 'guest')->completed()]);
    $review->property->forceFill(['status' => 'published'])->save();

    $this->get(route('properties.show', $review->property))
        ->assertInertia(fn (Assert $page) => $page
            ->has('reviews', 1)
            ->where('reviews.0.author', 'Camille')
            ->where('reviews.0.rating', $review->rating)
        );
});

test('the booking page offers the review form to the guest', function () {
    $booking = finishedStay();

    $this->actingAs($booking->guest)
        ->get(route('bookings.show', $booking))
        ->assertInertia(fn (Assert $page) => $page
            ->where('booking.can.review', true)
            ->where('booking.review', null)
        );
});

test('completing a stay invites the guest to review it', function () {
    $booking = Booking::factory()->confirmed()->create([
        'check_in' => today()->subDays(3),
        'check_out' => today(),
    ]);

    $this->artisan('bookings:complete')->assertSuccessful();

    Notification::assertSentTo($booking->guest, ReviewRequested::class);
});

test('the catalogue can be sorted by rating, unrated listings last', function () {
    $unrated = Property::factory()->published()->create();
    $good = Property::factory()->published()->create(['rating_average' => 4.2, 'reviews_count' => 3]);
    $best = Property::factory()->published()->create(['rating_average' => 4.9, 'reviews_count' => 8]);

    $this->get(route('properties.index', ['sort' => PropertySort::TopRated->value]))
        ->assertInertia(fn (Assert $page) => $page
            ->where('properties.data.0.id', $best->id)
            ->where('properties.data.1.id', $good->id)
            ->where('properties.data.2.id', $unrated->id)
        );
});
