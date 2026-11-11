import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { type FieldErrors, zodToFieldErrors } from '@/lib/actions/types';
import { hashPassword } from '@/lib/auth/password';

export const ADMIN_ALREADY_CONFIGURED_MESSAGE =
    'Un compte administrateur existe déjà. Connectez-vous pour accéder à l’administration.';

export const adminSetupSchema = z
    .object({
        name: z
            .string()
            .trim()
            .max(255, 'Le nom ne doit pas dépasser 255 caractères.')
            .optional()
            .refine(
                (value) => !value || value.length >= 2,
                'Le nom doit contenir au moins 2 caractères.',
            )
            .transform((value) =>
                value && value.length > 0 ? value : 'Administrateur',
            ),
        email: z
            .string()
            .trim()
            .email('Veuillez saisir une adresse e-mail valide.')
            .max(255),
        password: z
            .string()
            .min(8, 'Le mot de passe doit contenir au moins 8 caractères.'),
        password_confirmation: z.string(),
    })
    .refine((data) => data.password === data.password_confirmation, {
        path: ['password_confirmation'],
        message: 'La confirmation du mot de passe ne correspond pas.',
    });

export type AdminSetupInput = {
    name?: string;
    email: string;
    password: string;
    password_confirmation: string;
};

export interface AdminSetupTx {
    user: {
        findFirst(args: {
            where: { role: string };
            select: { id: true };
        }): Promise<{ id: number } | null>;
        findUnique(args: {
            where: { email: string };
            select: { id: true };
        }): Promise<{ id: number } | null>;
        create(args: {
            data: {
                name: string;
                email: string;
                role: 'admin';
                emailVerifiedAt: Date;
                password: string;
            };
            select: { id: true; email: true };
        }): Promise<{ id: number; email: string }>;
    };
}

export interface AdminSetupDb {
    $transaction<T>(
        fn: (tx: AdminSetupTx) => Promise<T>,
        options?: { isolationLevel?: Prisma.TransactionIsolationLevel },
    ): Promise<T>;
}

export type CreateInitialAdminOutcome =
    | { ok: true; adminId: number; email: string }
    | {
          ok: false;
          alreadyConfigured?: boolean;
          error?: string;
          fieldErrors?: FieldErrors;
      };

function prismaErrorCode(error: unknown): string | undefined {
    if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        typeof (error as { code?: unknown }).code === 'string'
    ) {
        return (error as { code: string }).code;
    }

    return undefined;
}

/**
 * Validates and creates the very first admin user inside a serializable transaction.
 * Permanently refuses setup once any admin user exists.
 */
export async function createInitialAdminUser(
    input: AdminSetupInput,
    db: AdminSetupDb,
): Promise<CreateInitialAdminOutcome> {
    const parsed = adminSetupSchema.safeParse(input);
    if (!parsed.success) {
        return { ok: false, fieldErrors: zodToFieldErrors(parsed.error) };
    }

    const email = parsed.data.email.toLowerCase();
    const passwordHash = await hashPassword(parsed.data.password);

    try {
        return await db.$transaction(
            async (tx) => {
                const existingAdmin = await tx.user.findFirst({
                    where: { role: 'admin' },
                    select: { id: true },
                });

                if (existingAdmin) {
                    return {
                        ok: false,
                        alreadyConfigured: true,
                        error: ADMIN_ALREADY_CONFIGURED_MESSAGE,
                    } as const;
                }

                const existingEmail = await tx.user.findUnique({
                    where: { email },
                    select: { id: true },
                });

                if (existingEmail) {
                    return {
                        ok: false,
                        fieldErrors: {
                            email: 'Cette adresse e-mail est déjà utilisée.',
                        },
                    } as const;
                }

                const created = await tx.user.create({
                    data: {
                        name: parsed.data.name,
                        email,
                        role: 'admin',
                        emailVerifiedAt: new Date(),
                        password: passwordHash,
                    },
                    select: { id: true, email: true },
                });

                return {
                    ok: true,
                    adminId: created.id,
                    email: created.email,
                } as const;
            },
            { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
    } catch (error) {
        const code = prismaErrorCode(error);
        if (code === 'P2034') {
            return {
                ok: false,
                alreadyConfigured: true,
                error: ADMIN_ALREADY_CONFIGURED_MESSAGE,
            };
        }
        if (code === 'P2002') {
            return {
                ok: false,
                fieldErrors: {
                    email: 'Cette adresse e-mail est déjà utilisée.',
                },
            };
        }
        throw error;
    }
}

