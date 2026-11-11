import { NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { prisma } from '@/lib/prisma';
import { isCloudinaryConfigured } from '@/lib/services/cloudinary';
import { isStripeConfigured } from '@/lib/services/stripe';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
    const envStatus = {
        databaseUrl: Boolean(
            process.env.DATABASE_URL?.trim() ||
                process.env.POSTGRES_PRISMA_URL?.trim() ||
                process.env.POSTGRES_URL?.trim() ||
                process.env.DB_URL?.trim(),
        ),
        directUrl: Boolean(process.env.DIRECT_URL?.trim()),
        authSecret: Boolean(
            process.env.AUTH_SECRET?.trim() || process.env.APP_KEY?.trim(),
        ),
        resend: Boolean(env.resendApiKey),
        cloudinary: isCloudinaryConfigured(),
        stripe: isStripeConfigured(),
    };

    try {
        await prisma.$queryRaw`SELECT 1`;
        return NextResponse.json({
            ok: true,
            framework: 'nextjs',
            env: envStatus,
            db: 'connected',
        });
    } catch (error) {
        const code =
            error &&
            typeof error === 'object' &&
            'code' in error &&
            typeof error.code === 'string'
                ? error.code
                : undefined;
        const name = error instanceof Error ? error.name : 'UnknownError';
        console.error('[HealthCheck] Database check failed:', { name, code });

        return NextResponse.json(
            {
                ok: false,
                framework: 'nextjs',
                env: envStatus,
                db: 'error',
                errorName: name,
                ...(code ? { errorCode: code } : {}),
            },
            { status: 503 },
        );
    }
}

