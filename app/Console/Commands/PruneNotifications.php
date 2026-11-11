<?php

namespace App\Console\Commands;

use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Notifications\DatabaseNotification;

#[Signature('notifications:prune {--days=90 : Âge minimal, en jours, d’une notification lue avant suppression}')]
#[Description('Supprime les notifications lues depuis plus de N jours (les non lues sont conservées)')]
class PruneNotifications extends Command
{
    public function handle(): int
    {
        $days = (int) $this->option('days');

        if ($days < 1) {
            $this->error('--days doit être supérieur ou égal à 1.');

            return self::INVALID;
        }

        $deleted = DatabaseNotification::query()
            ->whereNotNull('read_at')
            ->where('read_at', '<', now()->subDays($days))
            ->delete();

        $this->info("{$deleted} notification(s) supprimée(s).");

        return self::SUCCESS;
    }
}
