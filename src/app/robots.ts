import type { MetadataRoute } from 'next';
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

export default function robots(): MetadataRoute.Robots {
    if (!env.isProduction) {
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
        sitemap: `${env.appUrl}/sitemap.xml`,
    };
}

