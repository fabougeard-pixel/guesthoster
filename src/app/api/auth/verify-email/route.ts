import { NextResponse } from 'next/server';
import {
    getFreshSessionUser,
    sha256Hex,
    verifyEmailVerificationToken,
} from '@/lib/auth/session';
import { env } from '@/lib/env';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
        return NextResponse.redirect(`${env.appUrl}/email/verify?status=invalid`);
    }

    const payload = verifyEmailVerificationToken(token);
    if (!payload) {
        return NextResponse.redirect(`${env.appUrl}/email/verify?status=invalid`);
    }

    const user = await prisma.user.findUnique({ where: { id: payload.uid } });
    if (
        !user ||
        user.suspendedAt !== null ||
        sha256Hex(user.email.toLowerCase()) !== payload.emailHash
    ) {
        return NextResponse.redirect(`${env.appUrl}/email/verify?status=invalid`);
    }

    if (!user.emailVerifiedAt) {
        await prisma.user.update({
            where: { id: user.id },
            data: { emailVerifiedAt: new Date() },
        });
    }

    const current = await getFreshSessionUser();
    if (current && current.id === user.id) {
        const dest = user.role === 'host' ? '/hote?verified=1' : '/?verified=1';
        return NextResponse.redirect(`${env.appUrl}${dest}`);
    }

    return NextResponse.redirect(`${env.appUrl}/login?verified=1`);
}

