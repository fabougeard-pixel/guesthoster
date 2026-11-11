import type { Metadata } from 'next';
import { requireVerifiedUser } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { CreatePropertyClient } from './create-property-client';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Nouveau logement',
};

export default async function CreatePropertyPage() {
    await requireVerifiedUser();

    const types = await prisma.propertyType.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        select: { id: true, name: true },
    });

    return (
        <CreatePropertyClient
            types={types.map((t) => ({ value: String(t.id), label: t.name }))}
        />
    );
}

