'use client';

import Link from 'next/link';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { AuthCard, textLinkClasses } from '@/components/auth-card';
import { Button } from '@/components/button';
import { Field, Input, InputError } from '@/components/form';
import { useActionFeedback } from '@/components/use-action-feedback';
import { registerAction } from '@/lib/actions/auth';
import type { FieldErrors } from '@/lib/actions/types';
import { cn } from '@/lib/utils';

const roles = [
    {
        value: 'client' as const,
        label: 'Voyageur',
        description: 'Je cherche un logement pour mes séjours.',
    },
    {
        value: 'host' as const,
        label: 'Hôte',
        description: 'Je souhaite proposer mon logement à la location.',
    },
];

export function RegisterForm({
    defaultRole = 'client',
}: {
    defaultRole?: 'client' | 'host';
}) {
    const { applyResult } = useActionFeedback();
    const [selectedRole, setSelectedRole] = useState<'client' | 'host'>(
        defaultRole,
    );
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<FieldErrors>({});

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setLoading(true);
        setErrors({});

        const fd = new FormData(event.currentTarget);
        try {
            const res = await registerAction({
                role: selectedRole,
                name: String(fd.get('name') ?? ''),
                email: String(fd.get('email') ?? ''),
                password: String(fd.get('password') ?? ''),
                password_confirmation: String(
                    fd.get('password_confirmation') ?? '',
                ),
            });
            applyResult(res, { setFieldErrors: setErrors });
        } finally {
            setLoading(false);
        }
    }

    return (
        <AuthCard
            title="Créer un compte"
            description="Rejoignez GuestHoster en moins d’une minute."
            footer={
                <>
                    Déjà inscrit ?{' '}
                    <Link href="/login" className={textLinkClasses}>
                        Se connecter
                    </Link>
                </>
            }
        >
            <form
                onSubmit={(event) => void submit(event)}
                className="flex flex-col gap-5"
            >
                <fieldset className="flex flex-col gap-2">
                    <legend className="mb-1.5 text-sm font-medium text-zinc-800 dark:text-zinc-200">
                        Type de compte
                    </legend>
                    <div className="grid gap-3 sm:grid-cols-2">
                        {roles.map((role) => (
                            <label
                                key={role.value}
                                className={cn(
                                    'flex cursor-pointer flex-col gap-1 rounded-xl border p-4 transition-colors',
                                    selectedRole === role.value
                                        ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500 dark:bg-primary-950'
                                        : 'border-zinc-300 hover:border-zinc-400 dark:border-zinc-700',
                                )}
                            >
                                <input
                                    type="radio"
                                    name="role"
                                    value={role.value}
                                    checked={selectedRole === role.value}
                                    onChange={() => setSelectedRole(role.value)}
                                    className="sr-only"
                                />
                                <span className="text-sm font-semibold">
                                    {role.label}
                                </span>
                                <span className="text-xs text-zinc-600 dark:text-zinc-400">
                                    {role.description}
                                </span>
                            </label>
                        ))}
                    </div>
                    <InputError message={errors.role} />
                </fieldset>

                <Field label="Nom complet" htmlFor="name" error={errors.name}>
                    <Input
                        id="name"
                        name="name"
                        required
                        autoFocus
                        autoComplete="name"
                        aria-invalid={!!errors.name}
                    />
                </Field>

                <Field
                    label="Adresse e-mail"
                    htmlFor="email"
                    error={errors.email}
                >
                    <Input
                        id="email"
                        type="email"
                        name="email"
                        required
                        autoComplete="email"
                        aria-invalid={!!errors.email}
                    />
                </Field>

                <Field
                    label="Mot de passe"
                    htmlFor="password"
                    error={errors.password}
                >
                    <Input
                        id="password"
                        type="password"
                        name="password"
                        required
                        autoComplete="new-password"
                        aria-invalid={!!errors.password}
                    />
                </Field>

                <Field
                    label="Confirmation du mot de passe"
                    htmlFor="password_confirmation"
                    error={errors.password_confirmation}
                >
                    <Input
                        id="password_confirmation"
                        type="password"
                        name="password_confirmation"
                        required
                        autoComplete="new-password"
                    />
                </Field>

                <Button type="submit" size="lg" loading={loading}>
                    Créer mon compte
                </Button>
            </form>
        </AuthCard>
    );
}

