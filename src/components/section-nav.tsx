'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { buttonClasses } from '@/components/button';
import { useAppState } from '@/components/providers';
import {
    isSectionLinkActive,
    type SectionLink,
    type SectionNavGroup,
    type SectionNavIconName,
} from '@/lib/navigation/section-nav';
import { cn } from '@/lib/utils';

export type { SectionLink, SectionNavGroup, SectionNavIconName };
export { isSectionLinkActive };

function NavIcon({
    name,
    className,
}: {
    name?: SectionNavIconName;
    className?: string;
}) {
    const props = {
        className: cn('size-4 shrink-0', className),
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.8,
        strokeLinecap: 'round' as const,
        strokeLinejoin: 'round' as const,
        'aria-hidden': true as const,
    };

    switch (name) {
        case 'dashboard':
            return (
                <svg {...props}>
                    <rect x="3" y="3" width="7" height="9" rx="1" />
                    <rect x="14" y="3" width="7" height="5" rx="1" />
                    <rect x="14" y="12" width="7" height="9" rx="1" />
                    <rect x="3" y="16" width="7" height="5" rx="1" />
                </svg>
            );
        case 'home':
            return (
                <svg {...props}>
                    <path d="M3 10.5 12 3l9 7.5" />
                    <path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" />
                    <path d="M9 21V13h6v8" />
                </svg>
            );
        case 'plus':
            return (
                <svg {...props}>
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 8v8M8 12h8" />
                </svg>
            );
        case 'calendar':
            return (
                <svg {...props}>
                    <rect x="3" y="4" width="18" height="17" rx="2" />
                    <path d="M8 2v4M16 2v4M3 10h18" />
                </svg>
            );
        case 'users':
            return (
                <svg {...props}>
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
            );
        case 'globe':
            return (
                <svg {...props}>
                    <circle cx="12" cy="12" r="9" />
                    <path d="M3.6 9h16.8M3.6 15h16.8" />
                    <path d="M12 3a13 13 0 0 1 0 18M12 3a13 13 0 0 0 0 18" />
                </svg>
            );
        case 'map-pin':
            return (
                <svg {...props}>
                    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                    <circle cx="12" cy="10" r="2.5" />
                </svg>
            );
        case 'sparkles':
            return (
                <svg {...props}>
                    <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
                </svg>
            );
        case 'tag':
            return (
                <svg {...props}>
                    <path d="M12.6 2H6a2 2 0 0 0-2 2v6.6a2 2 0 0 0 .6 1.4l8.4 8.4a2.4 2.4 0 0 0 3.4 0l4-4a2.4 2.4 0 0 0 0-3.4L14 2.6A2 2 0 0 0 12.6 2Z" />
                    <circle cx="8.5" cy="7.5" r="1" />
                </svg>
            );
        case 'shield':
            return (
                <svg {...props}>
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
                </svg>
            );
        default:
            return (
                <svg {...props}>
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.6.77 1.02 1.42 1.09H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
                </svg>
            );
    }
}

