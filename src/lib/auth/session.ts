import crypto from 'node:crypto';
import type { User as PrismaUser } from '@prisma/client';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { createSignedToken, verifySignedToken } from '@/lib/auth/tokens';
import type { UserRole } from '@/lib/domain/enums';
import { env } from '@/lib/env';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/services/resend';
import type { User } from '@/types';

const SESSION_COOKIE = 'gh_session';
const PASSWORD_CONFIRM_COOKIE = 'gh_pw_confirmed';

const DEFAULT_SESSION_TTL_SECONDS = 60 * 60 * 24 * 2;
const REMEMBER_SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
const PASSWORD_CONFIRM_TTL_SECONDS = 60 * 60 * 3;
const EMAIL_VERIFY_TTL_SECONDS = 60 * 60;
const PASSWORD_RESET_TTL_SECONDS = 60 * 60;

type SessionTokenPayload = {
    uid: number;
    remember?: boolean;
};

type VerifyEmailTokenPayload = {
    purpose: 'verify-email';
    uid: number;
    emailHash: string;
};

export function serializeUser(user: PrismaUser): User {
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role as UserRole,
        email_verified_at: user.emailVerifiedAt
            ? user.emailVerifiedAt.toISOString()
            : null,
        created_at: (user.createdAt ?? new Date()).toISOString(),
        updated_at: (user.updatedAt ?? new Date()).toISOString(),
    };
}

export async function createSessionCookie(
    userId: number,
    remember = false,
): Promise<void> {
    const ttl = remember
        ? REMEMBER_SESSION_TTL_SECONDS
        : DEFAULT_SESSION_TTL_SECONDS;
    const token = createSignedToken({ uid: userId, remember }, ttl);
    const cookieStore = await cookies();

    cookieStore.set(SESSION_COOKIE, token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: env.isProduction,
        path: '/',
        ...(remember ? { maxAge: ttl } : {}),
    });
}

export async function clearSessionCookie(): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE);
    cookieStore.delete(PASSWORD_CONFIRM_COOKIE);
}

export async function markPasswordConfirmed(userId: number): Promise<void> {
    const token = createSignedToken(
        { uid: userId, purpose: 'pw-confirm' },
        PASSWORD_CONFIRM_TTL_SECONDS,
    );
    const cookieStore = await cookies();
    cookieStore.set(PASSWORD_CONFIRM_COOKIE, token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: env.isProduction,
        path: '/',
        maxAge: PASSWORD_CONFIRM_TTL_SECONDS,
    });
}

export async function hasConfirmedPasswordRecently(
    userId: number,
): Promise<boolean> {
    const cookieStore = await cookies();
    const raw = cookieStore.get(PASSWORD_CONFIRM_COOKIE)?.value;
    if (!raw) {
        return false;
    }

    const payload = verifySignedToken<{ uid: number; purpose: string }>(raw);
    return Boolean(
        payload && payload.purpose === 'pw-confirm' && payload.uid === userId,
    );
}

async function fetchActiveUserFromCookies(): Promise<PrismaUser | null> {
    const cookieStore = await cookies();
    const raw = cookieStore.get(SESSION_COOKIE)?.value;
    if (!raw) {
        return null;
    }

    const payload = verifySignedToken<SessionTokenPayload>(raw);
    if (!payload || typeof payload.uid !== 'number') {
        return null;
    }

    const user = await prisma.user.findUnique({
        where: { id: payload.uid },
    });

    if (!user || user.suspendedAt !== null) {
        return null;
    }

    return user;
}

/**
 * Per-request memoized active user lookup for Server Components.
 */
export const getSessionUserRecord = cache(fetchActiveUserFromCookies);

export const getCurrentUser = cache(async (): Promise<User | null> => {
    const record = await getSessionUserRecord();
    return record ? serializeUser(record) : null;
});

/**
 * Uncached lookup for Route Handlers and Server Actions executing mutations.
 */
export async function getFreshSessionUser(): Promise<PrismaUser | null> {
    return fetchActiveUserFromCookies();
}

export async function requireAuthenticatedUser(
    redirectTo?: string,
): Promise<PrismaUser> {
    const user = await getSessionUserRecord();
    if (!user) {
        const target = redirectTo
            ? `/login?redirect=${encodeURIComponent(redirectTo)}`
            : '/login';
        redirect(target);
    }

    return user;
}

export async function requireVerifiedUser(
    redirectTo?: string,
): Promise<PrismaUser> {
    const user = await requireAuthenticatedUser(redirectTo);
    if (!user.emailVerifiedAt) {
        redirect('/email/verify');
    }

    return user;
}

