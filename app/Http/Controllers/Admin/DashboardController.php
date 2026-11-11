<?php

namespace App\Http\Controllers\Admin;

use App\Enums\BookingStatus;
use App\Enums\PropertyStatus;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Property;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    private const REVENUE_MONTHS = 6;

    public function __invoke(): Response
    {
        $today = today()->toDateString();

        return Inertia::render('admin/dashboard', [
            'stats' => [
                'published' => Property::query()->published()->count(),
                'pending_review' => Property::query()->where('status', PropertyStatus::Pending)->count(),
                'pending_requests' => Booking::query()->where('status', BookingStatus::Pending)->count(),
                'awaiting_payment' => Booking::query()->where('status', BookingStatus::AwaitingPayment)->count(),
                'upcoming_stays' => Booking::query()->where('status', BookingStatus::Confirmed)->where('check_in', '>=', $today)->count(),
                'hosts' => User::query()->where('role', UserRole::Host)->count(),
                'travelers' => User::query()->where('role', UserRole::Client)->count(),
            ],
            'revenue' => $this->revenue(),
            'topHosts' => $this->topHosts(),
            'reviewQueue' => Property::query()
                ->where('status', PropertyStatus::Pending)
                ->with(['owner', 'city'])
                ->oldest('submitted_at')
                ->limit(5)
                ->get()
                ->map(fn (Property $property): array => [
                    'id' => $property->id,
                    'slug' => $property->slug,
                    'title' => $property->title,
                    'host' => $property->owner->name,
                    'city' => $property->city?->name,
                    'submitted_at' => $property->submitted_at?->toIso8601String(),
                ]),
        ]);
    }

    /**
     * Paid stays (confirmed or completed) per month: business volume and platform fees, in cents.
     *
     * @return array{months: array<int, array{month: string, volume: int, fees: int}>, volume: int, fees: int}
     */
    private function revenue(): array
    {
        $start = CarbonImmutable::today()->startOfMonth()->subMonths(self::REVENUE_MONTHS - 1);

        $bookings = $this->paidStays()
            ->where('paid_at', '>=', $start)
            ->get(['paid_at', 'total_price', 'service_fee']);

        $months = collect(range(0, self::REVENUE_MONTHS - 1))->map(function (int $offset) use ($start, $bookings): array {
            $month = $start->addMonths($offset);
            $inMonth = $bookings->filter(fn (Booking $booking): bool => $booking->paid_at?->isSameMonth($month) ?? false);

            return [
                'month' => $month->format('Y-m'),
                'volume' => (int) $inMonth->sum('total_price'),
                'fees' => (int) $inMonth->sum('service_fee'),
            ];
        });

        return [
            'months' => $months->values()->all(),
            'volume' => (int) $months->sum('volume'),
            'fees' => (int) $months->sum('fees'),
        ];
    }

    /**
     * Hosts with the largest paid volume over the last twelve months.
     *
     * @return array<int, array{id: int, name: string, email: string, stays: int, volume: int, listings: int}>
     */
    private function topHosts(): array
    {
        $totals = $this->paidStays()
            ->where('paid_at', '>=', now()->subYear())
            ->join('properties', 'properties.id', '=', 'bookings.property_id')
            ->groupBy('properties.user_id')
            ->selectRaw('properties.user_id as host_id, count(*) as stays, sum(bookings.total_price) as volume')
            ->orderByDesc('volume')
            ->limit(5)
            ->toBase()
            ->get();

        $hosts = User::query()
            ->withCount(['properties as listings_count' => fn (Builder $query) => $query->where('status', PropertyStatus::Published)])
            ->findMany($totals->pluck('host_id'))
            ->keyBy('id');

        return $totals
            ->filter(fn (object $row): bool => $hosts->has($row->host_id))
            ->map(function (object $row) use ($hosts): array {
                $host = $hosts->get($row->host_id);

                return [
                    'id' => $host->id,
                    'name' => $host->name,
                    'email' => $host->email,
                    'stays' => (int) $row->stays,
                    'volume' => (int) $row->volume,
                    'listings' => (int) $host->getAttribute('listings_count'),
                ];
            })
            ->values()
            ->all();
    }

    /**
     * @return Builder<Booking>
     */
    private function paidStays(): Builder
    {
        return Booking::query()
            ->whereNotNull('paid_at')
            ->whereIn('bookings.status', [BookingStatus::Confirmed, BookingStatus::Completed]);
    }
}
