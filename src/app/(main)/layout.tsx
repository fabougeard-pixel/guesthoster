import type { ReactNode } from 'react';
import { PublicLayout } from '@/components/layouts/public-layout';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';

export default async function MainGroupLayout({
    children,
}: {
    children: ReactNode;
}) {
    let user = null;
    try {
        user = await getCurrentUser();
    } catch {
        // Fallback shell
    }

    let destinations: string[] | undefined;
    try {
        const cities = await prisma.city.findMany({
            select: { name: true },
            orderBy: [{ isPopular: 'desc' }, { sortOrder: 'asc' }],
            take: 20,
        });
        destinations = cities.map((c) => c.name);
    } catch {
        // Fallback default
    }

    return (
        <PublicLayout user={user} destinations={destinations}>
            {children}
        </PublicLayout>
    );
}
