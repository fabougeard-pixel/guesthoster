'use client';

import Link from 'next/link';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { AuthCard, textLinkClasses } from '@/components/auth-card';
import { Button } from '@/components/button';
import { Alert, Field, Input } from '@/components/form';
import { useActionFeedback } from '@/components/use-action-feedback';
import { setupInitialAdminAction } from '@/lib/actions/auth';
import type { FieldErrors } from '@/lib/actions/types';

export function AdminSetupForm() {
    const { applyResult } = useActionFeedback();
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<FieldErrors>({});
    const [formError, setFormError] = useState<string | undefined>();

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setLoading(true);
        setErrors({});
        setFormError(undefined);

        const fd = new FormData(event.currentTarget);
        const rawName = String(fd.get('name') ?? '').trim();

        try {
            const res = await setupInitialAdminAction({
                name: rawName.length > 0 ? rawName : undefined,
                email: String(fd.get('email') ?? ''),
                password: String(fd.get('password') ?? ''),
                password_confirmation: String(
                    fd.get('password_confirmation') ?? '',
                ),
            });
            applyResult(res, {
                setFieldErrors: setErrors,
                setError: setFormError,
            });
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="mx-auto w-full max-w-md px-4 py-12 sm:py-16">
            <AuthCard
                title="Créer le compte administrateur"
                description="Aucun administrateur n’est encore configuré. Renseignez vos identifiants pour initialiser l’administration."
                footer={
                    <>
                        Compte déjà configuré ?{' '}
                        <Link
                            href="/login?redirect=%2Fadmin"
                            className={textLinkClasses}
                        >
                            Se connecter
                        </Link>
                    </>
                }
            >
                {formError && (
                    <div className="mb-6">
                        <Alert tone="warning">{formError}</Alert>
                    </div>
                )}

                <form
                    onSubmit={(event) => void submit(event)}
                    className="flex flex-col gap-5"
                >
                    <Field
                        label="Adresse e-mail administrateur"
                        htmlFor="email"
                        error={errors.email}
                    >
                        <Input
                            id="email"
                            type="email"
                            name="email"
                            required
                            autoFocus
                            autoComplete="email"
                            aria-invalid={!!errors.email}
                        />
                    </Field>

                    <Field
                        label="Mot de passe"
                        htmlFor="password"
                        error={errors.password}
                        hint="Minimum 8 caractères."
                    >
                        <Input
                            id="password"
                            type="password"
                            name="password"
                            required
                            minLength={8}
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
                            minLength={8}
                            autoComplete="new-password"
                            aria-invalid={!!errors.password_confirmation}
                        />
                    </Field>

                    <Field
                        label="Nom complet (optionnel)"
                        htmlFor="name"
                        error={errors.name}
                        hint="Par défaut : Administrateur."
                    >
                        <Input
                            id="name"
                            name="name"
                            placeholder="Administrateur"
                            autoComplete="name"
                            aria-invalid={!!errors.name}
                        />
                    </Field>

                    <Button type="submit" size="lg" loading={loading}>
                        Valider l’inscription administrateur
                    </Button>
                </form>
            </AuthCard>
        </div>
    );
}

