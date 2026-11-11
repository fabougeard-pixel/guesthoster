<?php

namespace App\Http\Controllers\Admin;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateUserRoleRequest;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    public function index(Request $request): Response
    {
        $validated = $request->validate([
            'role' => ['nullable', Rule::enum(UserRole::class)],
            'suspendus' => ['nullable', 'boolean'],
            'q' => ['nullable', 'string', 'max:100'],
        ]);

        $users = User::query()
            ->when($validated['role'] ?? null, fn (Builder $query, string $role) => $query->where('role', $role))
            ->when($request->boolean('suspendus'), fn (Builder $query) => $query->whereNotNull('suspended_at'))
            ->when($validated['q'] ?? null, fn (Builder $query, string $search) => $query->where(fn (Builder $query) => $query
                ->whereLike('name', "%{$search}%")
                ->orWhereLike('email', "%{$search}%")))
            ->withCount(['properties', 'bookings'])
            ->latest()
            ->paginate(25)
            ->withQueryString()
            ->through(fn (User $user): array => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role->value,
                'role_label' => $user->role->label(),
                'verified' => $user->email_verified_at !== null,
                'suspended_at' => $user->suspended_at?->toIso8601String(),
                'created_at' => $user->created_at?->toIso8601String(),
                'properties' => (int) $user->getAttribute('properties_count'),
                'bookings' => (int) $user->getAttribute('bookings_count'),
                'is_self' => $user->is($request->user()),
            ]);

        return Inertia::render('admin/users/index', [
            'users' => $users,
            'filters' => [
                'role' => $validated['role'] ?? null,
                'suspended' => $request->boolean('suspendus'),
                'q' => $validated['q'] ?? null,
            ],
            'roles' => collect(UserRole::cases())->map(fn (UserRole $role): array => [
                'value' => $role->value,
                'label' => $role->label(),
            ]),
        ]);
    }

    public function updateRole(UpdateUserRoleRequest $request, User $user): RedirectResponse
    {
        $user->changeRole($request->role());

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$user->name} est désormais {$user->role->label()}."]);

        return back();
    }

    public function suspend(Request $request, User $user): RedirectResponse
    {
        if ($user->is($request->user())) {
            Inertia::flash('toast', ['type' => 'error', 'message' => 'Vous ne pouvez pas suspendre votre propre compte.']);

            return back();
        }

        $user->suspend();

        Inertia::flash('toast', ['type' => 'info', 'message' => "Le compte de {$user->name} est suspendu."]);

        return back();
    }

    public function reinstate(User $user): RedirectResponse
    {
        $user->reinstate();

        Inertia::flash('toast', ['type' => 'success', 'message' => "Le compte de {$user->name} est réactivé."]);

        return back();
    }
}
