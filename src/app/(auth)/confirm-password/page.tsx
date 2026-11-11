import type { Metadata } from 'next';
import { requireAuthenticatedUser } from '@/lib/auth/session';
import { ConfirmPasswordForm } from './confirm-password-form';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Confirmation du mot de passe',
};

export default async function ConfirmPasswordPage({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    await requireAuthenticatedUser();
    const sp = await searchParams;
    const redirectTo =
        typeof sp.redirect === 'string' ? sp.redirect : undefined;

    return <ConfirmPasswordForm redirectTo={redirectTo} />;
}

