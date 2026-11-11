import type { Metadata } from 'next';
import { Instrument_Sans } from 'next/font/google';
import type { ReactNode } from 'react';
import { AppStateProvider } from '@/components/providers';
import { getCurrentUser } from '@/lib/auth/session';
import { env } from '@/lib/env';
import { prisma } from '@/lib/prisma';
import './globals.css';

const instrumentSans = Instrument_Sans({
    subsets: ['latin'],
    weight: ['400', '500', '600', '700'],
    variable: '--font-instrument-sans',
    display: 'swap',
});

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: {
        default: env.appName,
        template: `%s — ${env.appName}`,
    },
    description:
        'Locations saisonnières partout en Europe : réservez en direct auprès de propriétaires vérifiés.',
    icons: {
        icon: [
            { url: '/favicon.svg', type: 'image/svg+xml' },
            { url: '/favicon.ico', sizes: 'any' },
        ],
        apple: '/apple-touch-icon.png',
    },
};

export default async function RootLayout({
    children,
}: {
    children: ReactNode;
}) {
    let user = null;
    let favoriteIds: number[] = [];
    let unreadNotifications = 0;
    let unreadMessages = 0;

    try {
        user = await getCurrentUser();
        if (user) {
            const [favorites, notifCount, msgCount] = await Promise.all([
                prisma.favorite.findMany({
                    where: { userId: user.id },
                    select: { propertyId: true },
                }),
                prisma.notification.count({
                    where: { notifiableId: user.id, readAt: null },
                }),
                prisma.message.count({
                    where: {
                        readAt: null,
                        userId: { not: user.id },
                        booking: {
                            OR: [
                                { userId: user.id },
                                { property: { userId: user.id } },
                            ],
                        },
                    },
                }),
            ]);
            favoriteIds = favorites.map((f) => f.propertyId);
            unreadNotifications = notifCount;
            unreadMessages = msgCount;
        }
    } catch {
        // Resilient shell when database is offline during build/error pages
    }

    return (
        <html lang="fr" className={instrumentSans.variable}>
            <body className="min-h-screen bg-white font-sans text-zinc-900 antialiased dark:bg-zinc-950 dark:text-zinc-100">
                <AppStateProvider
                    initialUser={user}
                    initialFavoriteIds={favoriteIds}
                    initialUnreadNotifications={unreadNotifications}
                    initialUnreadMessages={unreadMessages}
                >
                    {children}
                </AppStateProvider>
            </body>
        </html>
    );
}

