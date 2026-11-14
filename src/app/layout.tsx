import type { Metadata } from 'next';
import { Instrument_Sans } from 'next/font/google';
import type { ReactNode } from 'react';
import { GoogleAnalytics } from '@/components/google-analytics';
import { AppStateProvider } from '@/components/providers';
import { getCurrentUser } from '@/lib/auth/session';
import {
    DEFAULT_PLATFORM_SEO_SETTINGS,
    getPlatformSeoSettings,
} from '@/lib/domain/platform-settings';
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

export async function generateMetadata(): Promise<Metadata> {
    let seo = DEFAULT_PLATFORM_SEO_SETTINGS;
    try {
        seo = await getPlatformSeoSettings();
    } catch {
        // Fallback default
    }

    const titleDefault = seo.metaTitle || env.appName;
    const description =
        seo.metaDescription ||
        'Locations saisonnières et standing en Europe : réservez en direct auprès de propriétaires vérifiés.';
    const rawBaseUrl = seo.canonicalBaseUrl.trim() || env.appUrl;
    const baseUrl = rawBaseUrl.replace(/\/$/, '');
    const ogImage = seo.ogImage.trim() || `${baseUrl}/favicon.svg`;

    const keywords = seo.metaKeywords
        ? seo.metaKeywords
              .split(',')
              .map((k) => k.trim())
              .filter(Boolean)
        : undefined;

    return {
        metadataBase: new URL(baseUrl),
        title: {
            default: titleDefault,
            template: `%s — ${titleDefault}`,
        },
        description,
        keywords,
        openGraph: {
            title: titleDefault,
            description,
            url: baseUrl,
            siteName: seo.organizationName || env.appName,
            images: [
                {
                    url: ogImage,
                    width: 1200,
                    height: 630,
                    alt: `${seo.organizationName || env.appName} preview`,
                },
            ],
            type: 'website',
        },
        twitter: {
            card:
                seo.twitterCard === 'summary'
                    ? 'summary'
                    : 'summary_large_image',
            title: titleDefault,
            description,
            images: [ogImage],
            ...(seo.twitterHandle ? { creator: seo.twitterHandle } : {}),
        },
        icons: {
            icon: [
                { url: '/favicon.svg', type: 'image/svg+xml' },
                { url: '/favicon.ico', sizes: 'any' },
            ],
            apple: '/apple-touch-icon.png',
        },
        robots:
            seo.robotsIndexing === 'noindex_nofollow'
                ? { index: false, follow: false }
                : { index: true, follow: true },
        ...(seo.googleSiteVerification
            ? {
                  verification: {
                      google: seo.googleSiteVerification,
                  },
              }
            : {}),
    };
}

export default async function RootLayout({
    children,
}: {
    children: ReactNode;
}) {
    let user = null;
    let favoriteIds: number[] = [];
    let unreadNotifications = 0;
    let unreadMessages = 0;
    let seo = DEFAULT_PLATFORM_SEO_SETTINGS;

    try {
        const [currentUser, seoSettings] = await Promise.all([
            getCurrentUser(),
            getPlatformSeoSettings(),
        ]);
        user = currentUser;
        seo = seoSettings;

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

    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': seo.businessType || 'LodgingBusiness',
        name: seo.organizationName || env.appName,
        url: seo.canonicalBaseUrl || env.appUrl,
        ...(seo.ogImage ? { image: seo.ogImage } : {}),
        ...(seo.storePhone ? { telephone: seo.storePhone } : {}),
        ...(seo.storeEmail ? { email: seo.storeEmail } : {}),
        priceRange: seo.storePriceRange || '€€',
        address: {
            '@type': 'PostalAddress',
            ...(seo.storeStreetAddress
                ? { streetAddress: seo.storeStreetAddress }
                : {}),
            ...(seo.storeCity ? { addressLocality: seo.storeCity } : {}),
            ...(seo.storePostalCode ? { postalCode: seo.storePostalCode } : {}),
            addressCountry: seo.storeCountry || 'FR',
        },
    };

    return (
        <html lang="fr" className={instrumentSans.variable}>
            <body className="min-h-screen bg-white font-sans text-zinc-900 antialiased dark:bg-zinc-950 dark:text-zinc-100">
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify(jsonLd),
                    }}
                />
                <AppStateProvider
                    initialUser={user}
                    initialFavoriteIds={favoriteIds}
                    initialUnreadNotifications={unreadNotifications}
                    initialUnreadMessages={unreadMessages}
                >
                    {children}
                </AppStateProvider>
                <GoogleAnalytics gaId={seo.googleAnalyticsId} />
            </body>
        </html>
    );
}

