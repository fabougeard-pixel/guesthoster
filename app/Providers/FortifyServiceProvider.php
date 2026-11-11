<?php

namespace App\Providers;

use App\Actions\Fortify\CreateNewUser;
use App\Actions\Fortify\ResetUserPassword;
use App\Enums\UserRole;
use App\Http\Middleware\EnsureAccountIsActive;
use App\Models\User;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Laravel\Fortify\Features;
use Laravel\Fortify\Fortify;

class FortifyServiceProvider extends ServiceProvider
{
    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureActions();
        $this->configureViews();
        $this->configureRateLimiting();
    }

    /**
     * Register the actions Fortify delegates to.
     */
    protected function configureActions(): void
    {
        Fortify::createUsersUsing(CreateNewUser::class);
        Fortify::resetUserPasswordsUsing(ResetUserPassword::class);

        Fortify::authenticateUsing(function (Request $request): ?User {
            $user = User::query()->where('email', $request->string(Fortify::username())->toString())->first();

            if ($user === null || ! Hash::check($request->string('password')->toString(), $user->password)) {
                return null;
            }

            if ($user->isSuspended()) {
                throw ValidationException::withMessages([Fortify::username() => EnsureAccountIsActive::MESSAGE]);
            }

            return $user;
        });
    }

    /**
     * Render every Fortify screen through Inertia.
     */
    protected function configureViews(): void
    {
        Fortify::loginView(fn (Request $request): Response => Inertia::render('auth/login', [
            'canResetPassword' => Features::enabled(Features::resetPasswords()),
            'canRegister' => Features::enabled(Features::registration()),
            'status' => $request->session()->get('status'),
        ]));

        Fortify::registerView(fn (Request $request): Response => Inertia::render('auth/register', [
            'roles' => collect(UserRole::registrable())->map(fn (UserRole $role): array => [
                'value' => $role->value,
                'label' => $role->label(),
            ])->all(),
            'defaultRole' => $request->query('role') === UserRole::Host->value
                ? UserRole::Host->value
                : UserRole::Client->value,
        ]));

        Fortify::requestPasswordResetLinkView(fn (Request $request): Response => Inertia::render('auth/forgot-password', [
            'status' => $request->session()->get('status'),
        ]));

        Fortify::resetPasswordView(fn (Request $request): Response => Inertia::render('auth/reset-password', [
            'email' => $request->string('email')->toString(),
            'token' => $request->route('token'),
        ]));

        Fortify::confirmPasswordView(fn (): Response => Inertia::render('auth/confirm-password'));

        Fortify::verifyEmailView(fn (Request $request): Response => Inertia::render('auth/verify-email', [
            'status' => $request->session()->get('status'),
        ]));
    }

    /**
     * Throttle authentication attempts.
     */
    protected function configureRateLimiting(): void
    {
        RateLimiter::for('login', function (Request $request): Limit {
            $throttleKey = Str::transliterate(Str::lower($request->string(Fortify::username())->toString()).'|'.$request->ip());

            return Limit::perMinute(5)->by($throttleKey);
        });
    }
}
