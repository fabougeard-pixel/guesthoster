<?php

namespace App\Actions\Bookings;

use App\Enums\BookingMode;
use App\Enums\BookingStatus;
use App\Models\Booking;
use App\Models\Property;
use App\Models\User;
use App\Notifications\BookingAwaitingPayment;
use App\Notifications\BookingRequested;
use App\Pricing\PricingCalculator;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Books a stay. The property row is locked for the whole transaction so that
 * two guests cannot book overlapping dates at the same time.
 */
class CreateBooking
{
    public function __construct(private PricingCalculator $pricing) {}

    /**
     * @throws ValidationException
     */
    public function handle(
        User $guest,
        Property $property,
        CarbonImmutable $checkIn,
        CarbonImmutable $checkOut,
        int $guests,
        ?string $specialRequests = null,
    ): Booking {
        $booking = DB::transaction(function () use ($guest, $property, $checkIn, $checkOut, $guests, $specialRequests): Booking {
            $property = Property::query()->lockForUpdate()->findOrFail($property->id);

            $this->ensureBookable($guest, $property, $checkIn, $checkOut, $guests);

            $quote = $this->pricing->quote($property, $checkIn, $checkOut);
            $isInstant = $property->booking_mode === BookingMode::Instant;

            $booking = new Booking([
                'check_in' => $checkIn,
                'check_out' => $checkOut,
                'guests' => $guests,
                'special_requests' => $specialRequests,
            ]);

            $booking->forceFill([
                'property_id' => $property->id,
                'user_id' => $guest->id,
                'nights' => $quote->nights,
                'price_per_night' => $quote->pricePerNight,
                'cleaning_fee' => $quote->cleaningFee,
                'service_fee' => $quote->serviceFee,
                'total_price' => $quote->total(),
                'booking_mode' => $property->booking_mode,
                'status' => $isInstant ? BookingStatus::AwaitingPayment : BookingStatus::Pending,
                'approved_at' => $isInstant ? now() : null,
                'expires_at' => self::deadline(
                    $checkIn,
                    $isInstant
                        ? now()->addMinutes((int) config('booking.instant_payment_minutes'))
                        : now()->addHours((int) config('booking.host_response_hours')),
                ),
            ])->save();

            return $booking->setRelation('property', $property)->setRelation('guest', $guest);
        });

        if ($booking->status === BookingStatus::Pending) {
            $booking->property->loadMissing('owner')->owner->notify(new BookingRequested($booking));
        } else {
            $guest->notify(new BookingAwaitingPayment($booking));
        }

        return $booking;
    }

    /**
     * Expiry date, never later than the day of arrival.
     */
    public static function deadline(CarbonImmutable $checkIn, CarbonImmutable $deadline): CarbonImmutable
    {
        return $deadline->min($checkIn->startOfDay());
    }

    /**
     * @throws ValidationException
     */
    private function ensureBookable(User $guest, Property $property, CarbonImmutable $checkIn, CarbonImmutable $checkOut, int $guests): void
    {
        $nights = (int) $checkIn->diffInDays($checkOut);

        $error = match (true) {
            ! $property->isListed() => ['check_in', 'Ce logement n’accepte pas de réservation pour le moment.'],
            $property->isOwnedBy($guest) => ['check_in', 'Vous ne pouvez pas réserver votre propre logement.'],
            $guests > $property->max_guests => ['guests', "Ce logement accueille {$property->max_guests} voyageur(s) au maximum."],
            $nights < $property->min_nights => ['check_out', "Le séjour doit durer au moins {$property->min_nights} nuit(s)."],
            $property->max_nights !== null && $nights > $property->max_nights => ['check_out', "Le séjour ne peut pas dépasser {$property->max_nights} nuit(s)."],
            ! $property->isAvailableBetween($checkIn, $checkOut) => ['check_in', 'Ces dates ne sont plus disponibles.'],
            default => null,
        };

        if ($error !== null) {
            throw ValidationException::withMessages([$error[0] => $error[1]]);
        }
    }
}
