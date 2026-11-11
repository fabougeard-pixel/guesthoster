<?php

namespace App\Console\Commands;

use App\Models\Country;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Throwable;

#[Signature('app:bootstrap-database')]
#[Description('Exécute les migrations en attente et initialise les données de référence si la base est vide')]
class BootstrapDatabase extends Command
{
    private const int ADVISORY_LOCK_ID = 74829104;

    public function handle(): int
    {
        try {
            $connection = DB::connection();
            $useAdvisoryLock = $this->shouldUseAdvisoryLock($connection->getDriverName());

            if ($useAdvisoryLock) {
                $connection->selectOne('SELECT pg_advisory_lock(?)', [self::ADVISORY_LOCK_ID]);
            }

            try {
                Artisan::call('migrate', [
                    '--force' => true,
                    '--no-interaction' => true,
                ], $this->output);

                if (Schema::hasTable('countries') && Country::query()->doesntExist()) {
                    Artisan::call('db:seed', [
                        '--force' => true,
                        '--no-interaction' => true,
                    ], $this->output);
                }
            } finally {
                if ($useAdvisoryLock) {
                    $connection->selectOne('SELECT pg_advisory_unlock(?)', [self::ADVISORY_LOCK_ID]);
                }
            }
        } catch (Throwable $exception) {
            $this->warn('Initialisation base ignorée : '.$exception->getMessage());

            return self::FAILURE;
        }

        return self::SUCCESS;
    }

    private function shouldUseAdvisoryLock(string $driverName): bool
    {
        if ($driverName !== 'pgsql') {
            return false;
        }

        $url = (string) config('database.connections.pgsql.url', '');
        $port = (int) config('database.connections.pgsql.port', 5432);

        return $port !== 6543 && ! str_contains($url, ':6543');
    }
}
