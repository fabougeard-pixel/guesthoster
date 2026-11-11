import { Head, Link } from '@inertiajs/react';
import { buttonClasses } from '@/components/button';
import { Container } from '@/components/card';
import { home } from '@/routes';

const messages: Record<number, { title: string; description: string }> = {
    403: {
        title: 'Accès refusé',
        description: 'Vous n’avez pas l’autorisation d’accéder à cette page.',
    },
    404: {
        title: 'Page introuvable',
        description:
            'La page que vous cherchez n’existe pas ou a été déplacée.',
    },
    419: {
        title: 'Session expirée',
        description: 'Votre session a expiré. Rechargez la page et réessayez.',
    },
    429: {
        title: 'Trop de requêtes',
        description: 'Merci de patienter quelques instants avant de réessayer.',
    },
    500: {
        title: 'Erreur serveur',
        description: 'Une erreur inattendue est survenue de notre côté.',
    },
    503: {
        title: 'Maintenance en cours',
        description:
            'GuestHoster est en maintenance. Revenez dans quelques minutes.',
    },
};

export default function ErrorPage({ status }: { status: number }) {
    const { title, description } = messages[status] ?? messages[500];

    return (
        <>
            <Head title={title} />
            <Container className="flex flex-col items-center py-24 text-center">
                <p className="text-6xl font-semibold text-primary-600 dark:text-primary-400">
                    {status}
                </p>
                <h1 className="mt-4 text-2xl font-semibold">{title}</h1>
                <p className="mt-2 max-w-md text-zinc-600 dark:text-zinc-400">
                    {description}
                </p>
                <Link
                    href={home()}
                    className={buttonClasses({ className: 'mt-8' })}
                >
                    Retour à l’accueil
                </Link>
            </Container>
        </>
    );
}
