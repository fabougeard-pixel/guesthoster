'use client';

import Link from 'next/link';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { AuthCard, textLinkClasses } from '@/components/auth-card';
import { Button } from '@/components/button';
import { Field, Input, InputError } from '@/components/form';
import { useActionFeedback } from '@/components/use-action-feedback';
import { registerAction } from '@/lib/actions/auth';
import type { FieldErrors } from '@/lib/actions/types';
import { cn } from '@/lib/utils';

const roles = [
    {
        value: 'client' as const,
        label: 'Voyageur',
        description: 'Je cherche un logement pour mes séjours.',
    },
    {
        value: 'host' as const,
        label: 'Hôte / Propriétaire',
        description:
            'Je souhaite proposer mon logement en location saisonnière ou classique.',
    },
];

const hostAccountTypes = [
    {
        value: 'individual' as const,
        label: 'Particulier',
        description:
            'Location à titre privé (résidence principale, secondaire ou investissement locatif).',
        icon: '👤',
    },
    {
        value: 'company' as const,
        label: 'Professionnel / Entreprise',
        description:
            'Agence immobilière, conciergerie, gestionnaire de flotte, résidence hôtelière ou société.',
        icon: '🏢',
    },
];

export function RegisterForm({
    defaultRole = 'client',
}: {
    defaultRole?: 'client' | 'host';
}) {
    const { applyResult } = useActionFeedback();
    const [selectedRole, setSelectedRole] = useState<'client' | 'host'>(
        defaultRole,
    );
    const [selectedAccountType, setSelectedAccountType] = useState<
        'individual' | 'company'
    >('individual');
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<FieldErrors>({});

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setLoading(true);
        setErrors({});

        const fd = new FormData(event.currentTarget);
        try {
            const res = await registerAction({
                role: selectedRole,
                account_type:
                    selectedRole === 'host' ? selectedAccountType : 'individual',
                company_name:
                    selectedRole === 'host' && selectedAccountType === 'company'
                        ? String(fd.get('company_name') ?? '')
                        : undefined,
                company_registration:
                    selectedRole === 'host' && selectedAccountType === 'company'
                        ? String(fd.get('company_registration') ?? '')
                        : undefined,
                profession:
                    selectedRole === 'host' && selectedAccountType === 'company'
                        ? String(fd.get('profession') ?? '')
                        : undefined,
                name: String(fd.get('name') ?? ''),
                email: String(fd.get('email') ?? ''),
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
            title="Créer un compte"
            description="Rejoignez GuestHoster en moins d’une minute."
            footer={
                <>
                    Déjà inscrit ?{' '}
                    <Link href="/login" className={textLinkClasses}>
                        Se connecter
                    </Link>
                </>
            }
        >
            <form
                onSubmit={(event) => void submit(event)}
                className="flex flex-col gap-5"
            >
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
                                    checked={selectedRole === role.value}
                                    onChange={() => setSelectedRole(role.value)}
                                    className="sr-only"
                                />
                                <span className="text-sm font-semibold">
                                    {role.label}
                                </span>
                                <span className="text-xs text-zinc-600 dark:text-zinc-400">
                                    {role.description}
                                </span>
                            </label>
                        ))}
                    </div>
                    <InputError message={errors.role} />
                </fieldset>

                {selectedRole === 'host' && (
                    <div className="rounded-2xl border border-secondary-200 bg-secondary-50/60 p-4 dark:border-secondary-900/60 dark:bg-secondary-950/30 space-y-4">
                        <fieldset className="flex flex-col gap-2">
                            <legend className="text-xs font-bold uppercase tracking-wider text-secondary-900 dark:text-secondary-100">
                                Statut de votre activité
                            </legend>
                            <div className="grid gap-2.5 sm:grid-cols-2">
                                {hostAccountTypes.map((type) => (
                                    <label
                                        key={type.value}
                                        className={cn(
                                            'flex cursor-pointer flex-col gap-1 rounded-xl border p-3.5 transition-all text-left bg-white dark:bg-zinc-900',
                                            selectedAccountType === type.value
                                                ? 'border-secondary-600 ring-2 ring-secondary-500/30'
                                                : 'border-zinc-200 hover:border-zinc-300 dark:border-zinc-800',
                                        )}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-base" role="img" aria-hidden="true">
                                                {type.icon}
                                            </span>
                                            <input
                                                type="radio"
                                                name="account_type"
                                                value={type.value}
                                                checked={selectedAccountType === type.value}
                                                onChange={() => setSelectedAccountType(type.value)}
                                                className="size-3.5 text-secondary-600 focus:ring-secondary-500"
                                            />
                                        </div>
                                        <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                                            {type.label}
                                        </span>
                                        <span className="text-xs text-zinc-500 dark:text-zinc-400 leading-snug">
                                            {type.description}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </fieldset>

                        {selectedAccountType === 'company' && (
                            <div className="space-y-3 pt-1 border-t border-secondary-200/60 dark:border-secondary-900/40">
                                <Field
                                    label="Nom de l’entreprise / raison sociale"
                                    htmlFor="company_name"
                                    error={errors.company_name}
                                    hint="Ex. Niro Hotel Apartments, Conciergerie Azur..."
                                >
                                    <Input
                                        id="company_name"
                                        name="company_name"
                                        required
                                        placeholder="Ex. Niro Hotel Apartments"
                                        aria-invalid={!!errors.company_name}
                                    />
                                </Field>

                                <div className="grid gap-3 sm:grid-cols-2">
                                    <Field
                                        label="Profession / Activité"
                                        htmlFor="profession"
                                        error={errors.profession}
                                        hint="Ex. Appartements hôteliers, Conciergerie..."
                                    >
                                        <Input
                                            id="profession"
                                            name="profession"
                                            placeholder="Ex. Appartements hôteliers"
                                        />
                                    </Field>

                                    <Field
                                        label="SIRET / RCS (optionnel)"
                                        htmlFor="company_registration"
                                        error={errors.company_registration}
                                        hint="Numéro d’immatriculation pro"
                                    >
                                        <Input
                                            id="company_registration"
                                            name="company_registration"
                                            placeholder="Ex. 849 123 456 00012"
                                        />
                                    </Field>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <Field label="Nom complet" htmlFor="name" error={errors.name}>
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

                <Button type="submit" size="lg" loading={loading}>
                    Créer mon compte
                </Button>
            </form>
        </AuthCard>
    );
}

