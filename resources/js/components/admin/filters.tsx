import { router } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { Input } from '@/components/form';
import { cleanQuery } from '@/components/search-bar';
import { cn } from '@/lib/utils';

/**
 * Recharge la liste avec de nouveaux filtres, en repartant de la première page.
 */
export function applyFilters(url: string, query: Record<string, unknown>) {
    router.get(url, cleanQuery(query), {
        preserveState: true,
        preserveScroll: true,
        replace: true,
    });
}

/**
 * Barre de filtres : un champ de recherche (validé par Entrée) et des contrôles libres.
 */
export function FilterBar({
    search,
    placeholder,
    onSearch,
    children,
    className,
}: {
    search: string | null;
    placeholder: string;
    onSearch: (value: string) => void;
    children?: ReactNode;
    className?: string;
}) {
    return (
        <div
            className={cn(
                'flex flex-col gap-3 sm:flex-row sm:items-center',
                className,
            )}
        >
            <form
                role="search"
                className="sm:w-80"
                onSubmit={(event) => {
                    event.preventDefault();
                    const value = new FormData(event.currentTarget).get('q');
                    onSearch(typeof value === 'string' ? value.trim() : '');
                }}
            >
                <Input
                    type="search"
                    name="q"
                    defaultValue={search ?? ''}
                    placeholder={placeholder}
                    aria-label={placeholder}
                />
            </form>
            {children}
        </div>
    );
}

/**
 * Onglets de statut avec compteur.
 */
export function StatusTabs({
    tabs,
    current,
    onChange,
}: {
    tabs: { value: string; label: string; count?: number | null }[];
    current: string | null;
    onChange: (value: string) => void;
}) {
    return (
        <div
            role="tablist"
            className="flex gap-1 overflow-x-auto border-b border-zinc-200 dark:border-zinc-800"
        >
            {tabs.map((tab) => {
                const isActive = tab.value === current;

                return (
                    <button
                        key={tab.value}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => onChange(tab.value)}
                        className={cn(
                            '-mb-px flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors',
                            isActive
                                ? 'border-primary-600 text-zinc-900 dark:text-zinc-100'
                                : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100',
                        )}
                    >
                        {tab.label}
                        {tab.count != null && (
                            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                                {tab.count}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

/**
 * Tableau responsive : défile horizontalement sur petit écran.
 */
export function DataTable({
    head,
    children,
    empty,
}: {
    head: string[];
    children: ReactNode;
    empty?: string | false;
}) {
    return (
        <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <table className="w-full text-left text-sm">
                <thead className="border-b border-zinc-200 bg-zinc-50 text-xs tracking-wide text-zinc-500 uppercase dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-400">
                    <tr>
                        {head.map((label, index) => (
                            <th
                                key={`${label}-${index}`}
                                scope="col"
                                className="px-4 py-3 font-medium whitespace-nowrap"
                            >
                                {label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {children}
                </tbody>
            </table>
            {empty && (
                <p className="px-4 py-12 text-center text-sm text-zinc-500 dark:text-zinc-400">
                    {empty}
                </p>
            )}
        </div>
    );
}
