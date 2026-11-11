import { ErrorView } from '@/components/error-view';
import { PublicLayout } from '@/components/layouts/public-layout';
import { getCurrentUser } from '@/lib/auth/session';

export default async function NotFoundPage() {
    let user = null;
    try {
        user = await getCurrentUser();
    } catch {
        // Ignore DB unavailability on error fallback
    }

    return (
        <PublicLayout user={user}>
            <ErrorView status={404} />
        </PublicLayout>
    );
}

