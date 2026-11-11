import { Form, Head, Link } from '@inertiajs/react';
import { AuthCard, textLinkClasses } from '@/components/auth-card';
import { Button } from '@/components/button';
import { Alert, Checkbox, Field, Input, Label } from '@/components/form';
import { register } from '@/routes';
import { store } from '@/routes/login';
import { request } from '@/routes/password';

type LoginProps = {
    canResetPassword: boolean;
    canRegister: boolean;
    status?: string;
};

export default function Login({
    canResetPassword,
    canRegister,
    status,
}: LoginProps) {
    return (
        <>
            <Head title="Connexion" />
            <AuthCard
                title="Bon retour parmi nous"
                description="Connectez-vous pour gérer vos séjours et vos logements."
                footer={
                    canRegister && (
                        <>
                            Pas encore de compte ?{' '}
                            <Link href={register()} className={textLinkClasses}>
                                Créer un compte
                            </Link>
                        </>
                    )
                }
            >
                {status && (
                    <div className="mb-6">
                        <Alert>{status}</Alert>
                    </div>
                )}

                <Form
                    {...store.form()}
                    resetOnSuccess={['password']}
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
                                    canResetPassword && (
                                        <Link
                                            href={request()}
                                            className={`text-sm ${textLinkClasses}`}
                                        >
                                            Mot de passe oublié ?
                                        </Link>
                                    )
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
                                <Label htmlFor="remember">
                                    Rester connecté
                                </Label>
                            </div>

                            <Button
                                type="submit"
                                size="lg"
                                loading={processing}
                            >
                                Se connecter
                            </Button>
                        </>
                    )}
                </Form>
            </AuthCard>
        </>
    );
}
