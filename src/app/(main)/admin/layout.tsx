import type { ReactNode } from 'react';
import { ErrorView } from '@/components/error-view';
import { AdminLayout } from '@/components/layouts/admin-layout';
import { resolveAdminAccess } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export default async function AdminGroupLayout({
    children,
}: {
    children: ReactNode;
}) {
    const access = await resolveAdminAccess('/admin');
    if (access === 'setup') {
        return <>{children}</>;
    }
    if (access === 'forbidden') {
        return <ErrorView status={403} />;
    }

    return <AdminLayout>{children}</AdminLayout>;
}

