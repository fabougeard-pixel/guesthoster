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
            avatarUrl={user.avatarUrl ?? null}
            role={user.role}
            accountType={
                (user.accountType as 'individual' | 'company') ?? 'individual'
            }
            companyName={user.companyName ?? ''}
            companyRegistration={user.companyRegistration ?? ''}
            profession={user.profession ?? ''}
            bio={user.bio ?? ''}
            spokenLanguages={user.spokenLanguages ?? 'Français'}
            responseTime={user.responseTime ?? "dans l'heure"}
            mustVerifyEmail={user.emailVerifiedAt === null}
            canBecomeHost={user.role === 'client'}
        />
    );
}

