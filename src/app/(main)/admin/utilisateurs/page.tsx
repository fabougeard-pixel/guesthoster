import type { Metadata } from 'next';
import type { Prisma } from '@prisma/client';
import { getCurrentUser } from '@/lib/auth/session';
import {
    USER_ROLE_LABELS,
    USER_ROLES,
    type UserRole,
} from '@/lib/domain/enums';
import { buildPaginated } from '@/lib/domain/properties';
import { prisma } from '@/lib/prisma';
import { firstParam, parsePageParam } from '@/lib/search-params';
import type { AdminUser } from '@/types';
import { AdminUsersClient } from './admin-users-client';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Utilisateurs · Administration',
};

export default async function AdminUsersPage({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const [viewer, sp] = await Promise.all([getCurrentUser(), searchParams]);
    const search = firstParam(sp.search).trim();
    const rawRole = firstParam(sp.role).trim();
    const role = (USER_ROLES as readonly string[]).includes(rawRole)
        ? (rawRole as UserRole)
        : '';
    const suspended = firstParam(sp.suspended) === '1';
    const page = parsePageParam(sp.page);
    const perPage = 25;

    const where: Prisma.UserWhereInput = {
        ...(role ? { role } : {}),
        ...(suspended ? { suspendedAt: { not: null } } : {}),
        ...(search
            ? {
                  OR: [
                      { name: { contains: search, mode: 'insensitive' } },
                      { email: { contains: search, mode: 'insensitive' } },
                  ],
              }
            : {}),
    };

    const [total, rows] = await Promise.all([
        prisma.user.count({ where }),
        prisma.user.findMany({
            where,
            include: {
                _count: {
                    select: {
                        properties: true,
                        bookings: true,
                    },
                },
            },
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            skip: (page - 1) * perPage,
            take: perPage,
        }),
    ]);

    const items: AdminUser[] = rows.map((row) => {
        const userRole = row.role as UserRole;
        return {
            id: row.id,
            name: row.name,
            email: row.email,
            role: userRole,
            role_label: USER_ROLE_LABELS[userRole] ?? row.role,
            verified: Boolean(row.emailVerifiedAt),
            suspended_at: row.suspendedAt?.toISOString() ?? null,
            created_at: row.createdAt?.toISOString() ?? null,
            properties: row._count.properties,
            bookings: row._count.bookings,
            is_self: row.id === viewer?.id,
        };
    });

    const paginator = buildPaginated(items, total, page, perPage, '/admin/utilisateurs', {
        search: search || undefined,
        role: role || undefined,
        suspended: suspended ? '1' : undefined,
    });

    return (
        <AdminUsersClient
            users={paginator}
            filters={{ search, role, suspended }}
        />
    );
}

