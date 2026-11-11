<?php

namespace App\Console\Commands;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;

use function Laravel\Prompts\password;

/**
 * Creates the first administrator of a fresh installation. In production the
 * seeder creates no account at all, so this is the only way in.
 */
#[Signature('users:create-admin {email} {--name=Administrateur}')]
#[Description('Crée un compte administrateur (e-mail vérifié), le mot de passe est demandé de façon masquée')]
class CreateAdmin extends Command
{
    public function handle(): int
    {
        $email = (string) $this->argument('email');
        $name = (string) $this->option('name');

        $identity = Validator::make(['email' => $email, 'name' => $name], [
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'name' => ['required', 'string', 'max:255'],
        ]);

        if ($identity->fails()) {
            $this->error($identity->errors()->first());

            return self::FAILURE;
        }

        $plainPassword = password(
            label: 'Mot de passe',
            required: true,
            validate: fn (string $value): ?string => Validator::make(
                ['password' => $value],
                ['password' => ['required', Password::defaults()]],
            )->errors()->first('password') ?: null,
        );

        $admin = new User(['name' => $name, 'email' => $email]);
        $admin->forceFill([
            'password' => $plainPassword,
            'role' => UserRole::Admin,
            'email_verified_at' => now(),
        ])->save();

        $this->info("Administrateur {$admin->email} créé.");

        return self::SUCCESS;
    }
}
