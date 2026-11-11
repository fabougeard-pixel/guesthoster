import { Form, Head, Link, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { textLinkClasses } from '@/components/auth-card';
import { Button } from '@/components/button';
import { Alert, Field, Input } from '@/components/form';
import { Modal } from '@/components/modal';
import { SectionCard } from '@/components/section-card';
import { store as becomeHost } from '@/routes/host-upgrade';
import { destroy, update } from '@/routes/profile';
import { send } from '@/routes/verification';

type ProfileProps = {
    mustVerifyEmail: boolean;
    status?: string;
    canBecomeHost: boolean;
};

export default function Profile({
    mustVerifyEmail,
    status,
    canBecomeHost,
}: ProfileProps) {
    const { auth } = usePage().props;
    const [confirmingDeletion, setConfirmingDeletion] = useState(false);

    if (!auth.user) {
        return null;
    }

    return (
        <>
            <Head title="Profil" />

            <SectionCard
                title="Informations personnelles"
                description="Votre nom est visible par les hôtes et les voyageurs avec qui vous échangez."
            >
                <Form
                    {...update.form()}
                    options={{ preserveScroll: true }}
                    className="flex flex-col gap-5"
                >
                    {({ errors, processing }) => (
                        <>
                            <Field
                                label="Nom complet"
                                htmlFor="name"
                                error={errors.name}
                            >
                                <Input
                                    id="name"
                                    name="name"
                                    defaultValue={auth.user?.name}
                                    required
                                    autoComplete="name"
                                    aria-invalid={!!errors.name}
                                />
                            </Field>

                            <Field
                                label="Adresse e-mail"
                                htmlFor="email"
                                error={errors.email}
                                hint="Un changement d’adresse nécessite une nouvelle confirmation."
                            >
                                <Input
                                    id="email"
                                    type="email"
                                    name="email"
                                    defaultValue={auth.user?.email}
                                    required
                                    autoComplete="email"
                                    aria-invalid={!!errors.email}
                                />
                            </Field>

                            {mustVerifyEmail && (
                                <Alert tone="warning">
                                    Votre adresse e-mail n’est pas encore
                                    confirmée.{' '}
                                    <Link
                                        href={send()}
                                        as="button"
                                        className={textLinkClasses}
                                    >
                                        Renvoyer l’e-mail de confirmation
                                    </Link>
                                    {status === 'verification-link-sent' && (
                                        <span className="mt-1 block">
                                            Un nouveau lien vous a été envoyé.
                                        </span>
                                    )}
                                </Alert>
                            )}

                            <div>
                                <Button type="submit" loading={processing}>
                                    Enregistrer
                                </Button>
                            </div>
                        </>
                    )}
                </Form>
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
                        <Form {...becomeHost.form()}>
                            {({ processing }) => (
                                <Button
                                    type="submit"
                                    variant="secondary"
                                    loading={processing}
                                >
                                    Activer mon compte hôte
                                </Button>
                            )}
                        </Form>
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
                <Form
                    {...destroy.form()}
                    options={{ preserveScroll: true }}
                    resetOnError
                    className="flex flex-col gap-5"
                >
                    {({ errors, processing }) => (
                        <>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                Saisissez votre mot de passe pour confirmer la
                                suppression définitive de votre compte.
                            </p>
                            <Field
                                label="Mot de passe"
                                htmlFor="delete-password"
                                error={errors.password}
                            >
                                <Input
                                    id="delete-password"
                                    type="password"
                                    name="password"
                                    required
                                    autoComplete="current-password"
                                    aria-invalid={!!errors.password}
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
                                    loading={processing}
                                >
                                    Supprimer définitivement
                                </Button>
                            </div>
                        </>
                    )}
                </Form>
            </Modal>
        </>
    );
}
