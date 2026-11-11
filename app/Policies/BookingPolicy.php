<?php

namespace App\Policies;

use App\Enums\BookingStatus;
use App\Models\Booking;
use App\Models\User;

class BookingPolicy
{
    /**
     * The guest, the host of the listing and admins.
     */
    public function view(User $user, Booking $booking): bool
    {
        return $this->isGuest($user, $booking) || $this->isHost($user, $booking) || $user->isAdmin();
    }

    /**
     * The conversation belongs to the guest and the host; admins do not take part.
     */
    public function message(User $user, Booking $booking): bool
    {
        return $this->isGuest($user, $booking) || $this->isHost($user, $booking);
    }

    /**
     * Accept or decline a request.
     */
    public function respond(User $user, Booking $booking): bool
    {
        return ($this->isHost($user, $booking) || $user->isAdmin())
            && $booking->status === BookingStatus::Pending;
    }

    /**
     * Only the guest pays, while the dates are still held for them.
     */
    public function pay(User $user, Booking $booking): bool
    {
        return $this->isGuest($user, $booking)
            && $booking->status === BookingStatus::AwaitingPayment
            && ($booking->expires_at === null || $booking->expires_at->isFuture());
    }

    /**
     * Any party may cancel an active booking until the day of arrival.
     */
    public function cancel(User $user, Booking $booking): bool
    {
        return $this->view($user, $booking)
            && $booking->status->canTransitionTo(BookingStatus::Cancelled)
            && $booking->check_in->isAfter(today());
    }

    /**
     * The guest reviews a completed stay once, within the review window after departure.
     */
    public function review(User $user, Booking $booking): bool
    {
        return $booking->status === BookingStatus::Completed
            && $this->isGuest($user, $booking)
            && $booking->reviewDeadline()->isFuture()
            && ! $booking->review()->exists();
    }

    /**
     * The host answers a review once, publicly.
     */
    public function replyToReview(User $user, Booking $booking): bool
    {
        return $booking->status === BookingStatus::Completed
            && $this->isHost($user, $booking)
            && $booking->review()->whereNull('host_reply')->exists();
    }

    private function isGuest(User $user, Booking $booking): bool
    {
        return $booking->user_id === $user->id;
    }

    private function isHost(User $user, Booking $booking): bool
    {
        return $booking->property->user_id === $user->id;
    }
}
