import { Link } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { AppLogo } from '@/components/app-logo';
import { Toaster } from '@/components/toaster';
import { home } from '@/routes';

export default function AuthLayout({ children }: { children: ReactNode }) {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-zinc-50 px-4 py-12 dark:bg-zinc-950">
            <Link href={home()} aria-label="GuestHoster, accueil">
                <AppLogo className="h-11" />
            </Link>
            <main className="w-full max-w-md">{children}</main>
            <Toaster />
        </div>
    );
}
