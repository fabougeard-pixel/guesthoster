import { Form, Head, Link } from '@inertiajs/react';
import { AuthCard, textLinkClasses } from '@/components/auth-card';
import { Button } from '@/components/button';
import { Alert, Field, Input } from '@/components/form';
import { login } from '@/routes';
import { email } from '@/routes/password';

export default function ForgotPassword({ status }: { status?: string }) {
    return (
        <>
            <Head title="Mot de passe oublié" />
            <AuthCard
                title="Mot de passe oublié"
                description="Indiquez votre adresse e-mail : nous vous enverrons un lien pour choisir un nouveau mot de passe."
                footer={
                    <Link href={login()} className={textLinkClasses}>
                        Retour à la connexion
                    </Link>
                }
            >
                {status && (
                    <div className="mb-6">
                        <Alert>{status}</Alert>
                    </div>
                )}

                <Form {...email.form()} className="flex flex-col gap-5">
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
                                    name="email"
                                    required
                                    autoFocus
                                    autoComplete="email"
                                    aria-invalid={!!errors.email}
                                />
                            </Field>

                            <Button
                                type="submit"
                                size="lg"
                                loading={processing}
                            >
                                Envoyer le lien
                            </Button>
                        </>
                    )}
                </Form>
            </AuthCard>
        </>
    );
}
