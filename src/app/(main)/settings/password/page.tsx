import type { Metadata } from 'next';
import { requireAuthenticatedUser } from '@/lib/auth/session';
import { PasswordClient } from './password-client';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Mot de passe',
};

export default async function PasswordSettingsPage() {
    await requireAuthenticatedUser();
    return <PasswordClient />;
}

