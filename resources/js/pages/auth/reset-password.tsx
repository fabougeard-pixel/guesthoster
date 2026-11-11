import { Form, Head } from '@inertiajs/react';
import { AuthCard } from '@/components/auth-card';
import { Button } from '@/components/button';
import { Field, Input } from '@/components/form';
import { update } from '@/routes/password';

export default function ResetPassword({
    token,
    email,
}: {
    token: string;
    email: string;
}) {
    return (
        <>
            <Head title="Nouveau mot de passe" />
            <AuthCard
                title="Choisissez un nouveau mot de passe"
                description="Il remplacera immédiatement l’ancien."
            >
                <Form
                    {...update.form()}
                    transform={(data) => ({ ...data, token, email })}
                    resetOnSuccess={['password', 'password_confirmation']}
                    className="flex flex-col gap-5"
                >
                    {({ errors, processing }) => (
                        <>
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

                            <Button
                                type="submit"
                                size="lg"
                                loading={processing}
                            >
                                Réinitialiser le mot de passe
                            </Button>
                        </>
                    )}
                </Form>
            </AuthCard>
        </>
    );
}
