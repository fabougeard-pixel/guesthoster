import { Link } from '@inertiajs/react';
import { buttonClasses } from '@/components/button';
import { plural } from '@/lib/format';
import type { Paginated } from '@/types';

/**
 * Pagination « Précédent / Suivant » d’un paginateur Laravel ; les filtres sont conservés dans les URL.
 */
export function Pagination({
    paginator,
    noun,
    nounPlural,
}: {
    paginator: Paginated<unknown>;
    /** Nom des éléments au singulier (« logement »). */
    noun: string;
    nounPlural?: string;
}) {
    if (paginator.total === 0) {
        return null;
    }

    const linkClasses = buttonClasses({ variant: 'outline', size: 'sm' });

    return (
        <nav
            aria-label="Pagination"
            className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm text-zinc-600 dark:text-zinc-400"
        >
            <p>
                {paginator.from === paginator.to
                    ? paginator.from
                    : `${paginator.from}–${paginator.to}`}{' '}
                sur {plural(paginator.total, noun, nounPlural)}
            </p>
            {paginator.last_page > 1 && (
                <div className="flex items-center gap-2">
                    {paginator.prev_page_url ? (
                        <Link
                            href={paginator.prev_page_url}
                            className={linkClasses}
                        >
                            Précédent
                        </Link>
                    ) : (
                        <span
                            aria-disabled="true"
                            className={`${linkClasses} opacity-50`}
                        >
                            Précédent
                        </span>
                    )}
                    <span>
                        Page {paginator.current_page} / {paginator.last_page}
                    </span>
                    {paginator.next_page_url ? (
                        <Link
                            href={paginator.next_page_url}
                            className={linkClasses}
                        >
                            Suivant
                        </Link>
                    ) : (
                        <span
                            aria-disabled="true"
                            className={`${linkClasses} opacity-50`}
                        >
                            Suivant
                        </span>
                    )}
                </div>
            )}
        </nav>
    );
}
