'use client';

import type { FormEvent } from 'react';
import { useRef, useState } from 'react';
import { Button } from '@/components/button';
import { Field, Input } from '@/components/form';
import { SectionCard } from '@/components/section-card';
import { useActionFeedback } from '@/components/use-action-feedback';
import { updatePasswordAction } from '@/lib/actions/settings';
import type { FieldErrors } from '@/lib/actions/types';

export function PasswordClient() {
    const { applyResult } = useActionFeedback();
    const formRef = useRef<HTMLFormElement>(null);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<FieldErrors>({});

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setLoading(true);
        setErrors({});
        const fd = new FormData(event.currentTarget);

        try {
            const res = await updatePasswordAction({
                current_password: String(fd.get('current_password') ?? ''),
                password: String(fd.get('password') ?? ''),
                password_confirmation: String(
                    fd.get('password_confirmation') ?? '',
                ),
            });
            applyResult(res, {
                setFieldErrors: setErrors,
                onSuccess: () => formRef.current?.reset(),
            });
        } finally {
            setLoading(false);
        }
    }

    return (
        <SectionCard
            title="Modifier le mot de passe"
            description="Choisissez un mot de passe long et unique."
        >
            <form
                ref={formRef}
                onSubmit={(event) => void handleSubmit(event)}
                className="flex flex-col gap-5"
            >
                <Field
                    label="Mot de passe actuel"
                    htmlFor="current_password"
                    error={errors.current_password}
                >
                    <Input
                        id="current_password"
                        type="password"
                        name="current_password"
                        required
                        autoComplete="current-password"
                        aria-invalid={!!errors.current_password}
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
                        autoComplete="new-password"
                        aria-invalid={!!errors.password}
                    />
                </Field>

                <Field
                    label="Confirmation du nouveau mot de passe"
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

                <div>
                    <Button type="submit" loading={loading}>
                        Mettre à jour
                    </Button>
                </div>
            </form>
        </SectionCard>
    );
}

