import { NextResponse } from 'next/server';
import { getFreshSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';

export async function GET() {
    const user = await getFreshSessionUser();
    if (!user) {
        return NextResponse.json({
            unreadNotifications: 0,
            unreadMessages: 0,
        });
    }

    const [unreadNotifications, unreadMessages] = await Promise.all([
        prisma.notification.count({
            where: {
                notifiableId: user.id,
                readAt: null,
            },
        }),
        prisma.message.count({
            where: {
                readAt: null,
                userId: { not: user.id },
                booking: {
                    OR: [
                        { userId: user.id },
                        { property: { userId: user.id } },
                    ],
                },
            },
        }),
    ]);

    return NextResponse.json({
        unreadNotifications,
        unreadMessages,
    });
}