export function isHostOrAdmin(user: Pick<PrismaUser, 'role'>): boolean {
    return user.role === 'host' || user.role === 'admin';
}

export function isAdmin(user: Pick<PrismaUser, 'role'>): boolean {
    return user.role === 'admin';
}

/**
 * Per-request memoized check for whether at least one admin account exists.
 */
export const hasAdminUser = cache(async (): Promise<boolean> => {
    const admin = await prisma.user.findFirst({
        where: { role: 'admin' },
        select: { id: true },
    });

    return admin !== null;
});

/**
 * Resolves admin access without an extra DB query when the active session already belongs to a verified admin.
 */
export async function resolveAdminAccess(
    currentPath = '/admin',
): Promise<'setup' | 'forbidden' | PrismaUser> {
    const user = await getSessionUserRecord();
    if (user && isAdmin(user)) {
        if (!user.emailVerifiedAt) {
            redirect('/email/verify');
        }
        return user;
    }

    if (!(await hasAdminUser())) {
        return 'setup';
    }

    if (!user) {
        redirect(`/login?redirect=${encodeURIComponent(currentPath)}`);
    }

    if (!user.emailVerifiedAt) {
        redirect('/email/verify');
    }

    return 'forbidden';
}

/**
 * Protects /admin subpages: redirects to /admin if setup is still pending,
 * to /login if unauthenticated, or returns null when the verified user is not an admin.
 */
export async function requireAdminAccess(
    currentPath = '/admin',
): Promise<PrismaUser | null> {
    const access = await resolveAdminAccess(currentPath);
    if (access === 'setup') {
        redirect('/admin');
    }
    if (access === 'forbidden') {
        return null;
    }

    return access;
}

export function sha256Hex(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex');
}

export function createEmailVerificationUrl(userId: number, email: string): string {
    const token = createSignedToken(
        {
            purpose: 'verify-email',
            uid: userId,
            emailHash: sha256Hex(email.toLowerCase()),
        },
        EMAIL_VERIFY_TTL_SECONDS,
    );

    return `${env.appUrl}/api/auth/verify-email?token=${encodeURIComponent(token)}`;
}

export function verifyEmailVerificationToken(token: string): {
    uid: number;
    emailHash: string;
} | null {
    const payload = verifySignedToken<VerifyEmailTokenPayload>(token);
    if (
        !payload ||
        payload.purpose !== 'verify-email' ||
        typeof payload.uid !== 'number' ||
        typeof payload.emailHash !== 'string'
    ) {
        return null;
    }

    return { uid: payload.uid, emailHash: payload.emailHash };
}

export async function sendVerificationEmail(user: {
    id: number;
    name: string;
    email: string;
}): Promise<boolean> {
    const verifyUrl = createEmailVerificationUrl(user.id, user.email);

    return sendEmail({
        to: user.email,
        subject: 'Vérifiez votre adresse e-mail — GuestHoster',
        greeting: `Bonjour ${user.name},`,
        lines: [
            'Merci d’avoir créé un compte sur GuestHoster.',
            'Cliquez sur le bouton ci-dessous pour vérifier votre adresse e-mail et activer votre compte :',
        ],
        actionLabel: 'Vérifier mon adresse e-mail',
        actionUrl: verifyUrl,
    });
}

export async function createPasswordResetRecord(email: string): Promise<string> {
    const normalized = email.trim().toLowerCase();
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashed = sha256Hex(rawToken);

    await prisma.passwordResetToken.upsert({
        where: { email: normalized },
        update: { token: hashed, createdAt: new Date() },
        create: { email: normalized, token: hashed, createdAt: new Date() },
    });

    return rawToken;
}

export async function isPasswordResetTokenValid(
    email: string,
    rawToken: string,
): Promise<boolean> {
    const normalized = email.trim().toLowerCase();
    const record = await prisma.passwordResetToken.findUnique({
        where: { email: normalized },
    });

    if (!record || !record.createdAt) {
        return false;
    }

    const ageSeconds = (Date.now() - record.createdAt.getTime()) / 1000;
    if (ageSeconds > PASSWORD_RESET_TTL_SECONDS) {
        return false;
    }

    const expected = Buffer.from(record.token, 'utf8');
    const candidate = Buffer.from(sha256Hex(rawToken), 'utf8');
    if (expected.length !== candidate.length) {
        return false;
    }

    return crypto.timingSafeEqual(expected, candidate);
}

