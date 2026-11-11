'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import { useAppState } from '@/components/providers';
import { logoutAction } from '@/lib/actions/auth';
import type { User } from '@/types';

const roleLabels: Record<User['role'], string> = {
    client: 'Voyageur',
    host: 'Hôte',
    admin: 'Administrateur',
};

function initials(name: string): string {
    return name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('');
}

export function UserMenu({ user }: { user: User }) {
    const [open, setOpen] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const menuId = useId();
    const router = useRouter();
    const { pushToast } = useAppState();

    useEffect(() => {
        if (!open) {
            return;
        }

        const handlePointerDown = (event: PointerEvent) => {
            if (!containerRef.current?.contains(event.target as Node)) {
                setOpen(false);
            }
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setOpen(false);
            }
        };

        document.addEventListener('pointerdown', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('pointerdown', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [open]);

    async function handleLogout() {
        setLoggingOut(true);
        setOpen(false);
        const res = await logoutAction();
        if (res.ok && res.toast) {
            pushToast(res.toast);
        }
        router.push('/');
        router.refresh();
    }

    const itemClasses =
        'block w-full rounded-lg px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800';

    return (
        <div ref={containerRef} className="relative">
            <button
                type="button"
                onClick={() => setOpen((value) => !value)}
                aria-expanded={open}
                aria-controls={menuId}
                className="flex items-center gap-2 rounded-full border border-zinc-200 py-1 pr-3 pl-1 text-sm font-medium hover:shadow-sm dark:border-zinc-700"
            >
                <span
                    className="flex size-8 items-center justify-center rounded-full bg-secondary-800 text-xs font-semibold text-white"
                    aria-hidden="true"
                >
                    {initials(user.name)}
                </span>
                <span className="hidden max-w-32 truncate sm:inline">
                    {user.name}
                </span>
            </button>

            {open && (
                <div
                    id={menuId}
                    className="absolute right-0 mt-2 w-64 rounded-xl border border-zinc-200 bg-white p-2 shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
                >
                    <div className="border-b border-zinc-200 px-3 pt-1 pb-3 dark:border-zinc-800">
                        <p className="truncate text-sm font-medium">
                            {user.name}
                        </p>
                        <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                            {user.email} · {roleLabels[user.role]}
                        </p>
                    </div>
                    <nav className="flex flex-col pt-2">
                        <Link
                            href="/voyages"
                            className={itemClasses}
                            onClick={() => setOpen(false)}
                        >
                            Mes voyages
                        </Link>
                        <Link
                            href="/favoris"
                            className={itemClasses}
                            onClick={() => setOpen(false)}
                        >
                            Mes favoris
                        </Link>
                        {user.role !== 'client' && (
                            <Link
                                href="/hote"
                                className={itemClasses}
                                onClick={() => setOpen(false)}
                            >
                                Espace hôte
                            </Link>
                        )}
                        {user.role === 'admin' && (
                            <Link
                                href="/admin"
                                className={itemClasses}
                                onClick={() => setOpen(false)}
                            >
                                Administration
                            </Link>
                        )}
                        <Link
                            href="/settings/profile"
                            className={itemClasses}
                            onClick={() => setOpen(false)}
                        >
                            Paramètres du compte
                        </Link>
                        <button
                            type="button"
                            disabled={loggingOut}
                            onClick={() => void handleLogout()}
                            className={itemClasses}
                        >
                            Se déconnecter
                        </button>
                    </nav>
                </div>
            )}
        </div>
    );
}

