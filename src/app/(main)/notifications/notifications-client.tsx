'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/button';
import { Card, Container } from '@/components/card';
import { Pagination } from '@/components/pagination';
import { useAppState } from '@/components/providers';
import { useActionFeedback } from '@/components/use-action-feedback';
import { markAllNotificationsReadAction } from '@/lib/actions/bookings';
import { formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Paginated } from '@/types';

export type AppNotificationItem = {
    id: string;
    title: string;
    body: string;
    read: boolean;
    created_at: string | null;
};

export function NotificationsClient({
    notifications,
}: {
    notifications: Paginated<AppNotificationItem>;
}) {
    const { unreadNotifications } = useAppState();
    const { applyResult } = useActionFeedback();
    const [loading, setLoading] = useState(false);

    async function markAllRead() {
        setLoading(true);
        try {
            const res = await markAllNotificationsReadAction();
            applyResult(res);
        } finally {
            setLoading(false);
        }
    }

    return (
        <Container className="max-w-3xl py-10">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <h1 className="text-2xl font-semibold">Notifications</h1>
                {unreadNotifications > 0 && (
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        loading={loading}
                        onClick={() => void markAllRead()}
                    >
                        Tout marquer comme lu
                    </Button>
                )}
            </div>

            {notifications.data.length === 0 ? (
                <Card className="mt-8 px-6 py-16 text-center text-sm text-zinc-500 dark:text-zinc-400">
                    Vous n’avez aucune notification.
                </Card>
            ) : (
                <ul className="mt-6 flex flex-col divide-y divide-zinc-200 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
                    {notifications.data.map((notification) => (
                        <li key={notification.id}>
                            <Link
                                href={`/notifications/${notification.id}`}
                                className={cn(
                                    'flex gap-3 px-5 py-4 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50',
                                    !notification.read &&
                                        'bg-primary-50/50 dark:bg-primary-950/30',
                                )}
                            >
                                <span
                                    className={cn(
                                        'mt-2 size-2 shrink-0 rounded-full',
                                        notification.read
                                            ? 'bg-transparent'
                                            : 'bg-primary-600',
                                    )}
                                    aria-hidden="true"
                                />
                                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                                    <span
                                        className={cn(
                                            'text-sm',
                                            notification.read
                                                ? 'font-medium'
                                                : 'font-semibold',
                                        )}
                                    >
                                        {notification.title}
                                        {!notification.read && (
                                            <span className="sr-only">
                                                {' '}
                                                (non lue)
                                            </span>
                                        )}
                                    </span>
                                    <span className="text-sm text-zinc-600 dark:text-zinc-400">
                                        {notification.body}
                                    </span>
                                    {notification.created_at && (
                                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                            {formatDateTime(
                                                notification.created_at,
                                            )}
                                        </span>
                                    )}
                                </span>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}

            <Pagination paginator={notifications} noun="notification" />
        </Container>
    );
}

