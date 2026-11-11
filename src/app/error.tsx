'use client';

import { ErrorView } from '@/components/error-view';
import { PublicLayout } from '@/components/layouts/public-layout';
import { useAppState } from '@/components/providers';

export default function GlobalErrorPage({
    error,
}: {
    error: Error & { digest?: string };
}) {
    const { user } = useAppState();
    void error;

    return (
        <PublicLayout user={user}>
            <ErrorView status={500} />
        </PublicLayout>
    );
}

