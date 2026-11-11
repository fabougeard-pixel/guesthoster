import { Form, Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import type { StaySelection } from '@/components/availability-calendar';
import { AvailabilityCalendar } from '@/components/availability-calendar';
import { Button, buttonClasses } from '@/components/button';
import { Card } from '@/components/card';
import { Field, Input } from '@/components/form';
import { addDays, formatDate, plural, diffInDays } from '@/lib/format';
import { edit } from '@/routes/host/properties';
import { destroy, store } from '@/routes/host/properties/blocked-periods';

type Props = {
    property: { slug: string; title: string; status: string };
    bookings: {
        reference: string;
        start: string;
        end: string;
        status_label: string;
    }[];
    blockedPeriods: {
        id: number;
        start: string;
        end: string;
        reason: string | null;
    }[];
};

function rangeLabel(start: string, end: string) {
    return `du ${formatDate(start)} au ${formatDate(addDays(end, -1))} (${plural(diffInDays(start, end), 'nuit')})`;
}

export default function PropertyCalendar({
    property,
    bookings,
    blockedPeriods,
}: Props) {
    const [selection, setSelection] = useState<StaySelection>({
        checkIn: null,
        checkOut: null,
    });
    const ranges = [...bookings, ...blockedPeriods];
    const hasSelection =
        selection.checkIn !== null && selection.checkOut !== null;

    return (
        <>
            <Head title={`Calendrier · ${property.title}`} />
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold">Calendrier</h1>
                    <p className="text-zinc-600 dark:text-zinc-400">
                        {property.title}
                    </p>
                </div>
                <Link
                    href={edit({ property: property.slug })}
                    className={buttonClasses({
                        variant: 'outline',
                        size: 'sm',
                    })}
                >
                    Modifier le logement
                </Link>
            </div>

            <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_22rem]">
                <Card className="p-6">
                    <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
                        Sélectionnez le premier jour fermé puis le jour où le
                        logement redevient disponible. Les nuits barrées sont
                        déjà réservées ou bloquées.
                    </p>
                    <AvailabilityCalendar
                        unavailableRanges={ranges}
                        value={selection}
                        onChange={setSelection}
                    />

                    {hasSelection && (
                        <Form
                            {...store.form(property.slug)}
                            transform={(data) => ({
                                ...data,
                                starts_on: selection.checkIn,
                                ends_on: selection.checkOut,
                            })}
                            options={{ preserveScroll: true }}
                            onSuccess={() =>
                                setSelection({ checkIn: null, checkOut: null })
                            }
                            className="mt-6 flex flex-col gap-4 border-t border-zinc-200 pt-6 sm:flex-row sm:items-end dark:border-zinc-800"
                        >
                            {({ errors, processing }) => (
                                <>
                                    <Field
                                        label={`Bloquer ${rangeLabel(selection.checkIn ?? '', selection.checkOut ?? '')}`}
                                        htmlFor="reason"
                                        error={
                                            errors.reason ??
                                            errors.starts_on ??
                                            errors.ends_on
                                        }
                                        className="flex-1"
                                    >
                                        <Input
                                            id="reason"
                                            name="reason"
                                            placeholder="Motif (facultatif), ex. travaux"
                                            maxLength={100}
                                        />
                                    </Field>
                                    <Button type="submit" loading={processing}>
                                        Bloquer ces dates
                                    </Button>
                                </>
                            )}
                        </Form>
                    )}
                </Card>

                <div className="flex flex-col gap-6">
                    <section>
                        <h2 className="font-semibold">Dates bloquées</h2>
                        {blockedPeriods.length === 0 ? (
                            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                                Aucune date bloquée.
                            </p>
                        ) : (
                            <ul className="mt-3 flex flex-col gap-2">
                                {blockedPeriods.map((period) => (
                                    <li
                                        key={period.id}
                                        className="flex items-start justify-between gap-3 rounded-xl border border-zinc-200 p-3 text-sm dark:border-zinc-800"
                                    >
                                        <span>
                                            <span className="block capitalize">
                                                {rangeLabel(
                                                    period.start,
                                                    period.end,
                                                )}
                                            </span>
                                            {period.reason && (
                                                <span className="text-zinc-500 dark:text-zinc-400">
                                                    {period.reason}
                                                </span>
                                            )}
                                        </span>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() =>
                                                router.delete(
                                                    destroy.url({
                                                        property: property.slug,
                                                        blockedPeriod:
                                                            period.id,
                                                    }),
                                                    { preserveScroll: true },
                                                )
                                            }
                                        >
                                            Débloquer
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                    <section>
                        <h2 className="font-semibold">Séjours réservés</h2>
                        {bookings.length === 0 ? (
                            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                                Aucun séjour à venir.
                            </p>
                        ) : (
                            <ul className="mt-3 flex flex-col gap-2">
                                {bookings.map((booking) => (
                                    <li
                                        key={booking.reference}
                                        className="rounded-xl border border-zinc-200 p-3 text-sm dark:border-zinc-800"
                                    >
                                        <span className="block capitalize">
                                            {rangeLabel(
                                                booking.start,
                                                booking.end,
                                            )}
                                        </span>
                                        <span className="text-zinc-500 dark:text-zinc-400">
                                            {booking.reference} ·{' '}
                                            {booking.status_label}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                </div>
            </div>
        </>
    );
}
