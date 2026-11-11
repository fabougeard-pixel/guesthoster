import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { ResetPasswordForm } from './reset-password-form';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Nouveau mot de passe',
};

export default async function ResetPasswordPage({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const user = await getCurrentUser();
    if (user) {
        redirect('/');
    }

    const sp = await searchParams;
    const token = typeof sp.token === 'string' ? sp.token : '';
    const email = typeof sp.email === 'string' ? sp.email : '';

    if (!token || !email) {
        redirect('/forgot-password');
    }

    return <ResetPasswordForm token={token} email={email} />;
}

