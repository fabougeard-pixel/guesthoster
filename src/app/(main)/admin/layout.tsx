import type { ReactNode } from 'react';
import { ErrorView } from '@/components/error-view';
import { AdminLayout } from '@/components/layouts/admin-layout';
import { isAdmin, requireVerifiedUser } from '@/lib/auth/session';

export default async function AdminGroupLayout({
    children,
}: {
    children: ReactNode;
}) {
    const user = await requireVerifiedUser();
    if (!isAdmin(user)) {
        return <ErrorView status={403} />;
    }

    return <AdminLayout>{children}</AdminLayout>;
}

