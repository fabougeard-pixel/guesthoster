'use client';

import type { FormEvent } from 'react';
import { useState } from 'react';
import { AuthCard } from '@/components/auth-card';
import { Button } from '@/components/button';
import { Field, Input } from '@/components/form';
import { useActionFeedback } from '@/components/use-action-feedback';
import { confirmPasswordAction } from '@/lib/actions/auth';
import type { FieldErrors } from '@/lib/actions/types';

export function ConfirmPasswordForm({ redirectTo }: { redirectTo?: string }) {
    const { applyResult } = useActionFeedback();
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<FieldErrors>({});

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setLoading(true);
        setErrors({});
        const fd = new FormData(event.currentTarget);

        try {
            const res = await confirmPasswordAction({
                password: String(fd.get('password') ?? ''),
                redirectTo,
            });
            applyResult(res, { setFieldErrors: setErrors });
        } finally {
            setLoading(false);
        }
    }

    return (
        <AuthCard
            title="Confirmez votre mot de passe"
            description="Cette zone est sécurisée : merci de confirmer votre mot de passe pour continuer."
        >
            <form
                onSubmit={(event) => void submit(event)}
                className="flex flex-col gap-5"
            >
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
                        autoFocus
                        autoComplete="current-password"
                        aria-invalid={!!errors.password}
                    />
                </Field>

                <Button type="submit" size="lg" loading={loading}>
                    Confirmer
                </Button>
            </form>
        </AuthCard>
    );
}

