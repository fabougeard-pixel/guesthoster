import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { ForgotPasswordForm } from './forgot-password-form';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Mot de passe oublié',
};

export default async function ForgotPasswordPage() {
    const user = await getCurrentUser();
    if (user) {
        redirect('/');
    }

    return <ForgotPasswordForm />;
}

