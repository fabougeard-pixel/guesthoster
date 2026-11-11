<?php

namespace App\Providers;

use App\Mail\ResendApiTransport;
use App\Payments\PaymentGateway;
use App\Payments\StripePaymentGateway;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;
use Inertia\ExceptionResponse;
use Inertia\Inertia;
use RuntimeException;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(PaymentGateway::class, fn (): PaymentGateway => new StripePaymentGateway(
            config('services.stripe.secret'),
            (string) config('services.stripe.currency', 'eur'),
        ));
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();
        $this->configureErrorPages();
        $this->configureMail();
        $this->configureHttps();
    }

    /**
     * Registers the HTTP transport for Resend without requiring an external SDK.
     */
    protected function configureMail(): void
    {
        Mail::extend('resend', $this->createResendTransport(...));
    }

    /**
     * @param  array<string, mixed>  $config
     */
    protected function createResendTransport(array $config): ResendApiTransport
    {
        $apiKey = $config['key'] ?? config('services.resend.key');

        if (! is_string($apiKey) || $apiKey === '') {
            throw new RuntimeException('La clé API Resend (RESEND_API_KEY) est manquante.');
        }

        return new ResendApiTransport($apiKey);
    }

    protected function configureHttps(): void
    {
        $appUrl = config('app.url');

        if (app()->isProduction() && is_string($appUrl) && str_starts_with($appUrl, 'https://')) {
            URL::forceScheme('https');
        }
    }

    /**
     * Render HTTP errors through the Inertia "error" page when debug mode is off.
     */
    protected function configureErrorPages(): void
    {
        Inertia::handleExceptionsUsing(function (ExceptionResponse $response): mixed {
            if (config('app.debug')) {
                return null;
            }

            if (! in_array($response->statusCode(), [403, 404, 419, 429, 500, 503], true)) {
                return null;
            }

            return $response->render('error', [
                'status' => $response->statusCode(),
            ])->withSharedData();
        });
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        Model::shouldBeStrict(! app()->isProduction());

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null,
        );
    }
}
