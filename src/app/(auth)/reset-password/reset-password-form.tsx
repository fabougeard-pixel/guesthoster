'use client';

import type { FormEvent } from 'react';
import { useState } from 'react';
import { AuthCard } from '@/components/auth-card';
import { Button } from '@/components/button';
import { Field, Input } from '@/components/form';
import { useActionFeedback } from '@/components/use-action-feedback';
import { resetPasswordAction } from '@/lib/actions/auth';
import type { FieldErrors } from '@/lib/actions/types';

export function ResetPasswordForm({
    token,
    email,
}: {
    token: string;
    email: string;
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
            const res = await resetPasswordAction({
                token,
                email,
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
            title="Choisissez un nouveau mot de passe"
            description="Il remplacera immédiatement l’ancien."
        >
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
                        value={email}
                        readOnly
                        autoComplete="email"
                    />
                </Field>

                <Field
                    label="Nouveau mot de passe"
                    htmlFor="password"
                    error={errors.password}
                >
                    <Input
                        id="password"
                        type="password"
                        name="password"
                        required
                        autoFocus
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
                    Réinitialiser le mot de passe
                </Button>
            </form>
        </AuthCard>
    );
}

