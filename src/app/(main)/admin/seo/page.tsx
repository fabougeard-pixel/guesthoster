import type { Metadata } from 'next';
import { ErrorView } from '@/components/error-view';
import { resolveAdminAccess } from '@/lib/auth/session';
import { getPlatformSeoSettings } from '@/lib/domain/platform-settings';
import { AdminSeoClient } from './admin-seo-client';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Paramètres SEO et Référencement · Administration',
};

export default async function AdminSeoPage() {
    const access = await resolveAdminAccess('/admin/seo');
    if (access === 'setup' || access === 'forbidden') {
        return <ErrorView status={403} />;
    }

    const settings = await getPlatformSeoSettings();

    return <AdminSeoClient initialSettings={settings} />;
}
