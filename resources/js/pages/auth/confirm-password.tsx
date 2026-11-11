import { Form, Head } from '@inertiajs/react';
import { AuthCard } from '@/components/auth-card';
import { Button } from '@/components/button';
import { Field, Input } from '@/components/form';
import { store } from '@/routes/password/confirm';

export default function ConfirmPassword() {
    return (
        <>
            <Head title="Confirmation du mot de passe" />
            <AuthCard
                title="Confirmez votre mot de passe"
                description="Cette zone est sécurisée : merci de confirmer votre mot de passe pour continuer."
            >
                <Form
                    {...store.form()}
                    resetOnSuccess={['password']}
                    className="flex flex-col gap-5"
                >
                    {({ errors, processing }) => (
                        <>
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

                            <Button
                                type="submit"
                                size="lg"
                                loading={processing}
                            >
                                Confirmer
                            </Button>
                        </>
                    )}
                </Form>
            </AuthCard>
        </>
    );
}
