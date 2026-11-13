'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { SearchBar } from '@/components/search-bar';

const DEFAULT_POPULAR_DESTINATIONS = [
    'Paris',
    'Nantes',
    'Lyon',
    'Marseille',
    'Bordeaux',
    'Cannes',
    'Nice',
    'Strasbourg',
];

export function HeaderSearchModal({
    destinations = DEFAULT_POPULAR_DESTINATIONS,
}: {
    destinations?: string[];
}) {
    const [isOpen, setIsOpen] = useState(false);
    const router = useRouter();

    // Lock body scroll while modal is open & listen for Escape
    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        }

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            document.body.style.overflow = prevOverflow;
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen]);

    return (
        <>
            {/* Header trigger button with Loupe icon */}
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                aria-label="Rechercher un logement"
                className="group flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50/90 px-3.5 py-1.5 text-xs font-medium text-zinc-700 shadow-2xs transition hover:border-primary-400 hover:bg-white hover:text-primary-700 sm:text-sm dark:border-zinc-800 dark:bg-zinc-900/90 dark:text-zinc-200 dark:hover:border-primary-500 dark:hover:bg-zinc-850 dark:hover:text-primary-300"
            >
                <span className="flex size-6 items-center justify-center rounded-full bg-primary-500 text-white shadow-xs transition group-hover:scale-105 group-hover:bg-primary-600">
                    <svg
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="size-3.5"
                        aria-hidden="true"
                    >
                        <path
                            fillRule="evenodd"
                            d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z"
                            clipRule="evenodd"
                        />
                    </svg>
                </span>
                <span className="hidden font-medium sm:inline">
                    Où allez-vous ?
                </span>
                <span className="font-medium sm:hidden">Rechercher</span>
            </button>

            {/* Fullscreen Search Modal */}
            {isOpen && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="search-modal-title"
                    className="animate-in fade-in fixed inset-0 z-50 flex flex-col overflow-y-auto bg-zinc-950/85 p-4 backdrop-blur-md duration-200 sm:p-6 sm:pt-8"
                >
                    {/* Top bar with close button */}
                    <div className="mx-auto flex w-full max-w-5xl items-center justify-between pb-6">
                        <div className="flex items-center gap-2">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src="/images/logos/logo-icon.svg"
                                alt=""
                                width={28}
                                height={28}
                                className="size-7"
                            />
                            <span className="text-sm font-semibold tracking-wide text-zinc-200 uppercase">
                                GuestHoster Recherche
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20"
                        >
                            <span>Fermer</span>
                            <span className="text-[10px] text-zinc-400">
                                (Échap)
                            </span>
                            <svg
                                viewBox="0 0 20 20"
                                fill="currentColor"
                                className="size-4"
                                aria-hidden="true"
                            >
                                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                            </svg>
                        </button>
                    </div>

                    {/* Centered content */}
                    <div className="my-auto mx-auto w-full max-w-4xl py-6 sm:py-12">
                        <div className="mb-8 text-center">
                            <h2
                                id="search-modal-title"
                                className="text-2xl font-bold text-white sm:text-4xl"
                            >
                                Où voulez-vous aller ?
                            </h2>
                            <p className="mt-2 text-sm text-zinc-300 sm:text-base">
                                Trouvez l’hébergement parfait pour votre séjour
                                en courte ou longue durée.
                            </p>
                        </div>

                        {/* Search bar pill variant */}
                        <div className="rounded-3xl bg-white/5 p-2 shadow-2xl backdrop-blur-sm sm:p-3">
                            <SearchBar
                                destinations={destinations}
                                variant="pill"
                                onSearch={() => setIsOpen(false)}
                            />
                        </div>

                        {/* Suggestions rapides de destinations */}
                        <div className="mt-8 text-center">
                            <p className="text-xs font-semibold tracking-wider text-zinc-400 uppercase">
                                Destinations suggérées
                            </p>
                            <div className="mt-3 flex flex-wrap justify-center gap-2">
                                {destinations.slice(0, 8).map((city) => (
                                    <button
                                        key={city}
                                        type="button"
                                        onClick={() => {
                                            setIsOpen(false);
                                            router.push(
                                                `/logements?destination=${encodeURIComponent(city)}`,
                                            );
                                        }}
                                        className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-primary-400 hover:bg-white/15 hover:text-white"
                                    >
                                        <svg
                                            viewBox="0 0 20 20"
                                            fill="currentColor"
                                            className="size-3.5 text-primary-400"
                                            aria-hidden="true"
                                        >
                                            <path
                                                fillRule="evenodd"
                                                d="m9.69 18.933.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 0 0 .281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 1 0 3 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 0 0 2.273 1.765 11.742 11.742 0 0 0 1.04 5.73l.018.008.006.003ZM10 11.25a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                        <span>{city}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Catégories rapides */}
                        <div className="mt-8 flex justify-center gap-4 text-xs text-zinc-400">
                            <Link
                                href="/logements?rental_duration=short_term"
                                onClick={() => setIsOpen(false)}
                                className="hover:text-primary-300"
                            >
                                Séjours courte durée →
                            </Link>
                            <span>·</span>
                            <Link
                                href="/logements?rental_duration=long_term"
                                onClick={() => setIsOpen(false)}
                                className="hover:text-primary-300"
                            >
                                Locations longue durée (au mois) →
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

