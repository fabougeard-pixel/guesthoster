import type { ReactNode } from 'react';
import { PublicLayout } from '@/components/layouts/public-layout';
import { getCurrentUser } from '@/lib/auth/session';

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

    return <PublicLayout user={user}>{children}</PublicLayout>;
}

