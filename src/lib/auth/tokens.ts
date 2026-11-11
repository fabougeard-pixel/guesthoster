import crypto from 'node:crypto';
import { env } from '@/lib/env';

function signPayload(payloadBase64: string): string {
    return crypto
        .createHmac('sha256', env.authSecret)
        .update(payloadBase64)
        .digest('base64url');
}

function timingSafeEquals(a: string, b: string): boolean {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) {
        return false;
    }

    return crypto.timingSafeEqual(bufA, bufB);
}

export function createSignedToken(
    data: Record<string, unknown>,
    ttlSeconds: number,
): string {
    const payload = {
        ...data,
        exp: Math.floor(Date.now() / 1000) + ttlSeconds,
    };
    const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString(
        'base64url',
    );
    const signature = signPayload(encoded);

    return `${encoded}.${signature}`;
}

export function verifySignedToken<T extends Record<string, unknown>>(
    token: string,
): T | null {
    const parts = token.split('.');
    if (parts.length !== 2) {
        return null;
    }

    const [encoded, signature] = parts;
    const expected = signPayload(encoded);
    if (!timingSafeEquals(expected, signature)) {
        return null;
    }

    try {
        const payload = JSON.parse(
            Buffer.from(encoded, 'base64url').toString('utf8'),
        ) as T & { exp?: number };

        if (
            typeof payload.exp !== 'number' ||
            payload.exp < Math.floor(Date.now() / 1000)
        ) {
            return null;
        }

        return payload;
    } catch {
        return null;
    }
}

