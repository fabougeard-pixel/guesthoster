'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { Container } from '@/components/card';
import { cn } from '@/lib/utils';

const navigation = [
    { label: 'Profil', href: '/settings/profile' },
    { label: 'Mot de passe', href: '/settings/password' },
];

export function SettingsLayout({ children }: { children: ReactNode }) {
    const pathname = usePathname() || '';

    return (
        <Container className="py-10">
            <h1 className="text-2xl font-semibold">Paramètres du compte</h1>
            <div className="mt-8 flex flex-col gap-8 lg:flex-row">
                <nav
                    aria-label="Paramètres"
                    className="flex gap-1 lg:w-56 lg:flex-col"
                >
                    {navigation.map((item) => {
                        const isActive = pathname.startsWith(item.href);

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                aria-current={isActive ? 'page' : undefined}
                                className={cn(
                                    'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                                    isActive
                                        ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100'
                                        : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100',
                                )}
                            >
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>
                <div className="flex max-w-2xl flex-1 flex-col gap-8">
                    {children}
                </div>
            </div>
        </Container>
    );
}

