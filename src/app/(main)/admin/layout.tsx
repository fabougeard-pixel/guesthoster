import type { ReactNode } from 'react';
import { ErrorView } from '@/components/error-view';
import { AdminLayout } from '@/components/layouts/admin-layout';
import {
    hasAdminUser,
    isAdmin,
    requireVerifiedUser,
} from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export default async function AdminGroupLayout({
    children,
}: {
    children: ReactNode;
}) {
    if (!(await hasAdminUser())) {
        return <>{children}</>;
    }

    const user = await requireVerifiedUser('/admin');
    if (!isAdmin(user)) {
        return <ErrorView status={403} />;
    }

    return <AdminLayout>{children}</AdminLayout>;
}

