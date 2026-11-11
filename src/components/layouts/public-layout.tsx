import Link from 'next/link';
import type { ReactNode } from 'react';
import { AppLogo } from '@/components/app-logo';
import { buttonClasses } from '@/components/button';
import { Container } from '@/components/card';
import { MessagesLink } from '@/components/messages-link';
import { NotificationsLink } from '@/components/notifications-link';
import { UserMenu } from '@/components/user-menu';
import type { User } from '@/types';

export function PublicLayout({
    user,
    children,
}: {
    user: User | null;
    children: ReactNode;
}) {
    return (
        <div className="flex min-h-screen flex-col">
            <a
                href="#contenu"
                className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:shadow"
            >
                Aller au contenu
            </a>

            <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/90 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
                <Container className="flex h-16 items-center justify-between gap-4">
                    <Link href="/" aria-label="GuestHoster, accueil">
                        <AppLogo />
                    </Link>

                    {user ? (
                        <div className="flex items-center gap-2">
                            <NotificationsLink />
                            <MessagesLink />
                            <UserMenu user={user} />
                        </div>
                    ) : (
                        <nav className="flex items-center gap-2">
                            <Link
                                href="/register?role=host"
                                className={buttonClasses({
                                    variant: 'ghost',
                                    className: 'hidden sm:inline-flex',
                                })}
                            >
                                Devenir hôte
                            </Link>
                            <Link
                                href="/login"
                                className={buttonClasses({
                                    variant: 'outline',
                                })}
                            >
                                Connexion
                            </Link>
                            <Link href="/register" className={buttonClasses()}>
                                Inscription
                            </Link>
                        </nav>
                    )}
                </Container>
            </header>

            <main id="contenu" className="flex-1">
                {children}
            </main>

            <footer className="border-t border-zinc-200 py-8 text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                <Container className="flex flex-col items-center justify-between gap-4 sm:flex-row">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src="/images/logos/logo-icon.svg"
                        alt=""
                        width={32}
                        height={32}
                        className="size-8"
                    />
                    <p>
                        © {new Date().getFullYear()} GuestHoster. Tous droits
                        réservés.
                    </p>
                </Container>
            </footer>
        </div>
    );
}

