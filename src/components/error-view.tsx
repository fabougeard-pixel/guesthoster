import Link from 'next/link';
import { buttonClasses } from '@/components/button';
import { Container } from '@/components/card';

const messages: Record<number, { title: string; description: string }> = {
    403: {
        title: 'Accès refusé',
        description:
            'Vous n’avez pas l’autorisation d’accéder à cette page.',
    },
    404: {
        title: 'Page introuvable',
        description:
            'La page que vous cherchez n’existe pas ou a été déplacée.',
    },
    500: {
        title: 'Erreur serveur',
        description: 'Une erreur inattendue est survenue de notre côté.',
    },
};

export function ErrorView({ status }: { status: number }) {
    const info = messages[status] ?? messages[500]!;

    return (
        <Container className="flex flex-col items-center py-24 text-center">
            <p className="text-6xl font-semibold text-primary-600 dark:text-primary-400">
                {status}
            </p>
            <h1 className="mt-4 text-2xl font-semibold">{info.title}</h1>
            <p className="mt-2 max-w-md text-zinc-600 dark:text-zinc-400">
                {info.description}
            </p>
            <Link href="/" className={buttonClasses({ className: 'mt-8' })}>
                Retour à l’accueil
            </Link>
        </Container>
    );
}

