'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import {
    type AdminSetupInput,
    createInitialAdminUser,
} from '@/lib/auth/admin-setup';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import {
    clearSessionCookie,
    createPasswordResetRecord,
    createSessionCookie,
    getFreshSessionUser,
    isPasswordResetTokenValid,
    markPasswordConfirmed,
    sendVerificationEmail,
} from '@/lib/auth/session';
import { env } from '@/lib/env';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/services/resend';
import {
    type ActionResult,
    safeInternalPath,
    zodToFieldErrors,
} from './types';

const loginSchema = z.object({
    email: z.string().trim().email('Adresse e-mail invalide.'),
    password: z.string().min(1, 'Veuillez saisir votre mot de passe.'),
    remember: z.boolean().optional(),
    redirectTo: z.string().optional(),
});

const registerSchema = z
    .object({
        name: z
            .string()
            .trim()
            .min(2, 'Le nom doit contenir au moins 2 caractères.')
            .max(255, 'Le nom ne doit pas dépasser 255 caractères.'),
        email: z
            .string()
            .trim()
            .email('Veuillez saisir une adresse e-mail valide.')
            .max(255),
        role: z.enum(['client', 'host']),
        password: z
            .string()
            .min(8, 'Le mot de passe doit contenir au moins 8 caractères.'),
        password_confirmation: z.string(),
    })
    .refine((data) => data.password === data.password_confirmation, {
        path: ['password_confirmation'],
        message: 'La confirmation du mot de passe ne correspond pas.',
    });

const resetPasswordSchema = z
    .object({
        token: z.string().min(1, 'Jeton manquant.'),
        email: z.string().trim().email('Adresse e-mail invalide.'),
        password: z
            .string()
            .min(8, 'Le mot de passe doit contenir au moins 8 caractères.'),
        password_confirmation: z.string(),
    })
    .refine((data) => data.password === data.password_confirmation, {
        path: ['password_confirmation'],
        message: 'La confirmation du mot de passe ne correspond pas.',
    });

export async function loginAction(input: {
    email: string;
    password: string;
    remember?: boolean;
    redirectTo?: string;
}): Promise<ActionResult> {
    const parsed = loginSchema.safeParse(input);
    if (!parsed.success) {
        return { ok: false, fieldErrors: zodToFieldErrors(parsed.error) };
    }

    const email = parsed.data.email.toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !(await verifyPassword(parsed.data.password, user.password))) {
        return {
            ok: false,
            fieldErrors: {
                email: 'Ces identifiants ne correspondent à aucun compte.',
            },
        };
    }

    if (user.suspendedAt !== null) {
        return {
            ok: false,
            fieldErrors: {
                email: 'Votre compte a été suspendu. Contactez l’équipe GuestHoster.',
            },
        };
    }

    await createSessionCookie(user.id, Boolean(parsed.data.remember));
    revalidatePath('/', 'layout');

    return {
        ok: true,
        redirectTo: safeInternalPath(
            parsed.data.redirectTo,
            user.role === 'admin' ? '/admin' : '/',
        ),
    };
}

export async function setupInitialAdminAction(
    input: AdminSetupInput,
): Promise<ActionResult> {
    const outcome = await createInitialAdminUser(input, prisma);
    if (!outcome.ok) {
        if (outcome.alreadyConfigured) {
            revalidatePath('/admin', 'layout');
        }
        return {
            ok: false,
            error: outcome.error,
            fieldErrors: outcome.fieldErrors,
        };
    }

    await clearSessionCookie();
    revalidatePath('/', 'layout');
    revalidatePath('/admin', 'layout');

    return {
        ok: true,
        redirectTo: '/login?redirect=%2Fadmin&admin_setup=1',
        toast: {
            type: 'success',
            message:
                'Compte administrateur créé. Connectez-vous pour accéder à l’administration.',
        },
    };
}

export async function registerAction(input: {
    name: string;
    email: string;
    role: 'client' | 'host';
    password: string;
    password_confirmation: string;
}): Promise<ActionResult> {
    const parsed = registerSchema.safeParse(input);
    if (!parsed.success) {
        return { ok: false, fieldErrors: zodToFieldErrors(parsed.error) };
    }

    const email = parsed.data.email.toLowerCase();
    const existing = await prisma.user.findUnique({
        where: { email },
        select: { id: true },
    });

    if (existing) {
        return {
            ok: false,
            fieldErrors: {
                email: 'Cette adresse e-mail est déjà utilisée.',
            },
        };
    }

    const passwordHash = await hashPassword(parsed.data.password);
    const user = await prisma.user.create({
        data: {
            name: parsed.data.name,
            email,
            role: parsed.data.role,
            password: passwordHash,
        },
    });

    await createSessionCookie(user.id, false);
    await sendVerificationEmail(user).catch((err) => {
        console.warn('Échec envoi e-mail vérification :', err);
    });

    revalidatePath('/', 'layout');

    return {
        ok: true,
        redirectTo: '/email/verify',
        toast: {
            type: 'success',
            message: 'Bienvenue ! Vérifiez votre adresse e-mail pour commencer.',
        },
    };
}

