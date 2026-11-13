'use client';

import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';
import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/button';
import { Input, Label } from '@/components/form';
import { addDays, plural, todayIso } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { SearchFilters } from '@/types';

type SearchValues = Pick<
    SearchFilters,
    'destination' | 'check_in' | 'check_out' | 'guests'
>;

export function buildQueryString(query: Record<string, unknown>): string {
    const sp = new URLSearchParams();
    for (const [key, value] of Object.entries(cleanQuery(query))) {
        if (Array.isArray(value)) {
            const arrayKey = key.endsWith('[]') ? key : `${key}[]`;
            for (const item of value) {
                sp.append(arrayKey, item);
            }
        } else {
            sp.set(key, String(value));
        }
    }
    return sp.toString();
}

export function cleanQuery(
    query: Record<string, unknown>,
): Record<string, string | number | string[]> {
    const cleaned: Record<string, string | number | string[]> = {};

    for (const [key, value] of Object.entries(query)) {
        if (
            value === undefined ||
            value === null ||
            value === '' ||
            value === false ||
            (Array.isArray(value) && value.length === 0) ||
            (key === 'sort' && value === 'newest')
        ) {
            continue;
        }

        cleaned[key] =
            value === true ? '1' : (value as string | number | string[]);
    }

    return cleaned;
}

function CalendarIcon({ className }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            className={cn(
                'size-5 shrink-0 text-secondary-800 dark:text-primary-400',
                className,
            )}
            aria-hidden="true"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
            />
        </svg>
    );
}

function PinIcon({ className }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            className={cn(
                'size-5 shrink-0 text-secondary-800 dark:text-primary-400',
                className,
            )}
            aria-hidden="true"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
            />
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
            />
        </svg>
    );
}

function GuestsIcon({ className }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            className={cn(
                'size-5 shrink-0 text-secondary-800 dark:text-primary-400',
                className,
            )}
            aria-hidden="true"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
            />
        </svg>
    );
}

