'use client';

import Link from 'next/link';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { AuthCard, textLinkClasses } from '@/components/auth-card';
import { Button } from '@/components/button';
import { Alert, Field, Input } from '@/components/form';
import { useActionFeedback } from '@/components/use-action-feedback';
import { forgotPasswordAction } from '@/lib/actions/auth';
import type { FieldErrors } from '@/lib/actions/types';

export function ForgotPasswordForm() {
    const { applyResult } = useActionFeedback();
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<FieldErrors>({});
    const [status, setStatus] = useState<string | null>(null);

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setLoading(true);
        setErrors({});
        const fd = new FormData(event.currentTarget);

        try {
            const res = await forgotPasswordAction({
                email: String(fd.get('email') ?? ''),
            });
            applyResult(res, {
                setFieldErrors: setErrors,
                onSuccess: () => {
                    setStatus(
                        'Si un compte correspond à cette adresse, un lien de réinitialisation vous a été envoyé.',
                    );
                },
            });
        } finally {
            setLoading(false);
        }
    }

    return (
        <AuthCard
            title="Mot de passe oublié"
            description="Indiquez votre adresse e-mail : nous vous enverrons un lien pour choisir un nouveau mot de passe."
            footer={
                <Link href="/login" className={textLinkClasses}>
                    Retour à la connexion
                </Link>
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

                <Button type="submit" size="lg" loading={loading}>
                    Envoyer le lien
                </Button>
            </form>
        </AuthCard>
    );
}

