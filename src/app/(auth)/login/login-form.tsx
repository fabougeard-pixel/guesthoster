'use client';

import Link from 'next/link';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { AuthCard, textLinkClasses } from '@/components/auth-card';
import { Button } from '@/components/button';
import { Alert, Checkbox, Field, Input, Label } from '@/components/form';
import { useActionFeedback } from '@/components/use-action-feedback';
import { loginAction } from '@/lib/actions/auth';
import type { FieldErrors } from '@/lib/actions/types';

export function LoginForm({
    status,
    redirectTo,
}: {
    status?: string;
    redirectTo?: string;
}) {
    const { applyResult } = useActionFeedback();
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<FieldErrors>({});

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setLoading(true);
        setErrors({});

        const fd = new FormData(event.currentTarget);
        try {
            const res = await loginAction({
                email: String(fd.get('email') ?? ''),
                password: String(fd.get('password') ?? ''),
                remember: fd.get('remember') === 'on',
                redirectTo,
            });
            applyResult(res, { setFieldErrors: setErrors });
        } finally {
            setLoading(false);
        }
    }

    return (
        <AuthCard
            title="Bon retour parmi nous"
            description="Connectez-vous pour gérer vos séjours et vos logements."
            footer={
                <>
                    Pas encore de compte ?{' '}
                    <Link href="/register" className={textLinkClasses}>
                        Créer un compte
                    </Link>
                </>
            }
        >
            {status && (
                <div className="mb-6">
                    <Alert>{status}</Alert>
                </div>
            )}

            <form
                onSubmit={(event) => void submit(event)}
                className="flex flex-col gap-5"
            >
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
                        autoFocus
                        autoComplete="email"
                        aria-invalid={!!errors.email}
                    />
                </Field>

                <Field
                    label="Mot de passe"
                    htmlFor="password"
                    error={errors.password}
                    action={
                        <Link
                            href="/forgot-password"
                            className={`text-sm ${textLinkClasses}`}
                        >
                            Mot de passe oublié ?
                        </Link>
                    }
                >
                    <Input
                        id="password"
                        type="password"
                        name="password"
                        required
                        autoComplete="current-password"
                        aria-invalid={!!errors.password}
                    />
                </Field>

                <div className="flex items-center gap-2">
                    <Checkbox id="remember" name="remember" />
                    <Label htmlFor="remember">Rester connecté</Label>
                </div>

                <Button type="submit" size="lg" loading={loading}>
                    Se connecter
                </Button>
            </form>
        </AuthCard>
    );
}

