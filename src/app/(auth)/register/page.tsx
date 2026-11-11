import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { RegisterForm } from './register-form';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Inscription',
};

export default async function RegisterPage({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const user = await getCurrentUser();
    if (user) {
        redirect('/');
    }

    const sp = await searchParams;
    const defaultRole = sp.role === 'host' ? 'host' : 'client';

    return <RegisterForm defaultRole={defaultRole} />;
}

