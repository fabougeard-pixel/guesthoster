import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { LoginForm } from './login-form';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Connexion',
};

export default async function LoginPage({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const user = await getCurrentUser();
    if (user) {
        redirect('/');
    }

    const sp = await searchParams;
    const verified = sp.verified === '1';
    const reset = sp.reset === '1';
    const redirectParam =
        typeof sp.redirect === 'string' ? sp.redirect : undefined;

    const status = verified
        ? 'Votre adresse e-mail est confirmée. Connectez-vous pour continuer.'
        : reset
          ? 'Votre mot de passe a été réinitialisé.'
          : undefined;

    return <LoginForm status={status} redirectTo={redirectParam} />;
}

