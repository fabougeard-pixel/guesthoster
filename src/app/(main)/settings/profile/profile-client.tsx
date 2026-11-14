'use client';

import type { FormEvent } from 'react';
import { useState } from 'react';
import { textLinkClasses } from '@/components/auth-card';
import { Button } from '@/components/button';
import { Alert, Field, Input, Select, Textarea } from '@/components/form';
import { Modal } from '@/components/modal';
import { SectionCard } from '@/components/section-card';
import { useActionFeedback } from '@/components/use-action-feedback';
import { resendVerificationEmailAction } from '@/lib/actions/auth';
import {
    becomeHostAction,
    deleteAccountAction,
    updateProfileAction,
} from '@/lib/actions/settings';
import type { FieldErrors } from '@/lib/actions/types';
import { cn } from '@/lib/utils';

export function ProfileClient({
    name,
    email,
    role = 'client',
    accountType = 'individual',
    companyName = '',
    companyRegistration = '',
    profession = '',
    bio = '',
    spokenLanguages = 'Français',
    responseTime = "dans l'heure",
    mustVerifyEmail,
    canBecomeHost,
}: {
    name: string;
    email: string;
    role?: string;
    accountType?: 'individual' | 'company';
    companyName?: string;
    companyRegistration?: string;
    profession?: string;
    bio?: string;
    spokenLanguages?: string;
    responseTime?: string;
    mustVerifyEmail: boolean;
    canBecomeHost: boolean;
}) {
    const { applyResult } = useActionFeedback();
    const [savingProfile, setSavingProfile] = useState(false);
    const [profileErrors, setProfileErrors] = useState<FieldErrors>({});
    const [currentAccountType, setCurrentAccountType] = useState<
        'individual' | 'company'
    >(accountType);
    const [verificationSent, setVerificationSent] = useState(false);
    const [becomingHost, setBecomingHost] = useState(false);
    const [confirmingDeletion, setConfirmingDeletion] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [deleteErrors, setDeleteErrors] = useState<FieldErrors>({});

    const isHostOrAdmin = role === 'host' || role === 'admin';

    async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSavingProfile(true);
        setProfileErrors({});
        const fd = new FormData(event.currentTarget);

        try {
            const res = await updateProfileAction({
                name: String(fd.get('name') ?? ''),
                email: String(fd.get('email') ?? ''),
                account_type: isHostOrAdmin ? currentAccountType : 'individual',
                company_name: String(fd.get('company_name') ?? ''),
                company_registration: String(
                    fd.get('company_registration') ?? '',
                ),
                profession: String(fd.get('profession') ?? ''),
                bio: String(fd.get('bio') ?? ''),
                spoken_languages: String(fd.get('spoken_languages') ?? ''),
                response_time: String(fd.get('response_time') ?? ''),
            });
            applyResult(res, { setFieldErrors: setProfileErrors });
        } finally {
            setSavingProfile(false);
        }
    }

    async function handleResend() {
        const res = await resendVerificationEmailAction();
        applyResult(res, { onSuccess: () => setVerificationSent(true) });
    }

    async function handleBecomeHost() {
        setBecomingHost(true);
        try {
            const res = await becomeHostAction();
            applyResult(res);
        } finally {
            setBecomingHost(false);
        }
    }

    async function handleDeleteAccount(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setDeleting(true);
        setDeleteErrors({});
        const fd = new FormData(event.currentTarget);

        try {
            const res = await deleteAccountAction({
                password: String(fd.get('password') ?? ''),
            });
            applyResult(res, { setFieldErrors: setDeleteErrors });
        } finally {
            setDeleting(false);
        }
    }

    return (
        <>
            <SectionCard
                title="Informations personnelles"
                description="Votre nom est visible par les hôtes et les voyageurs avec qui vous échangez."
            >
                <form
                    onSubmit={(event) => void handleProfileSubmit(event)}
                    className="flex flex-col gap-5"
                >
                    <Field
                        label="Nom complet"
                        htmlFor="name"
                        error={profileErrors.name}
                    >
                        <Input
                            id="name"
                            name="name"
                            defaultValue={name}
                            required
                            autoComplete="name"
                            aria-invalid={!!profileErrors.name}
                        />
                    </Field>

                    <Field
                        label="Adresse e-mail"
                        htmlFor="email"
                        error={profileErrors.email}
                        hint="Un changement d’adresse nécessite une nouvelle confirmation."
                    >
                        <Input
                            id="email"
                            type="email"
                            name="email"
                            defaultValue={email}
                            required
                            autoComplete="email"
                            aria-invalid={!!profileErrors.email}
                        />
                    </Field>

                    {isHostOrAdmin && (
                        <div className="space-y-5 rounded-2xl border border-secondary-200 bg-secondary-50/60 p-5 dark:border-secondary-900/60 dark:bg-secondary-950/30">
                            <div>
                                <h3 className="text-sm font-bold text-secondary-950 dark:text-secondary-100">
                                    Profil Hôte / Propriétaire public
                                </h3>
                                <p className="mt-1 text-xs text-secondary-800 dark:text-secondary-300">
                                    Ces informations apparaissent sur vos annonces dans la section « Faites connaissance avec votre hôte ».
                                </p>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                                <label
                                    className={cn(
                                        'flex cursor-pointer flex-col gap-1 rounded-xl border p-3.5 transition-all bg-white dark:bg-zinc-900',
                                        currentAccountType === 'individual'
                                            ? 'border-secondary-600 ring-2 ring-secondary-500/30'
                                            : 'border-zinc-200 dark:border-zinc-800',
                                    )}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-lg">👤</span>
                                        <input
                                            type="radio"
                                            name="account_type"
                                            value="individual"
                                            checked={currentAccountType === 'individual'}
                                            onChange={() => setCurrentAccountType('individual')}
                                            className="size-4 text-secondary-600"
                                        />
                                    </div>
                                    <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                                        Particulier
                                    </span>
                                    <span className="text-xs text-zinc-500">
                                        Location à titre privé
                                    </span>
                                </label>

                                <label
                                    className={cn(
                                        'flex cursor-pointer flex-col gap-1 rounded-xl border p-3.5 transition-all bg-white dark:bg-zinc-900',
                                        currentAccountType === 'company'
                                            ? 'border-secondary-600 ring-2 ring-secondary-500/30'
                                            : 'border-zinc-200 dark:border-zinc-800',
                                    )}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-lg">🏢</span>
                                        <input
                                            type="radio"
                                            name="account_type"
                                            value="company"
                                            checked={currentAccountType === 'company'}
                                            onChange={() => setCurrentAccountType('company')}
                                            className="size-4 text-secondary-600"
                                        />
                                    </div>
                                    <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                                        Professionnel / Entreprise
                                    </span>
                                    <span className="text-xs text-zinc-500">
                                        Agence, conciergerie ou société
                                    </span>
                                </label>
                            </div>

                            {currentAccountType === 'company' && (
                                <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-secondary-200/70 dark:border-secondary-900/60">
                                    <Field
                                        label="Nom de l’entreprise / raison sociale"
                                        htmlFor="company_name"
                                        error={profileErrors.company_name}
                                        hint="Ex. Niro Hotel Apartments, Conciergerie Azur..."
                                    >
                                        <Input
                                            id="company_name"
                                            name="company_name"
                                            defaultValue={companyName}
                                            placeholder="Ex. Niro Hotel Apartments"
                                        />
                                    </Field>

                                    <Field
                                        label="SIRET / RCS"
                                        htmlFor="company_registration"
                                        error={profileErrors.company_registration}
                                        hint="Numéro d’immatriculation"
                                    >
                                        <Input
                                            id="company_registration"
                                            name="company_registration"
                                            defaultValue={companyRegistration}
                                            placeholder="Ex. 849 123 456 00012"
                                        />
                                    </Field>
                                </div>
                            )}

                            <div className="grid gap-4 sm:grid-cols-2">
                                <Field
                                    label="Ma profession / activité"
                                    htmlFor="profession"
                                    error={profileErrors.profession}
                                    hint="Affiché sur vos annonces (ex. Appartements hôteliers, Conciergerie...)"
                                >
                                    <Input
                                        id="profession"
                                        name="profession"
                                        defaultValue={profession}
                                        placeholder="Ex. Appartements hôteliers Niro"
                                    />
                                </Field>

                                <Field
                                    label="Langues parlées"
                                    htmlFor="spoken_languages"
                                    error={profileErrors.spoken_languages}
                                    hint="Ex. Français, Anglais, Suédois..."
                                >
                                    <Input
                                        id="spoken_languages"
                                        name="spoken_languages"
                                        defaultValue={spokenLanguages}
                                        placeholder="Ex. Français, Anglais"
                                    />
                                </Field>
                            </div>

                            <Field
                                label="Délai habituel de réponse"
                                htmlFor="response_time"
                                error={profileErrors.response_time}
                                hint="Indicateur de réactivité affiché aux clients"
                            >
                                <Select
                                    id="response_time"
                                    name="response_time"
                                    defaultValue={responseTime}
                                >
                                    <option value="dans l'heure">Répond dans l’heure (très réactif)</option>
                                    <option value="en quelques heures">Répond en quelques heures</option>
                                    <option value="dans la journée">Répond dans la journée</option>
                                </Select>
                            </Field>

                            <Field
                                label="Présentation / Bio de l’hôte"
                                htmlFor="bio"
                                error={profileErrors.bio}
                                hint="Présentez votre activité, votre équipe et votre engagement envers vos voyageurs ou locataires."
                            >
                                <Textarea
                                    id="bio"
                                    name="bio"
                                    rows={4}
                                    defaultValue={bio}
                                    placeholder="Ex. Nous gérons des logements de qualité et mettons tout en œuvre pour que votre séjour ou location se passe dans les meilleures conditions..."
                                />
                            </Field>
                        </div>
                    )}

                    {mustVerifyEmail && (
                        <Alert tone="warning">
                            Votre adresse e-mail n’est pas encore confirmée.{' '}
                            <button
                                type="button"
                                onClick={() => void handleResend()}
                                className={textLinkClasses}
                            >
                                Renvoyer l’e-mail de confirmation
                            </button>
                            {verificationSent && (
                                <span className="mt-1 block">
                                    Un nouveau lien vous a été envoyé.
                                </span>
                            )}
                        </Alert>
                    )}

                    <div>
                        <Button type="submit" loading={savingProfile}>
                            Enregistrer
                        </Button>
                    </div>
                </form>
            </SectionCard>

            {canBecomeHost && (
                <SectionCard
                    title="Devenir hôte"
                    description="Proposez votre logement à la location et gérez vos réservations depuis votre espace hôte. Vous pourrez toujours réserver des séjours."
                >
                    {mustVerifyEmail ? (
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                            Confirmez d’abord votre adresse e-mail pour activer
                            le mode hôte.
                        </p>
                    ) : (
                        <Button
                            type="button"
                            variant="secondary"
                            loading={becomingHost}
                            onClick={() => void handleBecomeHost()}
                        >
                            Activer mon compte hôte
                        </Button>
                    )}
                </SectionCard>
            )}

            <SectionCard
                title="Supprimer mon compte"
                description="La suppression est définitive : vos données personnelles seront effacées."
                className="border-red-200 dark:border-red-900"
            >
                <Button
                    variant="danger"
                    onClick={() => setConfirmingDeletion(true)}
                >
                    Supprimer mon compte
                </Button>
            </SectionCard>

            <Modal
                open={confirmingDeletion}
                onClose={() => setConfirmingDeletion(false)}
                title="Confirmer la suppression"
            >
                <form
                    onSubmit={(event) => void handleDeleteAccount(event)}
                    className="flex flex-col gap-5"
                >
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        Saisissez votre mot de passe pour confirmer la
                        suppression définitive de votre compte.
                    </p>
                    <Field
                        label="Mot de passe"
                        htmlFor="delete-password"
                        error={deleteErrors.password}
                    >
                        <Input
                            id="delete-password"
                            type="password"
                            name="password"
                            required
                            autoComplete="current-password"
                            aria-invalid={!!deleteErrors.password}
                        />
                    </Field>
                    <div className="flex justify-end gap-2">
                        <Button
                            variant="ghost"
                            onClick={() => setConfirmingDeletion(false)}
                        >
                            Annuler
                        </Button>
                        <Button
                            type="submit"
                            variant="danger"
                            loading={deleting}
                        >
                            Supprimer définitivement
                        </Button>
                    </div>
                </form>
            </Modal>
        </>
    );
}