export function SearchBar({
    destinations,
    initial,
    keep = {},
    variant = 'card',
    className,
    onSearch,
}: {
    destinations: string[];
    initial?: Partial<SearchValues>;
    keep?: Record<string, unknown>;
    variant?: 'card' | 'pill';
    className?: string;
    onSearch?: () => void;
}) {
    const router = useRouter();
    const id = useId();
    const today = todayIso();

    // Destination state & in-place overlay
    const [destination, setDestination] = useState(initial?.destination ?? '');
    const [isDestOpen, setIsDestOpen] = useState(false);
    const destContainerRef = useRef<HTMLDivElement>(null);
    const destInputRef = useRef<HTMLInputElement>(null);

    // Dates state & refs (2 clean inputs without native icons)
    const [checkIn, setCheckIn] = useState(initial?.check_in ?? '');
    const [checkOut, setCheckOut] = useState(initial?.check_out ?? '');
    const checkInRef = useRef<HTMLInputElement>(null);
    const checkOutRef = useRef<HTMLInputElement>(null);

    // Guests state & in-place overlay
    const initialGuests = initial?.guests ? Number(initial.guests) : null;
    const [guests, setGuests] = useState<number | null>(
        initialGuests && Number.isFinite(initialGuests) && initialGuests >= 1
            ? initialGuests
            : null,
    );
    const [isGuestsOpen, setIsGuestsOpen] = useState(false);
    const guestsContainerRef = useRef<HTMLDivElement>(null);

    // Close overlays on outside click or Escape
    useEffect(() => {
        function handleClickOutside(event: MouseEvent | TouchEvent) {
            const target = event.target as Node;
            if (
                destContainerRef.current &&
                !destContainerRef.current.contains(target)
            ) {
                setIsDestOpen(false);
            }
            if (
                guestsContainerRef.current &&
                !guestsContainerRef.current.contains(target)
            ) {
                setIsGuestsOpen(false);
            }
        }

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                setIsDestOpen(false);
                setIsGuestsOpen(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('touchstart', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    // Filter destinations
    const trimmedDest = destination.trim().toLowerCase();
    const filteredDestinations = trimmedDest
        ? destinations.filter((d) => d.toLowerCase().includes(trimmedDest))
        : destinations;

    function handleCheckInChange(val: string) {
        setCheckIn(val);
        if (checkOut && val && val >= checkOut) {
            setCheckOut('');
        }
    }

    function handleCheckOutChange(val: string) {
        setCheckOut(val);
    }

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const query: Record<string, unknown> = { ...keep };

        for (const key of ['destination', 'check_in', 'check_out', 'guests']) {
            const raw = data.get(key);
            const value = typeof raw === 'string' ? raw.trim() : '';
            query[key] = value === '' ? undefined : value;
        }

        const qs = buildQueryString(query);
        onSearch?.();
        router.push(qs ? `/logements?${qs}` : '/logements');
    }

    if (variant === 'pill') {
        return (
            <form
                role="search"
                onSubmit={submit}
                className={cn(
                    'relative z-20 grid gap-2 rounded-3xl bg-white p-2 text-zinc-900 shadow-2xl ring-1 ring-black/5 lg:grid-cols-[1.3fr_1fr_1fr_1.1fr_auto] lg:items-center lg:gap-0 lg:rounded-full dark:bg-zinc-900 dark:text-zinc-100 dark:ring-white/10',
                    className,
                )}
            >
                {/* 1. Où voulez-vous aller ? (Sélection in-place recouvrant la case) */}
                <div
                    ref={destContainerRef}
                    className="relative flex items-center px-4 py-2 lg:py-1.5"
                >
                    <div
                        onClick={() => {
                            setIsDestOpen(true);
                            setTimeout(() => destInputRef.current?.focus(), 50);
                        }}
                        className="flex w-full cursor-pointer items-center gap-2.5"
                    >
                        <PinIcon />
                        <div className="min-w-0 flex-1">
                            <span className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                                Destination
                            </span>
                            <span
                                className={cn(
                                    'block truncate text-sm font-medium',
                                    destination
                                        ? 'font-semibold text-zinc-900 dark:text-zinc-100'
                                        : 'text-zinc-500 dark:text-zinc-400',
                                )}
                            >
                                {destination || 'Où voulez-vous aller ?'}
                            </span>
                        </div>
                        {destination && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setDestination('');
                                }}
                                aria-label="Effacer la destination"
                                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                            >
                                <svg
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                    className="size-4"
                                    aria-hidden="true"
                                >
                                    <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                                </svg>
                            </button>
                        )}
                    </div>

                    {/* Champ formulaire caché */}
                    <input
                        type="hidden"
                        name="destination"
                        value={destination}
                    />

                    {/* Overlay in-place : s'affiche DIRECTEMENT SUR "Où voulez-vous aller ?" en le cachant */}
                    {isDestOpen && (
                        <div className="animate-in fade-in zoom-in-95 absolute top-0 left-0 z-40 w-full min-w-[280px] rounded-3xl bg-white p-2.5 text-zinc-900 shadow-2xl ring-2 ring-primary-500/30 duration-150 sm:min-w-[340px] dark:bg-zinc-900 dark:text-zinc-100 dark:ring-primary-400/30">
                            {/* Entête avec input actif recouvrant le champ */}
                            <div className="flex items-center gap-2 px-2 py-1">
                                <PinIcon className="size-4.5" />
                                <input
                                    ref={destInputRef}
                                    placeholder="Tapez une ville ou un pays..."
                                    aria-label="Rechercher une destination"
                                    value={destination}
                                    onChange={(e) =>
                                        setDestination(e.target.value)
                                    }
                                    className="flex-1 bg-transparent text-sm font-semibold text-zinc-900 placeholder:font-normal placeholder:text-zinc-400 focus:outline-none dark:text-zinc-100"
                                />
                                <button
                                    type="button"
                                    onClick={() => setIsDestOpen(false)}
                                    aria-label="Fermer la sélection"
                                    className="flex size-7 items-center justify-center rounded-full bg-zinc-100 text-xs text-zinc-500 transition hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Liste des choix : sélection automatique et fermeture immédiate */}
                            <div className="mt-2 border-t border-zinc-100 pt-1.5 dark:border-zinc-800">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setDestination('');
                                        setIsDestOpen(false);
                                    }}
                                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-medium text-zinc-700 hover:bg-primary-50 hover:text-primary-700 dark:text-zinc-200 dark:hover:bg-primary-950/40 dark:hover:text-primary-300"
                                >
                                    <svg
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth={1.8}
                                        className="size-4 shrink-0 text-primary-600 dark:text-primary-400"
                                        aria-hidden="true"
                                    >
                                        <circle cx="12" cy="12" r="10" />
                                        <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                                        <path d="M2 12h20" />
                                    </svg>
                                    <span>Toutes les destinations</span>
                                </button>
                                <div className="max-h-52 divide-y divide-zinc-50 overflow-y-auto overscroll-contain dark:divide-zinc-800/50">
                                    {filteredDestinations.length > 0 ? (
                                        filteredDestinations.map((dest) => (
                                            <button
                                                key={dest}
                                                type="button"
                                                onClick={() => {
                                                    setDestination(dest);
                                                    setIsDestOpen(false);
                                                }}
                                                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-medium text-zinc-800 hover:bg-primary-50 hover:text-primary-700 dark:text-zinc-200 dark:hover:bg-primary-950/40 dark:hover:text-primary-300"
                                            >
                                                <svg
                                                    viewBox="0 0 20 20"
                                                    fill="currentColor"
                                                    className="size-4 shrink-0 text-secondary-600 dark:text-primary-400"
                                                    aria-hidden="true"
                                                >
                                                    <path
                                                        fillRule="evenodd"
                                                        d="m9.69 18.933.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 0 0 .281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 1 0 3 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 0 0 2.273 1.765 11.742 11.742 0 0 0 1.04 5.73l.018.008.006.003ZM10 11.25a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z"
                                                        clipRule="evenodd"
                                                    />
                                                </svg>
                                                <span className="truncate">
                                                    {dest}
                                                </span>
                                            </button>
                                        ))
                                    ) : (
                                        <div className="p-3 text-center text-xs text-zinc-500">
                                            Aucune destination trouvée
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* 2. Case Arrivée (Icône violette réutilisée, sans icône native noire) */}
                <div
                    onClick={() => checkInRef.current?.showPicker?.()}
                    className="relative flex cursor-pointer items-center gap-2.5 border-t border-zinc-200 px-4 py-2 transition-colors hover:bg-zinc-50/80 lg:border-t-0 lg:border-l lg:py-1.5 dark:border-zinc-800 dark:hover:bg-zinc-800/40"
                >
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            checkInRef.current?.showPicker?.();
                        }}
                        aria-label="Sélectionner la date d'arrivée"
                        className="shrink-0"
                    >
                        <CalendarIcon />
                    </button>
                    <div className="min-w-0 flex-1">
                        <span className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                            Arrivée
                        </span>
                        <input
                            ref={checkInRef}
                            id={`${id}-check-in`}
                            name="check_in"
                            type="date"
                            min={today}
                            value={checkIn}
                            onChange={(e) =>
                                handleCheckInChange(e.target.value)
                            }
                            className="w-full cursor-pointer bg-transparent text-xs font-medium text-zinc-900 focus:outline-none sm:text-sm dark:text-zinc-100 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0"
                        />
                    </div>
                </div>

                {/* 3. Case Départ (Même icône violette réutilisée, sans icône native noire) */}
                <div
                    onClick={() => checkOutRef.current?.showPicker?.()}
                    className="relative flex cursor-pointer items-center gap-2.5 border-t border-zinc-200 px-4 py-2 transition-colors hover:bg-zinc-50/80 lg:border-t-0 lg:border-l lg:py-1.5 dark:border-zinc-800 dark:hover:bg-zinc-800/40"
                >
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            checkOutRef.current?.showPicker?.();
                        }}
                        aria-label="Sélectionner la date de départ"
                        className="shrink-0"
                    >
                        <CalendarIcon />
                    </button>
                    <div className="min-w-0 flex-1">
                        <span className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                            Départ
                        </span>
                        <input
                            ref={checkOutRef}
                            id={`${id}-check-out`}
                            name="check_out"
                            type="date"
                            min={
                                checkIn
                                    ? addDays(checkIn, 1)
                                    : addDays(today, 1)
                            }
                            value={checkOut}
                            onChange={(e) =>
                                handleCheckOutChange(e.target.value)
                            }
                            className="w-full cursor-pointer bg-transparent text-xs font-medium text-zinc-900 focus:outline-none sm:text-sm dark:text-zinc-100 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0"
                        />
                    </div>
                </div>

                {/* 4. Voyageurs (Sélection in-place recouvrant la case) */}
                <div
                    ref={guestsContainerRef}
                    className="relative flex items-center border-t border-zinc-200 px-4 py-2 lg:border-t-0 lg:border-l lg:py-1.5 dark:border-zinc-800"
                >
                    <div
                        onClick={() => setIsGuestsOpen(true)}
                        className="flex w-full cursor-pointer items-center justify-between gap-2"
                    >
                        <div className="flex min-w-0 items-center gap-2.5">
                            <GuestsIcon />
                            <div className="min-w-0">
                                <span className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                                    Voyageurs
                                </span>
                                <span
                                    className={cn(
                                        'block truncate text-sm font-medium',
                                        guests
                                            ? 'font-semibold text-zinc-900 dark:text-zinc-100'
                                            : 'text-zinc-500 dark:text-zinc-400',
                                    )}
                                >
                                    {guests
                                        ? plural(guests, 'voyageur')
                                        : 'Voyageurs'}
                                </span>
                            </div>
                        </div>
                        <svg
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            className="size-4 shrink-0 text-zinc-400"
                            aria-hidden="true"
                        >
                            <path
                                fillRule="evenodd"
                                d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
                                clipRule="evenodd"
                            />
                        </svg>
                    </div>

                    {/* Champ formulaire caché */}
                    <input
                        type="hidden"
                        name="guests"
                        value={guests ? String(guests) : ''}
                    />

                    {/* Overlay in-place : s'affiche DIRECTEMENT SUR "Voyageurs" en le cachant */}
                    {isGuestsOpen && (
                        <div className="animate-in fade-in zoom-in-95 absolute top-0 right-0 z-40 w-full min-w-[280px] rounded-3xl bg-white p-3.5 text-zinc-900 shadow-2xl ring-2 ring-primary-500/30 duration-150 sm:w-80 dark:bg-zinc-900 dark:text-zinc-100 dark:ring-primary-400/30">
                            {/* Entête */}
                            <div className="flex items-center justify-between border-b border-zinc-100 pb-2 dark:border-zinc-800">
                                <div className="flex items-center gap-2">
                                    <GuestsIcon className="size-4.5" />
                                    <span className="text-sm font-semibold">
                                        Voyageurs
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsGuestsOpen(false)}
                                    aria-label="Fermer"
                                    className="flex size-7 items-center justify-center rounded-full bg-zinc-100 text-xs text-zinc-500 transition hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Stepper +/- */}
                            <div className="mt-3 flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                                        Adultes & enfants
                                    </p>
                                    <p className="text-[11px] text-zinc-400">
                                        À partir de 1 voyageur
                                    </p>
                                </div>
                                <div className="flex items-center gap-2.5">
                                    <button
                                        type="button"
                                        disabled={!guests || guests <= 1}
                                        onClick={() =>
                                            setGuests((prev) =>
                                                prev && prev > 1
                                                    ? prev - 1
                                                    : null,
                                            )
                                        }
                                        className="flex size-8 items-center justify-center rounded-full border border-zinc-300 text-zinc-700 transition hover:border-zinc-400 disabled:opacity-30 dark:border-zinc-700 dark:text-zinc-200"
                                        aria-label="Diminuer"
                                    >
                                        −
                                    </button>
                                    <span className="w-5 text-center text-sm font-bold">
                                        {guests ?? 1}
                                    </span>
                                    <button
                                        type="button"
                                        disabled={(guests ?? 1) >= 16}
                                        onClick={() =>
                                            setGuests((prev) =>
                                                prev
                                                    ? Math.min(16, prev + 1)
                                                    : 2,
                                            )
                                        }
                                        className="flex size-8 items-center justify-center rounded-full border border-zinc-300 text-zinc-700 transition hover:border-zinc-400 disabled:opacity-30 dark:border-zinc-700 dark:text-zinc-200"
                                        aria-label="Augmenter"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>

                            {/* Sélection rapide : capture automatique au clic */}
                            <div className="mt-3 border-t border-zinc-100 pt-2.5 dark:border-zinc-800">
                                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                                    Sélection rapide
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                    {[1, 2, 3, 4, 5, 6, 8, 10].map((count) => (
                                        <button
                                            key={count}
                                            type="button"
                                            onClick={() => {
                                                setGuests(count);
                                                setIsGuestsOpen(false);
                                            }}
                                            className={cn(
                                                'rounded-full px-2.5 py-1 text-xs font-medium transition',
                                                guests === count
                                                    ? 'bg-primary-500 font-semibold text-white'
                                                    : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700',
                                            )}
                                        >
                                            {count} pers.
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Actions bas */}
                            <div className="mt-3 flex items-center justify-between border-t border-zinc-100 pt-2.5 dark:border-zinc-800">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setGuests(null);
                                        setIsGuestsOpen(false);
                                    }}
                                    className="text-xs font-medium text-zinc-500 underline underline-offset-2 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
                                >
                                    Effacer
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsGuestsOpen(false)}
                                    className="rounded-xl bg-primary-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-primary-600"
                                >
                                    Appliquer
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* 5. Bouton Rechercher */}
                <Button
                    type="submit"
                    size="lg"
                    className="w-full rounded-2xl! bg-primary-500 px-6 hover:bg-primary-600 lg:w-auto lg:rounded-full!"
                >
                    <svg
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="size-4"
                        aria-hidden="true"
                    >
                        <path
                            fillRule="evenodd"
                            d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z"
                            clipRule="evenodd"
                        />
                    </svg>
                    Rechercher
                </Button>
            </form>
        );
    }

    // Variant "card" (grille de recherche classique pour catalogue)
    return (
        <form
            role="search"
            onSubmit={submit}
            className={cn(
                'relative z-10 grid gap-3 rounded-2xl bg-white p-3 text-zinc-900 shadow-lg ring-1 ring-zinc-200 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1.2fr_auto] lg:items-end dark:bg-zinc-900 dark:text-zinc-100 dark:ring-zinc-800',
                className,
            )}
        >
            {/* Destination */}
            <div
                ref={destContainerRef}
                className="relative flex flex-col gap-1 sm:col-span-2 lg:col-span-1"
            >
                <Label htmlFor={`${id}-destination`}>Destination</Label>
                <div className="relative">
                    <Input
                        id={`${id}-destination`}
                        name="destination"
                        placeholder="Où voulez-vous aller ?"
                        value={destination}
                        onChange={(e) => {
                            setDestination(e.target.value);
                            setIsDestOpen(true);
                        }}
                        onFocus={() => setIsDestOpen(true)}
                        autoComplete="off"
                    />
                    {destination && (
                        <button
                            type="button"
                            onClick={() => {
                                setDestination('');
                                setIsDestOpen(true);
                            }}
                            aria-label="Effacer la destination"
                            className="absolute top-1/2 right-3 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                        >
                            <svg
                                viewBox="0 0 20 20"
                                fill="currentColor"
                                className="size-4"
                                aria-hidden="true"
                            >
                                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                            </svg>
                        </button>
                    )}
                </div>

                {/* Popover Destinations : capture automatique au clic */}
                {isDestOpen && (
                    <div className="animate-in fade-in zoom-in-95 absolute top-full left-0 z-50 mt-1 w-full min-w-[280px] rounded-2xl bg-white p-2 text-zinc-900 shadow-2xl ring-1 ring-black/10 duration-150 dark:bg-zinc-900 dark:text-zinc-100 dark:ring-white/10">
                        <button
                            type="button"
                            onClick={() => {
                                setDestination('');
                                setIsDestOpen(false);
                            }}
                            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-zinc-700 hover:bg-primary-50 hover:text-primary-700 dark:text-zinc-200 dark:hover:bg-primary-950/40 dark:hover:text-primary-300"
                        >
                            <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={1.8}
                                className="size-4 shrink-0 text-primary-600 dark:text-primary-400"
                                aria-hidden="true"
                            >
                                <circle cx="12" cy="12" r="10" />
                                <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                                <path d="M2 12h20" />
                            </svg>
                            <span>Toutes les destinations</span>
                        </button>
                        <div className="mt-1 max-h-56 divide-y divide-zinc-100 overflow-y-auto overscroll-contain border-t border-zinc-100 pt-1 dark:divide-zinc-800 dark:border-zinc-800">
                            {filteredDestinations.length > 0 ? (
                                filteredDestinations.map((dest) => (
                                    <button
                                        key={dest}
                                        type="button"
                                        onClick={() => {
                                            setDestination(dest);
                                            setIsDestOpen(false);
                                        }}
                                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-zinc-800 hover:bg-primary-50 hover:text-primary-700 dark:text-zinc-200 dark:hover:bg-primary-950/40 dark:hover:text-primary-300"
                                    >
                                        <svg
                                            viewBox="0 0 20 20"
                                            fill="currentColor"
                                            className="size-4 shrink-0 text-secondary-600 dark:text-primary-400"
                                            aria-hidden="true"
                                        >
                                            <path
                                                fillRule="evenodd"
                                                d="m9.69 18.933.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 0 0 .281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 1 0 3 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 0 0 2.273 1.765 11.742 11.742 0 0 0 1.04 5.73l.018.008.006.003ZM10 11.25a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                        <span className="truncate">{dest}</span>
                                    </button>
                                ))
                            ) : (
                                <div className="p-3 text-center text-xs text-zinc-500">
                                    Aucune destination trouvée
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Arrivée */}
            <div className="flex flex-col gap-1">
                <Label htmlFor={`${id}-check-in`}>Arrivée</Label>
                <div className="relative">
                    <input
                        ref={checkInRef}
                        id={`${id}-check-in`}
                        name="check_in"
                        type="date"
                        min={today}
                        value={checkIn}
                        onChange={(e) => handleCheckInChange(e.target.value)}
                        className="block h-10 w-full cursor-pointer rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 shadow-xs transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0"
                    />
                </div>
            </div>

            {/* Départ */}
            <div className="flex flex-col gap-1">
                <Label htmlFor={`${id}-check-out`}>Départ</Label>
                <div className="relative">
                    <input
                        ref={checkOutRef}
                        id={`${id}-check-out`}
                        name="check_out"
                        type="date"
                        min={checkIn ? addDays(checkIn, 1) : addDays(today, 1)}
                        value={checkOut}
                        onChange={(e) => handleCheckOutChange(e.target.value)}
                        className="block h-10 w-full cursor-pointer rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 shadow-xs transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0"
                    />
                </div>
            </div>

            {/* Voyageurs */}
            <div
                ref={guestsContainerRef}
                className="relative flex flex-col gap-1"
            >
                <Label htmlFor={`${id}-guests-trigger`}>Voyageurs</Label>
                <input
                    type="hidden"
                    name="guests"
                    value={guests ? String(guests) : ''}
                />
                <button
                    id={`${id}-guests-trigger`}
                    type="button"
                    onClick={() => setIsGuestsOpen((prev) => !prev)}
                    className="flex h-10 w-full items-center justify-between rounded-xl border border-zinc-300 bg-white px-3 text-left text-sm font-medium text-zinc-800 transition hover:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                >
                    <span className="truncate">
                        {guests ? plural(guests, 'voyageur') : 'Tous voyageurs'}
                    </span>
                    <svg
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className={cn(
                            'size-4 shrink-0 text-zinc-400 transition-transform duration-200',
                            isGuestsOpen && 'rotate-180',
                        )}
                        aria-hidden="true"
                    >
                        <path
                            fillRule="evenodd"
                            d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
                            clipRule="evenodd"
                        />
                    </svg>
                </button>

                {/* Popover Voyageurs */}
                {isGuestsOpen && (
                    <div className="animate-in fade-in zoom-in-95 absolute top-full right-0 z-50 mt-1 w-72 rounded-2xl bg-white p-4 text-zinc-900 shadow-2xl ring-1 ring-black/10 duration-150 sm:w-80 dark:bg-zinc-900 dark:text-zinc-100 dark:ring-white/10">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <p className="text-sm font-semibold">
                                    Voyageurs
                                </p>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                    Adultes, enfants
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    disabled={!guests || guests <= 1}
                                    onClick={() =>
                                        setGuests((prev) =>
                                            prev && prev > 1 ? prev - 1 : null,
                                        )
                                    }
                                    className="flex size-8 items-center justify-center rounded-full border border-zinc-300 text-zinc-700 transition hover:border-zinc-400 disabled:opacity-30 dark:border-zinc-700 dark:text-zinc-200"
                                    aria-label="Diminuer"
                                >
                                    −
                                </button>
                                <span className="w-5 text-center text-sm font-semibold">
                                    {guests ?? 1}
                                </span>
                                <button
                                    type="button"
                                    disabled={(guests ?? 1) >= 16}
                                    onClick={() =>
                                        setGuests((prev) =>
                                            prev ? Math.min(16, prev + 1) : 2,
                                        )
                                    }
                                    className="flex size-8 items-center justify-center rounded-full border border-zinc-300 text-zinc-700 transition hover:border-zinc-400 disabled:opacity-30 dark:border-zinc-700 dark:text-zinc-200"
                                    aria-label="Augmenter"
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        {/* Sélections rapides */}
                        <div className="mt-4 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                            <p className="mb-2 text-xs font-medium text-zinc-400">
                                Sélection rapide
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                {[1, 2, 3, 4, 6, 8, 10].map((count) => (
                                    <button
                                        key={count}
                                        type="button"
                                        onClick={() => {
                                            setGuests(count);
                                            setIsGuestsOpen(false);
                                        }}
                                        className={cn(
                                            'rounded-full px-2.5 py-1 text-xs font-medium transition',
                                            guests === count
                                                ? 'bg-primary-500 font-semibold text-white'
                                                : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700',
                                        )}
                                    >
                                        {count} pers.
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-3 dark:border-zinc-800">
                            <button
                                type="button"
                                onClick={() => {
                                    setGuests(null);
                                    setIsGuestsOpen(false);
                                }}
                                className="text-xs font-medium text-zinc-500 underline underline-offset-2 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
                            >
                                Effacer
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsGuestsOpen(false)}
                                className="rounded-xl bg-primary-500 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-primary-600"
                            >
                                Appliquer
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <Button
                type="submit"
                size="md"
                className="sm:col-span-2 lg:col-span-1"
            >
                Rechercher
            </Button>
        </form>
    );
}
