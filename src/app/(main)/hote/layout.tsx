import type { ReactNode } from 'react';
import { ErrorView } from '@/components/error-view';
import { HostLayout } from '@/components/layouts/host-layout';
import { isHostOrAdmin, requireVerifiedUser } from '@/lib/auth/session';

export default async function HostGroupLayout({
    children,
}: {
    children: ReactNode;
}) {
    const user = await requireVerifiedUser();
    if (!isHostOrAdmin(user)) {
        return <ErrorView status={403} />;
    }

    return <HostLayout>{children}</HostLayout>;
}

