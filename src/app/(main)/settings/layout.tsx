import type { ReactNode } from 'react';
import { SettingsLayout } from '@/components/layouts/settings-layout';
import { requireAuthenticatedUser } from '@/lib/auth/session';

export default async function SettingsGroupLayout({
    children,
}: {
    children: ReactNode;
}) {
    await requireAuthenticatedUser();
    return <SettingsLayout>{children}</SettingsLayout>;
}

