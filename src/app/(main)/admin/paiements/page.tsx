import type { Metadata } from 'next';
import { ErrorView } from '@/components/error-view';
import { resolveAdminAccess } from '@/lib/auth/session';
import { getPlatformPaymentSettings } from '@/lib/domain/platform-settings';
import { isStripeConfigured } from '@/lib/services/stripe';
import { AdminPaymentsClient } from './admin-payments-client';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Moyens de paiement · Administration',
};

export default async function AdminPaymentsPage() {
    const access = await resolveAdminAccess('/admin/paiements');
    if (access === 'setup' || access === 'forbidden') {
        return <ErrorView status={403} />;
    }

    const settings = await getPlatformPaymentSettings();

    return (
        <AdminPaymentsClient
            initialSettings={settings}
            stripeConfigured={isStripeConfigured()}
        />
    );
}

