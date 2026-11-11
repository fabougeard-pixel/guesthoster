import { NextResponse } from 'next/server';
import { getFreshSessionUser } from '@/lib/auth/session';
import { env } from '@/lib/env';
import { prisma } from '@/lib/prisma';

export async function GET(
    _request: Request,
    context: { params: Promise<{ id: string }> },
) {
    const user = await getFreshSessionUser();
    if (!user) {
        return NextResponse.redirect(`${env.appUrl}/login`);
    }

    const { id } = await context.params;
    const notification = await prisma.notification.findFirst({
        where: { id, notifiableId: user.id },
    });

    if (!notification) {
        return NextResponse.redirect(`${env.appUrl}/notifications`);
    }

    if (!notification.readAt) {
        await prisma.notification.update({
            where: { id: notification.id },
            data: { readAt: new Date() },
        });
    }

    let safePath = '/notifications';
    try {
        const parsed = JSON.parse(notification.data) as { url?: unknown };
        if (typeof parsed.url === 'string' && parsed.url) {
            const urlObj = new URL(parsed.url, env.appUrl);
            if (urlObj.pathname.startsWith('/')) {
                safePath = `${urlObj.pathname}${urlObj.search}`;
            }
        }
    } catch {
        // Keep default /notifications fallback
    }

    return NextResponse.redirect(`${env.appUrl}${safePath}`);
}

