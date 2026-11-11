<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;

class HostUpgradeController extends Controller
{
    /**
     * Turn the authenticated traveler into a host.
     */
    public function __invoke(Request $request): RedirectResponse
    {
        /** @var User $user */
        $user = $request->user();

        abort_unless($user->isClient(), 403);

        $user->promoteToHost();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Bienvenue parmi les hôtes GuestHoster !']);

        return to_route('profile.edit');
    }
}
