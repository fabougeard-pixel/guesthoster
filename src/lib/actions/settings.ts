'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import {
    clearSessionCookie,
    getFreshSessionUser,
    sendVerificationEmail,
} from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { type ActionResult, zodToFieldErrors } from './types';

const profileSchema = z.object({
    name: z
        .string()
        .trim()
        .min(2, 'Le nom doit contenir au moins 2 caractères.')
        .max(255),
    email: z.string().trim().email('Adresse e-mail invalide.').max(255),
});

const passwordUpdateSchema = z
    .object({
        current_password: z
            .string()
            .min(1, 'Veuillez saisir votre mot de passe actuel.'),
        password: z
            .string()
            .min(8, 'Le nouveau mot de passe doit contenir au moins 8 caractères.'),
        password_confirmation: z.string(),
    })
    .refine((data) => data.password === data.password_confirmation, {
        path: ['password_confirmation'],
        message: 'La confirmation du mot de passe ne correspond pas.',
    });

export async function updateProfileAction(input: {
    name: string;
    email: string;
}): Promise<ActionResult> {
    const user = await getFreshSessionUser();
    if (!user) {
        return { ok: false, error: 'Authentification requise.' };
    }

    const parsed = profileSchema.safeParse(input);
    if (!parsed.success) {
        return { ok: false, fieldErrors: zodToFieldErrors(parsed.error) };
    }

    const email = parsed.data.email.toLowerCase();
    const emailChanged = email !== user.email;

    if (emailChanged) {
        const collision = await prisma.user.findFirst({
            where: { email, id: { not: user.id } },
            select: { id: true },
        });
        if (collision) {
            return {
                ok: false,
                fieldErrors: {
                    email: 'Cette adresse e-mail est déjà utilisée.',
                },
            };
        }
    }

    const updated = await prisma.user.update({
        where: { id: user.id },
        data: {
            name: parsed.data.name,
            email,
            ...(emailChanged ? { emailVerifiedAt: null } : {}),
        },
    });

    if (emailChanged) {
        await sendVerificationEmail(updated).catch((err) => {
            console.warn('Échec envoi e-mail vérification :', err);
        });
    }

    revalidatePath('/settings/profile');
    revalidatePath('/', 'layout');

    return {
        ok: true,
        toast: {
            type: 'success',
            message: emailChanged
                ? 'Profil mis à jour. Vérifiez votre nouvelle adresse e-mail.'
                : 'Profil enregistré.',
        },
    };
}

export async function updatePasswordAction(input: {
    current_password: string;
    password: string;
    password_confirmation: string;
}): Promise<ActionResult> {
    const user = await getFreshSessionUser();
    if (!user) {
        return { ok: false, error: 'Authentification requise.' };
    }

    const parsed = passwordUpdateSchema.safeParse(input);
    if (!parsed.success) {
        return { ok: false, fieldErrors: zodToFieldErrors(parsed.error) };
    }

    if (!(await verifyPassword(parsed.data.current_password, user.password))) {
        return {
            ok: false,
            fieldErrors: {
                current_password: 'Le mot de passe actuel est incorrect.',
            },
        };
    }

    const passwordHash = await hashPassword(parsed.data.password);
    await prisma.user.update({
        where: { id: user.id },
        data: { password: passwordHash },
    });

    return {
        ok: true,
        toast: { type: 'success', message: 'Mot de passe mis à jour.' },
    };
}

export async function becomeHostAction(): Promise<ActionResult> {
    const user = await getFreshSessionUser();
    if (!user) {
        return { ok: false, error: 'Authentification requise.' };
    }

    if (!user.emailVerifiedAt) {
        return {
            ok: false,
            error: 'Veuillez d’abord vérifier votre adresse e-mail.',
        };
    }

    if (user.role === 'client') {
        await prisma.user.update({
            where: { id: user.id },
            data: { role: 'host' },
        });
    }

    revalidatePath('/', 'layout');
    revalidatePath('/hote');

    return {
        ok: true,
        redirectTo: '/hote',
        toast: {
            type: 'success',
            message: 'Votre espace hôte est activé !',
        },
    };
}

export async function deleteAccountAction(input: {
    password: string;
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

    const bookingsCount = await prisma.booking.count({
        where: {
            OR: [{ userId: user.id }, { property: { userId: user.id } }],
        },
    });

    if (bookingsCount > 0) {
        return {
            ok: false,
            fieldErrors: {
                password:
                    'Impossible de supprimer ce compte tant que des réservations y sont liées.',
            },
        };
    }

    await prisma.user.delete({ where: { id: user.id } });
    await clearSessionCookie();
    revalidatePath('/', 'layout');

    return {
        ok: true,
        redirectTo: '/',
        toast: { type: 'info', message: 'Votre compte a été supprimé.' },
    };
}

