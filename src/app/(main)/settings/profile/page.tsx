import type { Metadata } from 'next';
import { requireAuthenticatedUser } from '@/lib/auth/session';
import { ProfileClient } from './profile-client';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Profil',
};

export default async function ProfileSettingsPage() {
    const user = await requireAuthenticatedUser();

    return (
        <ProfileClient
            name={user.name}
            email={user.email}
            mustVerifyEmail={user.emailVerifiedAt === null}
            canBecomeHost={user.role === 'client'}
        />
    );
}

