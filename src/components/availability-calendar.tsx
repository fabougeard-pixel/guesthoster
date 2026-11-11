'use client';

import { useState } from 'react';
import {
    addDays,
    diffInDays,
    formatDate,
    parseDate,
    todayIso,
    toIsoDate,
} from '@/lib/format';
import { cn } from '@/lib/utils';
import type { DateRange } from '@/types';

export type StaySelection = { checkIn: string | null; checkOut: string | null };

const weekdays = ['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.'];

function isNightTaken(night: string, ranges: DateRange[]): boolean {
    return ranges.some((range) => range.start <= night && night < range.end);
}

function monthStart(iso: string): string {
    return `${iso.slice(0, 7)}-01`;
}

function addMonths(iso: string, months: number): string {
    const date = parseDate(iso);
    date.setUTCMonth(date.getUTCMonth() + months, 1);
    return toIsoDate(date);
}

function monthGrid(firstDay: string): (string | null)[] {
    const date = parseDate(firstDay);
    const offset = (date.getUTCDay() + 6) % 7;
    const daysInMonth = new Date(
        Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
    ).getUTCDate();

    return [
        ...Array.from({ length: offset }, () => null),
        ...Array.from({ length: daysInMonth }, (_, day) =>
            addDays(firstDay, day),
        ),
    ];
}

export function AvailabilityCalendar({
    unavailableRanges,
    value,
    onChange,
    minNights = 1,
    maxNights = null,
}: {
    unavailableRanges: DateRange[];
    value: StaySelection;
    onChange?: (value: StaySelection) => void;
    minNights?: number;
    maxNights?: number | null;
}) {
    const today = todayIso();
    const [firstMonth, setFirstMonth] = useState(
        monthStart(value.checkIn ?? today),
    );
    const selecting = value.checkIn !== null && value.checkOut === null;

    function canCheckOut(day: string): boolean {
        if (value.checkIn === null || day <= value.checkIn) {
            return false;
        }

        const nights = diffInDays(value.checkIn, day);
        if (nights < minNights || (maxNights !== null && nights > maxNights)) {
            return false;
        }

        for (
            let night = value.checkIn;
            night < day;
            night = addDays(night, 1)
        ) {
            if (isNightTaken(night, unavailableRanges)) {
                return false;
            }
        }

        return true;
    }

    function dayState(day: string) {
        const past = day < today;
        const taken = isNightTaken(day, unavailableRanges);
        const isCheckIn = day === value.checkIn;
        const isCheckOut = day === value.checkOut;
        const inRange =
            value.checkIn !== null &&
            value.checkOut !== null &&
            day > value.checkIn &&
            day < value.checkOut;
        const selectable = onChange
            ? !past && (selecting ? canCheckOut(day) || !taken : !taken)
            : false;

        return { past, taken, isCheckIn, isCheckOut, inRange, selectable };
    }

    function select(day: string) {
        if (!onChange) {
            return;
        }

        if (selecting && canCheckOut(day)) {
            onChange({ checkIn: value.checkIn, checkOut: day });
        } else {
            onChange({ checkIn: day, checkOut: null });
        }
    }

    const canGoBack = firstMonth > monthStart(today);

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <button
                    type="button"
                    onClick={() => setFirstMonth(addMonths(firstMonth, -1))}
                    disabled={!canGoBack}
                    className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 disabled:opacity-30 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    aria-label="Mois précédent"
                >
                    <svg
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="size-5"
                        aria-hidden="true"
                    >
                        <path
                            fillRule="evenodd"
                            d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z"
                            clipRule="evenodd"
                        />
                    </svg>
                </button>
                <button
                    type="button"
                    onClick={() => setFirstMonth(addMonths(firstMonth, 1))}
                    className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    aria-label="Mois suivant"
                >
                    <svg
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="size-5"
                        aria-hidden="true"
                    >
                        <path
                            fillRule="evenodd"
                            d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z"
                            clipRule="evenodd"
                        />
                    </svg>
                </button>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
                {[firstMonth, addMonths(firstMonth, 1)].map(
                    (month, monthIndex) => (
                        <div
                            key={month}
                            className={cn(
                                monthIndex === 1 && 'hidden sm:block',
                            )}
                        >
                            <p className="mb-2 text-center text-sm font-semibold capitalize">
                                {formatDate(month, {
                                    month: 'long',
                                    year: 'numeric',
                                })}
                            </p>
                            <div className="grid grid-cols-7 text-center text-xs text-zinc-500 dark:text-zinc-400">
                                {weekdays.map((weekday) => (
                                    <span key={weekday} className="py-1">
                                        {weekday}
                                    </span>
                                ))}
                            </div>
                            <div className="grid grid-cols-7 gap-y-1">
                                {monthGrid(month).map((day, cell) => {
                                    if (day === null) {
                                        return <span key={`empty-${cell}`} />;
                                    }

                                    const state = dayState(day);
                                    const unavailable =
                                        state.past ||
                                        (state.taken && !state.selectable);

                                    return (
                                        <button
                                            key={day}
                                            type="button"
                                            disabled={!state.selectable}
                                            onClick={() => select(day)}
                                            aria-pressed={
                                                state.isCheckIn ||
                                                state.isCheckOut
                                            }
                                            aria-label={`${formatDate(day, { weekday: 'long', day: 'numeric', month: 'long' })}${unavailable ? ', indisponible' : ''}${state.isCheckIn ? ', arrivée' : ''}${state.isCheckOut ? ', départ' : ''}`}
                                            className={cn(
                                                'mx-auto flex size-9 items-center justify-center rounded-full text-sm transition-colors',
                                                state.selectable &&
                                                    'hover:bg-primary-50 dark:hover:bg-primary-950',
                                                unavailable &&
                                                    'text-zinc-300 line-through dark:text-zinc-600',
                                                !onChange &&
                                                    !unavailable &&
                                                    'text-zinc-700 dark:text-zinc-300',
                                                state.inRange &&
                                                    'rounded-none bg-primary-50 text-primary-800 dark:bg-primary-950 dark:text-primary-200',
                                                (state.isCheckIn ||
                                                    state.isCheckOut) &&
                                                    'bg-primary-600 font-semibold text-white hover:bg-primary-700',
                                            )}
                                        >
                                            {parseDate(day).getUTCDate()}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ),
                )}
            </div>
        </div>
    );
}

