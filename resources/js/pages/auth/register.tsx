import { Form, Head, Link } from '@inertiajs/react';
import { useState } from 'react';
import { AuthCard, textLinkClasses } from '@/components/auth-card';
import { Button } from '@/components/button';
import { Field, Input, InputError } from '@/components/form';
import { cn } from '@/lib/utils';
import { login } from '@/routes';
import { store } from '@/routes/register';

type RoleOption = { value: string; label: string };

type RegisterProps = {
    roles: RoleOption[];
    defaultRole: string;
};

const roleDescriptions: Record<string, string> = {
    client: 'Je cherche un logement pour mes séjours.',
    host: 'Je souhaite proposer mon logement à la location.',
};

export default function Register({ roles, defaultRole }: RegisterProps) {
    const [selectedRole, setSelectedRole] = useState(defaultRole);

    return (
        <>
            <Head title="Inscription" />
            <AuthCard
                title="Créer un compte"
                description="Rejoignez GuestHoster en moins d’une minute."
                footer={
                    <>
                        Déjà inscrit ?{' '}
                        <Link href={login()} className={textLinkClasses}>
                            Se connecter
                        </Link>
                    </>
                }
            >
                <Form
                    {...store.form()}
                    resetOnSuccess={['password', 'password_confirmation']}
                    className="flex flex-col gap-5"
                >
                    {({ errors, processing }) => (
                        <>
                            <fieldset className="flex flex-col gap-2">
                                <legend className="mb-1.5 text-sm font-medium text-zinc-800 dark:text-zinc-200">
                                    Type de compte
                                </legend>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    {roles.map((role) => (
                                        <label
                                            key={role.value}
                                            className={cn(
                                                'flex cursor-pointer flex-col gap-1 rounded-xl border p-4 transition-colors',
                                                selectedRole === role.value
                                                    ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500 dark:bg-primary-950'
                                                    : 'border-zinc-300 hover:border-zinc-400 dark:border-zinc-700',
                                            )}
                                        >
                                            <input
                                                type="radio"
                                                name="role"
                                                value={role.value}
                                                checked={
                                                    selectedRole === role.value
                                                }
                                                onChange={() =>
                                                    setSelectedRole(role.value)
                                                }
                                                className="sr-only"
                                            />
                                            <span className="text-sm font-semibold">
                                                {role.label}
                                            </span>
                                            <span className="text-xs text-zinc-600 dark:text-zinc-400">
                                                {roleDescriptions[role.value]}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                                <InputError message={errors.role} />
                            </fieldset>

                            <Field
                                label="Nom complet"
                                htmlFor="name"
                                error={errors.name}
                            >
                                <Input
                                    id="name"
                                    name="name"
                                    required
                                    autoFocus
                                    autoComplete="name"
                                    aria-invalid={!!errors.name}
                                />
                            </Field>

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
                                    autoComplete="email"
                                    aria-invalid={!!errors.email}
                                />
                            </Field>

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
                                Créer mon compte
                            </Button>
                        </>
                    )}
                </Form>
            </AuthCard>
        </>
    );
}