export function SectionLayout({
    title,
    subtitle,
    cta,
    links = [],
    sections,
    workspace,
    children,
}: {
    title: string;
    subtitle?: string;
    cta?: { label: string; href: string };
    links?: SectionLink[];
    sections?: SectionNavGroup[];
    workspace?: 'admin' | 'host' | 'settings';
    children: ReactNode;
}) {
    const pathname = usePathname();
    const { user } = useAppState();
    const [mobileOpen, setMobileOpen] = useState(false);

    const groups: SectionNavGroup[] = sections ?? [{ links }];
    const showWorkspaceSwitcher =
        (workspace === 'admin' || workspace === 'host') &&
        user?.role === 'admin';

    const sidebarContent = (
        <div className="flex flex-col gap-5">
            <div className="px-1">
                <p className="text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                    {title}
                </p>
                {subtitle && (
                    <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                        {subtitle}
                    </p>
                )}
            </div>

            {cta && (
                <Link
                    href={cta.href}
                    onClick={() => setMobileOpen(false)}
                    className={buttonClasses({
                        variant: 'primary',
                        className: 'w-full justify-center',
                    })}
                >
                    <svg
                        className="size-4 shrink-0"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2.2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                    >
                        <path d="M12 5v14M5 12h14" />
                    </svg>
                    {cta.label}
                </Link>
            )}

            {showWorkspaceSwitcher && (
                <div
                    role="group"
                    aria-label="Changer d’espace"
                    className="grid grid-cols-2 gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800/80"
                >
                    <Link
                        href="/admin"
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                            'flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors',
                            workspace === 'admin'
                                ? 'bg-white text-zinc-900 shadow-xs dark:bg-zinc-900 dark:text-zinc-100'
                                : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100',
                        )}
                    >
                        Admin
                    </Link>
                    <Link
                        href="/hote"
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                            'flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors',
                            workspace === 'host'
                                ? 'bg-white text-zinc-900 shadow-xs dark:bg-zinc-900 dark:text-zinc-100'
                                : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100',
                        )}
                    >
                        Espace hôte
                    </Link>
                </div>
            )}

            <nav aria-label={title} className="flex flex-col gap-5">
                {groups.map((group, groupIndex) => (
                    <div
                        key={group.heading ?? `group-${groupIndex}`}
                        className="flex flex-col gap-1"
                    >
                        {group.heading && (
                            <p className="px-2.5 pb-1 text-[11px] font-semibold tracking-wider text-zinc-400 uppercase dark:text-zinc-500">
                                {group.heading}
                            </p>
                        )}
                        {group.links.map((link) => {
                            const active = isSectionLinkActive(pathname, link);

                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    onClick={() => setMobileOpen(false)}
                                    aria-current={active ? 'page' : undefined}
                                    className={cn(
                                        'flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                                        active
                                            ? 'bg-primary-50 text-primary-700 dark:bg-primary-950/60 dark:text-primary-300'
                                            : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/70 dark:hover:text-zinc-100',
                                    )}
                                >
                                    {link.icon && (
                                        <NavIcon
                                            name={link.icon}
                                            className={
                                                active
                                                    ? 'text-primary-600 dark:text-primary-400'
                                                    : 'text-zinc-400 dark:text-zinc-500'
                                            }
                                        />
                                    )}
                                    <span className="truncate">{link.label}</span>
                                </Link>
                            );
                        })}
                    </div>
                ))}
            </nav>

            {(workspace === 'admin' || workspace === 'host') && (
                <div className="border-t border-zinc-200 pt-3 dark:border-zinc-800">
                    <Link
                        href="/recherche"
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                    >
                        <span>Voir le catalogue public</span>
                        <span aria-hidden="true">↗</span>
                    </Link>
                </div>
            )}
        </div>
    );

    return (
        <div>
            {/* Mobile workspace header & drawer */}
            <div className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 lg:hidden">
                <div className="mx-auto flex max-w-[88rem] items-center justify-between gap-3 px-4 py-3 sm:px-6">
                    <div className="flex items-center gap-2.5">
                        <button
                            type="button"
                            onClick={() => setMobileOpen((prev) => !prev)}
                            aria-expanded={mobileOpen}
                            aria-controls="workspace-mobile-nav"
                            className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                        >
                            <svg
                                className="size-4"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden="true"
                            >
                                {mobileOpen ? (
                                    <path d="M18 6 6 18M6 6l12 12" />
                                ) : (
                                    <path d="M4 6h16M4 12h16M4 18h16" />
                                )}
                            </svg>
                            <span>Menu</span>
                        </button>
                        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                            {title}
                        </span>
                    </div>

                    {cta && (
                        <Link
                            href={cta.href}
                            className={buttonClasses({
                                variant: 'primary',
                                size: 'sm',
                            })}
                        >
                            + {cta.label.replace(/^Ajouter un logement$/i, 'Logement')}
                        </Link>
                    )}
                </div>

                {mobileOpen && (
                    <div
                        id="workspace-mobile-nav"
                        className="border-t border-zinc-200 bg-white px-4 py-4 sm:px-6 dark:border-zinc-800 dark:bg-zinc-950"
                    >
                        {sidebarContent}
                    </div>
                )}
            </div>

            <div className="mx-auto flex w-full max-w-[88rem] flex-col gap-8 px-4 py-8 sm:px-6 lg:flex-row lg:items-start lg:px-8">
                <aside className="hidden lg:block lg:w-64 xl:w-72 shrink-0 lg:sticky lg:top-22">
                    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
                        {sidebarContent}
                    </div>
                </aside>

                <div className="min-w-0 flex-1">{children}</div>
            </div>
        </div>
    );
}
