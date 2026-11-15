import type { ReactNode } from 'react';
import { ErrorView } from '@/components/error-view';
import { HostLayout } from '@/components/layouts/host-layout';
import { isHostOrAdmin, requireVerifiedUser } from '@/lib/auth/session';
import { getEffectiveHostContext } from '@/lib/auth/managed-host';

export default async function HostGroupLayout({
    children,
}: {
    children: ReactNode;
}) {
    const user = await requireVerifiedUser();
    if (!isHostOrAdmin(user)) {
        return <ErrorView status={403} />;
    }

    const hostContext = await getEffectiveHostContext();

    return <HostLayout hostContext={hostContext}>{children}</HostLayout>;
}