export async function logoutAction(): Promise<ActionResult> {
    await clearSessionCookie();
    revalidatePath('/', 'layout');
    return {
        ok: true,
        redirectTo: '/',
    };
}

export async function resendVerificationEmailAction(): Promise<ActionResult> {
    const user = await getFreshSessionUser();
    if (!user) {
        return { ok: false, error: 'Authentification requise.' };
    }

    if (user.emailVerifiedAt !== null) {
        return {
            ok: true,
            redirectTo: '/',
            toast: { type: 'info', message: 'Votre adresse e-mail est déjà vérifiée.' },
        };
    }

    await sendVerificationEmail(user).catch((err) => {
        console.warn('Échec envoi e-mail vérification :', err);
    });

    return {
        ok: true,
        toast: {
            type: 'success',
            message: 'Un nouveau lien de vérification vient de vous être envoyé.',
        },
    };
}

export async function forgotPasswordAction(input: {
    email: string;
}): Promise<ActionResult> {
    const emailSchema = z.object({
        email: z.string().trim().email('Veuillez saisir une adresse e-mail valide.'),
    });
    const parsed = emailSchema.safeParse(input);
    if (!parsed.success) {
        return { ok: false, fieldErrors: zodToFieldErrors(parsed.error) };
    }

    const email = parsed.data.email.toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });

    if (user && user.suspendedAt === null) {
        const rawToken = await createPasswordResetRecord(email);
        const resetUrl = `${env.appUrl}/reset-password?token=${encodeURIComponent(rawToken)}&email=${encodeURIComponent(email)}`;

        await sendEmail({
            to: user.email,
            subject: 'Réinitialisation de votre mot de passe — GuestHoster',
            greeting: `Bonjour ${user.name},`,
            lines: [
                'Vous recevez cet e-mail car une demande de réinitialisation de mot de passe a été effectuée pour votre compte.',
                'Ce lien expirera dans 60 minutes.',
            ],
            actionLabel: 'Réinitialiser le mot de passe',
            actionUrl: resetUrl,
        }).catch((err) => {
            console.warn('Échec envoi e-mail réinitialisation :', err);
        });
    }

    return {
        ok: true,
        toast: {
            type: 'success',
            message:
                'Si un compte correspond à cette adresse, un lien de réinitialisation vous a été envoyé.',
        },
    };
}

export async function resetPasswordAction(input: {
    token: string;
    email: string;
    password: string;
    password_confirmation: string;
}): Promise<ActionResult> {
    const parsed = resetPasswordSchema.safeParse(input);
    if (!parsed.success) {
        return { ok: false, fieldErrors: zodToFieldErrors(parsed.error) };
    }

    const email = parsed.data.email.toLowerCase();
    const valid = await isPasswordResetTokenValid(email, parsed.data.token);
    if (!valid) {
        return {
            ok: false,
            fieldErrors: {
                email: 'Ce lien de réinitialisation est invalide ou a expiré.',
            },
        };
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        return {
            ok: false,
            fieldErrors: { email: 'Compte introuvable.' },
        };
    }

    const passwordHash = await hashPassword(parsed.data.password);
    await prisma.$transaction([
        prisma.user.update({
            where: { id: user.id },
            data: { password: passwordHash },
        }),
        prisma.passwordResetToken.delete({ where: { email } }),
    ]);

    return {
        ok: true,
        redirectTo: '/login',
        toast: {
            type: 'success',
            message: 'Votre mot de passe a été réinitialisé. Connectez-vous.',
        },
    };
}

export async function confirmPasswordAction(input: {
    password: string;
    redirectTo?: string;
}): Promise<ActionResult> {
    const user = await getFreshSessionUser();
    if (!user) {
        return { ok: false, error: 'Authentification requise.' };
    }

    if (!input.password || !(await verifyPassword(input.password, user.password))) {
        return {
            ok: false,
            fieldErrors: { password: 'Ce mot de passe est incorrect.' },
        };
    }

    await markPasswordConfirmed(user.id);

    return {
        ok: true,
        redirectTo: safeInternalPath(input.redirectTo, '/settings/profile'),
    };
}

