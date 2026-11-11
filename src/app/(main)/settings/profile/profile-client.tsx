'use client';

import type { FormEvent } from 'react';
import { useState } from 'react';
import { textLinkClasses } from '@/components/auth-card';
import { Button } from '@/components/button';
import { Alert, Field, Input } from '@/components/form';
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

export function ProfileClient({
    name,
    email,
    mustVerifyEmail,
    canBecomeHost,
}: {
    name: string;
    email: string;
    mustVerifyEmail: boolean;
    canBecomeHost: boolean;
}) {
    const { applyResult } = useActionFeedback();
    const [savingProfile, setSavingProfile] = useState(false);
    const [profileErrors, setProfileErrors] = useState<FieldErrors>({});
    const [verificationSent, setVerificationSent] = useState(false);
    const [becomingHost, setBecomingHost] = useState(false);
    const [confirmingDeletion, setConfirmingDeletion] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [deleteErrors, setDeleteErrors] = useState<FieldErrors>({});

    async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSavingProfile(true);
        setProfileErrors({});
        const fd = new FormData(event.currentTarget);

        try {
            const res = await updateProfileAction({
                name: String(fd.get('name') ?? ''),
                email: String(fd.get('email') ?? ''),
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

