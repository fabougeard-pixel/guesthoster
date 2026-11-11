import { Link, usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { Container } from '@/components/card';
import { cn } from '@/lib/utils';

export type SectionLink = {
    label: string;
    href: string;
    /** Actif uniquement sur l’URL exacte (tableau de bord), sinon sur tout le préfixe. */
    exact?: boolean;
};

/**
 * Barre de navigation secondaire d’un espace (hôte, administration) et contenu de la page.
 */
export function SectionLayout({
    title,
    links,
    children,
}: {
    title: string;
    links: SectionLink[];
    children: ReactNode;
}) {
    const path = usePage().url.split('?')[0];

    return (
        <>
            <div className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
                <Container className="flex h-12 items-center gap-6 text-sm">
                    <span className="shrink-0 font-semibold text-secondary-800 dark:text-secondary-300">
                        {title}
                    </span>
                    <nav
                        aria-label={title}
                        className="-mx-1 flex gap-1 overflow-x-auto px-1"
                    >
                        {links.map((link) => {
                            const isActive = link.exact
                                ? path === link.href
                                : path.startsWith(link.href);

                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    aria-current={isActive ? 'page' : undefined}
                                    className={cn(
                                        'rounded-lg px-3 py-1.5 font-medium whitespace-nowrap transition-colors',
                                        isActive
                                            ? 'bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-zinc-100'
                                            : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100',
                                    )}
                                >
                                    {link.label}
                                </Link>
                            );
                        })}
                    </nav>
                </Container>
            </div>
            <Container className="py-10">{children}</Container>
        </>
    );
}
