import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireAuthenticatedUser } from '@/lib/auth/session';
import { VerifyEmailForm } from './verify-email-form';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Confirmez votre adresse e-mail',
};

export default async function VerifyEmailPage({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const user = await requireAuthenticatedUser();
    if (user.emailVerifiedAt) {
        redirect('/');
    }

    const sp = await searchParams;
    return <VerifyEmailForm invalidLink={sp.status === 'invalid'} />;
}

