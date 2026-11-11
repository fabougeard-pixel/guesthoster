<?php

namespace App\Http\Controllers;

use App\Actions\Reviews\PublishReview;
use App\Http\Requests\ReplyToReviewRequest;
use App\Http\Requests\StoreReviewRequest;
use App\Models\Booking;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;

class ReviewController extends Controller
{
    public function store(StoreReviewRequest $request, Booking $booking, PublishReview $publishReview): RedirectResponse
    {
        $publishReview->handle(
            $booking->load('property.owner'),
            $request->integer('rating'),
            $request->string('comment')->trim()->toString(),
        );

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Merci pour votre avis !']);

        return back();
    }

    public function reply(ReplyToReviewRequest $request, Booking $booking): RedirectResponse
    {
        $booking->review()->firstOrFail()->forceFill([
            'host_reply' => $request->string('host_reply')->trim()->toString(),
            'replied_at' => now(),
        ])->save();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Réponse publiée.']);

        return back();
    }
}
