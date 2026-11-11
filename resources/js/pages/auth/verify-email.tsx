import { Form, Head, Link } from '@inertiajs/react';
import { AuthCard, textLinkClasses } from '@/components/auth-card';
import { Button } from '@/components/button';
import { Alert } from '@/components/form';
import { logout } from '@/routes';
import { send } from '@/routes/verification';

export default function VerifyEmail({ status }: { status?: string }) {
    return (
        <>
            <Head title="Confirmez votre adresse e-mail" />
            <AuthCard
                title="Confirmez votre adresse e-mail"
                description="Nous venons de vous envoyer un lien de confirmation. Cliquez dessus pour activer votre compte."
                footer={
                    <Link
                        href={logout()}
                        as="button"
                        className={textLinkClasses}
                    >
                        Se déconnecter
                    </Link>
                }
            >
                {status === 'verification-link-sent' && (
                    <div className="mb-6">
                        <Alert>
                            Un nouveau lien de confirmation vient de vous être
                            envoyé.
                        </Alert>
                    </div>
                )}

                <Form {...send.form()} className="flex flex-col">
                    {({ processing }) => (
                        <Button
                            type="submit"
                            variant="outline"
                            size="lg"
                            loading={processing}
                        >
                            Renvoyer l’e-mail
                        </Button>
                    )}
                </Form>
            </AuthCard>
        </>
    );
}
