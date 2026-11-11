import crypto from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { createSignedToken, verifySignedToken } from '@/lib/auth/tokens';
import {
    normalizeDatabaseUrl,
    resolveRuntimeDatabaseUrl,
} from '@/lib/prisma';
import {
    cloudinaryDeliveryUrls,
    isValidPropertyPublicId,
    signPropertyUpload,
    verifyCloudinaryUploadSignature,
} from '@/lib/services/cloudinary';
import { renderEmailHtml } from '@/lib/services/resend';

afterEach(() => {
    vi.unstubAllEnvs();
});

describe('Password hashing compatibility', () => {
    it('hashes with $2b$ and verifies both $2b$ and Laravel $2y$ hashes', async () => {
        const hash = await hashPassword('SecretPass123!');
        expect(hash.startsWith('$2b$') || hash.startsWith('$2a$')).toBe(true);

        expect(await verifyPassword('SecretPass123!', hash)).toBe(true);
        expect(await verifyPassword('WrongPass', hash)).toBe(false);

        const laravelHash = `$2y$${hash.slice(4)}`;
        expect(await verifyPassword('SecretPass123!', laravelHash)).toBe(true);
    });
});

describe('Signed HMAC tokens', () => {
    it('roundtrips valid tokens and rejects tampering or expiry', () => {
        vi.stubEnv('AUTH_SECRET', 'unit-test-secret-value-at-least-32-chars');

        const token = createSignedToken({ userId: 7, purpose: 'verify' }, 300);
        const parsed = verifySignedToken<{ userId: number; purpose: string }>(
            token,
        );

        expect(parsed?.userId).toBe(7);
        expect(parsed?.purpose).toBe('verify');

        const [payload, sig] = token.split('.');
        const tamperedSig = `${sig.slice(0, -1)}${sig.endsWith('a') ? 'b' : 'a'}`;
        expect(verifySignedToken(`${payload}.${tamperedSig}`)).toBeNull();

        const expired = createSignedToken({ userId: 7 }, -10);
        expect(verifySignedToken(expired)).toBeNull();
    });
});

describe('Cloudinary signing and delivery URLs', () => {
    it('signs uploads, verifies callbacks and restricts property folders', () => {
        vi.stubEnv('CLOUDINARY_CLOUD_NAME', 'demo-cloud');
        vi.stubEnv('CLOUDINARY_API_KEY', '123456789');
        vi.stubEnv('CLOUDINARY_API_SECRET', 'super-secret-api');
        vi.stubEnv('CLOUDINARY_FOLDER', 'guesthoster');

        const signed = signPropertyUpload(12, 1_700_000_000);
        expect(signed.upload_url).toBe(
            'https://api.cloudinary.com/v1_1/demo-cloud/image/upload',
        );
        expect(signed.params.folder).toBe('guesthoster/properties/12');
        expect(signed.params.api_key).toBe('123456789');

        const publicId = 'guesthoster/properties/12/salon';
        const version = 1_700_000_123;
        const expectedSig = crypto
            .createHash('sha1')
            .update(`public_id=${publicId}&version=${version}super-secret-api`)
            .digest('hex');

        expect(
            verifyCloudinaryUploadSignature(publicId, version, expectedSig),
        ).toBe(true);
        expect(
            verifyCloudinaryUploadSignature(publicId, version + 1, expectedSig),
        ).toBe(false);

        expect(isValidPropertyPublicId(12, publicId)).toBe(true);
        expect(
            isValidPropertyPublicId(13, publicId),
        ).toBe(false);
        expect(
            isValidPropertyPublicId(12, 'guesthoster/properties/12/../13/hack'),
        ).toBe(false);

        const urls = cloudinaryDeliveryUrls(`/${publicId}`);
        expect(urls.url).toBe(
            'https://res.cloudinary.com/demo-cloud/image/upload/f_auto,q_auto,c_limit,w_1600,h_1600/guesthoster/properties/12/salon',
        );
        expect(urls.thumbnail_url).toBe(
            'https://res.cloudinary.com/demo-cloud/image/upload/f_auto,q_auto,c_limit,w_640,h_640/guesthoster/properties/12/salon',
        );
    });
});

describe('Resend HTML email rendering', () => {
    it('escapes HTML injection inside dynamic content', () => {
        const html = renderEmailHtml({
            greeting: 'Bonjour <script>alert(1)</script>',
            lines: ['Message "sécurisé" & vérifié'],
            actionLabel: 'Voir <ici>',
            actionUrl: 'https://guesthoster.example/test?a=1&b=2',
        });

        expect(html).not.toContain('<script>');
        expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
        expect(html).toContain('&quot;sécurisé&quot; &amp; vérifié');
        expect(html).toContain('a=1&amp;b=2');
    });
});

describe('Supabase PostgreSQL URL normalization', () => {
    it('adds pgbouncer=true, connection_limit=5, pool_timeout=20 and sslmode=require for pooler port 6543', () => {
        const normalized = normalizeDatabaseUrl(
            'postgresql://postgres.demo:secret@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?connection_limit=1',
        );
        expect(normalized).toBeDefined();
        const url = new URL(normalized!);
        expect(url.searchParams.get('pgbouncer')).toBe('true');
        expect(url.searchParams.get('connection_limit')).toBe('5');
        expect(url.searchParams.get('pool_timeout')).toBe('20');
        expect(url.searchParams.get('sslmode')).toBe('require');
    });

    it('falls back to DB_URL when DATABASE_URL is absent', () => {
        vi.stubEnv('DATABASE_URL', '');
        vi.stubEnv('POSTGRES_PRISMA_URL', '');
        vi.stubEnv('POSTGRES_URL', '');
        vi.stubEnv(
            'DB_URL',
            'postgresql://postgres:pw@aws-1-eu-west-1.pooler.supabase.com:6543/postgres',
        );

        const resolved = resolveRuntimeDatabaseUrl();
        expect(resolved).toContain('pgbouncer=true');
        expect(resolved).toContain('sslmode=require');
    });
});

