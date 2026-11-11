'use client';

import { useEffect } from 'react';
import { ErrorView } from '@/components/error-view';
import { PublicLayout } from '@/components/layouts/public-layout';
import { useAppState } from '@/components/providers';

export default function GlobalErrorPage({
    error,
}: {
    error: Error & { digest?: string };
}) {
    const { user } = useAppState();

    useEffect(() => {
        console.error('[GuestHoster Error]', error);
    }, [error]);

    return (
        <PublicLayout user={user}>
            <ErrorView status={500} digest={error.digest} />
        </PublicLayout>
    );
}
