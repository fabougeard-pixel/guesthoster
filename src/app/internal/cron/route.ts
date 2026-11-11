import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { runMaintenanceCron } from '@/lib/domain/bookings';
import { env } from '@/lib/env';

export const runtime = 'nodejs';

function isAuthorized(request: Request): boolean {
    const secret = env.cronSecret;
    if (!secret) {
        return false;
    }

    const header = request.headers.get('authorization') ?? '';
    const match = /^Bearer\s+(.+)$/i.exec(header.trim());
    if (!match) {
        return false;
    }

    const expected = Buffer.from(secret, 'utf8');
    const provided = Buffer.from(match[1] ?? '', 'utf8');
    if (expected.length !== provided.length) {
        return false;
    }

    return crypto.timingSafeEqual(expected, provided);
}

export async function GET(request: Request) {
    if (!isAuthorized(request)) {
        return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
    }

    const summary = await runMaintenanceCron();
    return NextResponse.json({ ok: true, ...summary });
}

