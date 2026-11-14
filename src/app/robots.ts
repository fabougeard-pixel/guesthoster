import type { MetadataRoute } from 'next';
import { getPlatformSeoSettings } from '@/lib/domain/platform-settings';
import { env } from '@/lib/env';

const PRIVATE_PATHS = [
    '/admin',
    '/hote',
    '/settings',
    '/voyages',
    '/reservations',
    '/messages',
    '/favoris',
    '/notifications',
    '/logements/*/reserver',
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/email',
];

export default async function robots(): Promise<MetadataRoute.Robots> {
    let baseUrl = env.appUrl;
    let noIndex = false;

    try {
        const seo = await getPlatformSeoSettings();
        if (seo.canonicalBaseUrl.trim()) {
            baseUrl = seo.canonicalBaseUrl.trim().replace(/\/$/, '');
        }
        if (seo.robotsIndexing === 'noindex_nofollow') {
            noIndex = true;
        }
    } catch {
        // Fallback default
    }

    if (!env.isProduction || noIndex) {
        return {
            rules: {
                userAgent: '*',
                disallow: '/',
            },
        };
    }

    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: PRIVATE_PATHS,
        },
        sitemap: `${baseUrl}/sitemap.xml`,
    };
}


