import type { Metadata } from 'next';
import { ErrorView } from '@/components/error-view';
import { resolveAdminAccess } from '@/lib/auth/session';
import { getPlatformRentalSettings } from '@/lib/domain/platform-settings';
import { AdminSettingsClient } from './admin-settings-client';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Paramètres de location · Administration',
};

export default async function AdminRentalSettingsPage() {
    const access = await resolveAdminAccess('/admin/parametres');
    if (access === 'setup') {
        return <ErrorView status={403} />;
    }
    if (access === 'forbidden') {
        return <ErrorView status={403} />;
    }

    const settings = await getPlatformRentalSettings();

    return <AdminSettingsClient initialSettings={settings} />;
}

