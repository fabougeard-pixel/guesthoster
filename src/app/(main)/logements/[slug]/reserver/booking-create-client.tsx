'use client';

import Link from 'next/link';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Alert, Field, Select, Textarea } from '@/components/form';
import type { PriceLines } from '@/components/price-breakdown';
import { PriceBreakdown } from '@/components/price-breakdown';
import { useActionFeedback } from '@/components/use-action-feedback';
import { createBookingAction } from '@/lib/actions/bookings';
import type { FieldErrors } from '@/lib/actions/types';
import { formatDate, plural } from '@/lib/format';
import type { PropertyCard } from '@/types';

export function BookingCreateClient({
    property,
    stay,
    quote,
    isAvailable,
    paymentDelay,
    responseDelay,
    refundPolicy,
}: {
    property: PropertyCard & {
        is_owner: boolean;
        min_nights: number;
        max_nights: number | null;
    };
    stay: { check_in: string; check_out: string; guests: number };
    quote: PriceLines & { lodging_total: number };
    isAvailable: boolean;
    paymentDelay: string;
    responseDelay: number;
    refundPolicy: string;
}) {
    const { applyResult } = useActionFeedback();
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<FieldErrors>({});

    const backToListing = `/logements/${property.slug}?check_in=${encodeURIComponent(stay.check_in)}&check_out=${encodeURIComponent(stay.check_out)}&guests=${stay.guests}`;

    const blocker = property.is_owner
        ? 'Vous ne pouvez pas réserver votre propre logement.'
        : !isAvailable
          ? 'Ces dates ne sont plus disponibles. Choisissez-en d’autres sur la page du logement.'
          : quote.nights < property.min_nights
            ? `Ce logement se réserve pour ${plural(property.min_nights, 'nuit')} minimum.`
            : property.max_nights !== null && quote.nights > property.max_nights
              ? `Ce logement se réserve pour ${plural(property.max_nights, 'nuit')} maximum.`
              : null;

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setLoading(true);
        setErrors({});
        const fd = new FormData(event.currentTarget);

        try {
            const res = await createBookingAction({
                propertySlug: property.slug,
                check_in: stay.check_in,
                check_out: stay.check_out,
                guests: Number(fd.get('guests') ?? stay.guests),
                special_requests: String(fd.get('special_requests') ?? ''),
            });
            applyResult(res, { setFieldErrors: setErrors });
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="mx-auto grid max-w-5xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_22rem] lg:px-8">
            <div className="flex flex-col gap-8">
                <div>
                    <Link
                        href={backToListing}
                        className="text-sm font-medium text-zinc-600 hover:underline dark:text-zinc-400"
                    >
                        ← Retour au logement
                    </Link>
                    <h1 className="mt-3 text-2xl font-semibold">
                        {property.is_instant
                            ? 'Confirmer et réserver'
                            : 'Demander à réserver'}
                    </h1>
                </div>

                {blocker && <Alert tone="warning">{blocker}</Alert>}

                <section className="flex flex-col gap-3">
                    <h2 className="text-lg font-semibold">Votre séjour</h2>
                    <dl className="grid gap-4 sm:grid-cols-3">
                        <div>
                            <dt className="text-sm text-zinc-500 dark:text-zinc-400">
                                Arrivée
                            </dt>
                            <dd className="font-medium">
                                {formatDate(stay.check_in, {
                                    weekday: 'short',
                                    day: 'numeric',
                                    month: 'long',
                                })}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-sm text-zinc-500 dark:text-zinc-400">
                                Départ
                            </dt>
                            <dd className="font-medium">
                                {formatDate(stay.check_out, {
                                    weekday: 'short',
                                    day: 'numeric',
                                    month: 'long',
                                })}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-sm text-zinc-500 dark:text-zinc-400">
                                Durée
                            </dt>
                            <dd className="font-medium">
                                {plural(quote.nights, 'nuit')}
                            </dd>
                        </div>
                    </dl>
                </section>

                <form
                    onSubmit={(event) => void submit(event)}
                    className="flex flex-col gap-6"
                >
                    <Field
                        label="Voyageurs"
                        htmlFor="guests"
                        error={errors.guests}
                        className="max-w-xs"
                    >
                        <Select
                            id="guests"
                            name="guests"
                            defaultValue={stay.guests}
                        >
                            {Array.from(
                                { length: property.max_guests },
                                (_, count) => (
                                    <option key={count + 1} value={count + 1}>
                                        {plural(count + 1, 'voyageur')}
                                    </option>
                                ),
                            )}
                        </Select>
                    </Field>
                    <Field
                        label="Message à l’hôte (facultatif)"
                        htmlFor="special_requests"
                        error={errors.special_requests}
                        hint="Présentez-vous, précisez l’objet du voyage ou votre heure d’arrivée."
                    >
                        <Textarea
                            id="special_requests"
                            name="special_requests"
                            rows={4}
                            maxLength={1000}
                        />
                    </Field>

                    {(errors.check_in || errors.check_out) && (
                        <Alert tone="warning">
                            {errors.check_in ?? errors.check_out}
                        </Alert>
                    )}

                    <div className="flex flex-col gap-2 rounded-xl bg-zinc-50 p-4 text-sm text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
                        {property.is_instant ? (
                            <p>
                                Vos dates sont bloquées dès maintenant. Vous
                                disposerez de {paymentDelay} pour régler le
                                séjour, sans quoi la réservation expirera.
                            </p>
                        ) : (
                            <p>
                                L’hôte a {responseDelay} heures pour répondre.
                                Rien n’est débité avant son accord ; vous aurez
                                ensuite {paymentDelay} pour payer.
                            </p>
                        )}
                        <p>{refundPolicy}</p>
                    </div>

                    <Button
                        type="submit"
                        size="lg"
                        loading={loading}
                        disabled={blocker !== null}
                        className="self-start"
                    >
                        {property.is_instant
                            ? 'Réserver'
                            : 'Envoyer la demande'}
                    </Button>
                </form>
            </div>

            <aside>
                <Card className="flex flex-col gap-4 p-5 lg:sticky lg:top-24">
                    <div className="flex gap-3">
                        <div className="size-20 shrink-0 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
                            {property.cover_url && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={property.cover_url}
                                    alt=""
                                    className="size-full object-cover"
                                />
                            )}
                        </div>
                        <div>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                {property.type}
                            </p>
                            <p className="font-medium">{property.title}</p>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                {property.city}, {property.country}
                            </p>
                        </div>
                    </div>
                    <PriceBreakdown
                        price={quote}
                        className="border-t border-zinc-200 pt-4 dark:border-zinc-800"
                    />
                </Card>
            </aside>
        </div>
    );
}

