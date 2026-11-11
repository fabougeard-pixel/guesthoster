import type { Metadata } from 'next';
import { requireAuthenticatedUser } from '@/lib/auth/session';
import { buildPaginated } from '@/lib/domain/properties';
import { prisma } from '@/lib/prisma';
import {
    type AppNotificationItem,
    NotificationsClient,
} from './notifications-client';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Notifications',
};

function parseNotificationPayload(raw: string): {
    title: string;
    body: string;
} {
    try {
        const parsed = JSON.parse(raw) as {
            title?: unknown;
            body?: unknown;
        };
        return {
            title:
                typeof parsed.title === 'string' && parsed.title
                    ? parsed.title
                    : 'Notification',
            body: typeof parsed.body === 'string' ? parsed.body : '',
        };
    } catch {
        return { title: 'Notification', body: '' };
    }
}

export default async function NotificationsPage({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const user = await requireAuthenticatedUser();
    const sp = await searchParams;
    const rawPage = Array.isArray(sp.page) ? sp.page[0] : sp.page;
    const page =
        rawPage && /^\d+$/.test(rawPage)
            ? Math.max(1, Number.parseInt(rawPage, 10))
            : 1;
    const perPage = 20;

    const where = { notifiableId: user.id };
    const [total, rows] = await Promise.all([
        prisma.notification.count({ where }),
        prisma.notification.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * perPage,
            take: perPage,
        }),
    ]);

    const items: AppNotificationItem[] = rows.map((row) => {
        const payload = parseNotificationPayload(row.data);
        return {
            id: row.id,
            title: payload.title,
            body: payload.body,
            read: row.readAt !== null,
            created_at: row.createdAt ? row.createdAt.toISOString() : null,
        };
    });

    const notifications = buildPaginated(
        items,
        total,
        page,
        perPage,
        '/notifications',
    );

    return <NotificationsClient notifications={notifications} />;
}

