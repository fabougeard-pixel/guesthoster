'use client';

import { useState } from 'react';
import { AuthCard, textLinkClasses } from '@/components/auth-card';
import { Button } from '@/components/button';
import { Alert } from '@/components/form';
import { useActionFeedback } from '@/components/use-action-feedback';
import {
    logoutAction,
    resendVerificationEmailAction,
} from '@/lib/actions/auth';

export function VerifyEmailForm({ invalidLink }: { invalidLink: boolean }) {
    const { applyResult } = useActionFeedback();
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    async function resend() {
        setLoading(true);
        try {
            const res = await resendVerificationEmailAction();
            applyResult(res, {
                onSuccess: () => setSent(true),
            });
        } finally {
            setLoading(false);
        }
    }

    async function logout() {
        const res = await logoutAction();
        applyResult(res);
    }

    return (
        <AuthCard
            title="Confirmez votre adresse e-mail"
            description="Nous venons de vous envoyer un lien de confirmation. Cliquez dessus pour activer votre compte."
            footer={
                <button
                    type="button"
                    onClick={() => void logout()}
                    className={textLinkClasses}
                >
                    Se déconnecter
                </button>
            }
        >
            {invalidLink && !sent && (
                <div className="mb-6">
                    <Alert tone="warning">
                        Ce lien de confirmation est invalide ou a expiré.
                        Demandez-en un nouveau ci-dessous.
                    </Alert>
                </div>
            )}

            {sent && (
                <div className="mb-6">
                    <Alert>
                        Un nouveau lien de confirmation vient de vous être
                        envoyé.
                    </Alert>
                </div>
            )}

            <div className="flex flex-col">
                <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    loading={loading}
                    onClick={() => void resend()}
                >
                    Renvoyer l’e-mail
                </Button>
            </div>
        </AuthCard>
    );
}

