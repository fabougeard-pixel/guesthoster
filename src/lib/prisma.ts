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
            if (!url.searchParams.has('connection_limit')) {
                url.searchParams.set('connection_limit', '1');
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

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}
