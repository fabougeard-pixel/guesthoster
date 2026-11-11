import { PrismaClient } from '@prisma/client';

export function normalizeDatabaseUrl(raw: string | undefined): string | undefined {
    const trimmed = raw?.trim();
    if (!trimmed) {
        return undefined;
    }

    try {
        const url = new URL(trimmed);
        if (url.port === '6543') {
            if (!url.searchParams.has('pgbouncer')) {
                url.searchParams.set('pgbouncer', 'true');
            }
            const currentLimit = Number(url.searchParams.get('connection_limit'));
            if (
                !url.searchParams.has('connection_limit') ||
                !Number.isFinite(currentLimit) ||
                currentLimit < 5
            ) {
                url.searchParams.set('connection_limit', '5');
            }
            const currentTimeout = Number(url.searchParams.get('pool_timeout'));
            if (
                !url.searchParams.has('pool_timeout') ||
                !Number.isFinite(currentTimeout) ||
                currentTimeout < 20
            ) {
                url.searchParams.set('pool_timeout', '20');
            }
        }
        const isLocal =
            url.hostname === 'localhost' || url.hostname === '127.0.0.1';
        if (!isLocal && !url.searchParams.has('sslmode')) {
            url.searchParams.set('sslmode', 'require');
        }
        return url.toString();
    } catch {
        return trimmed;
    }
}

export function resolveRuntimeDatabaseUrl(): string | undefined {
    return normalizeDatabaseUrl(
        process.env.DATABASE_URL ||
        process.env.POSTGRES_PRISMA_URL ||
        process.env.POSTGRES_URL ||
        process.env.DB_URL,
    );
}

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

const datasourceUrl = resolveRuntimeDatabaseUrl();

export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        ...(datasourceUrl ? { datasources: { db: { url: datasourceUrl } } } : {}),
        log:
            process.env.NODE_ENV === 'development'
                ? ['warn', 'error']
                : ['error'],
    });

globalForPrisma.prisma = prisma;
