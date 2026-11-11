import type { MetadataRoute } from 'next';
import { env } from '@/lib/env';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const base = env.appUrl;
    const entries: MetadataRoute.Sitemap = [
        { url: `${base}/` },
        { url: `${base}/logements` },
    ];

    try {
        const properties = await prisma.property.findMany({
            where: {
                status: 'published',
                owner: { is: { suspendedAt: null } },
            },
            orderBy: { updatedAt: 'desc' },
            select: { slug: true, updatedAt: true },
        });

        for (const property of properties) {
            entries.push({
                url: `${base}/logements/${property.slug}`,
                ...(property.updatedAt
                    ? { lastModified: property.updatedAt }
                    : {}),
            });
        }
    } catch {
        // Return static entries if database is temporarily unreachable during pre-render
    }

    return entries;
}

