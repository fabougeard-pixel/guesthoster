'use client';

import Link from 'next/link';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Alert, Field, Input, Select, Textarea } from '@/components/form';
import type { PriceLines } from '@/components/price-breakdown';
import { PriceBreakdown } from '@/components/price-breakdown';
import { useActionFeedback } from '@/components/use-action-feedback';
import { createBookingAction } from '@/lib/actions/bookings';
import type { FieldErrors } from '@/lib/actions/types';
import { formatDate, plural } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { PropertyCard, User } from '@/types';

export function BookingCreateClient({
    currentUser,
    property,
    stay,
    quote,
    isAvailable,
    paymentDelay,
    responseDelay,
    refundPolicy,
}: {
    currentUser: User | null;
    property: PropertyCard & {
        is_owner: boolean;
        min_nights: number;
        max_nights: number | null;
    };
    stay: { check_in: string; check_out: string; guests: number };
    quote: PriceLines;
    isAvailable: boolean;
    paymentDelay: string;
    responseDelay: number;
    refundPolicy: string;
}) {
    const { applyResult } = useActionFeedback();
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<FieldErrors>({});
    const [guestCount, setGuestCount] = useState(stay.guests);
    const [paymentMethod, setPaymentMethod] = useState<
        'card' | 'paypal' | 'bank_transfer'
    >('card');

    const isLongTerm = property.rental_duration === 'long_term';
    const nights = quote.nights ?? 0;

    const backToListing = isLongTerm
        ? `/logements/${property.slug}?check_in=${encodeURIComponent(stay.check_in)}&guests=${guestCount}`
        : `/logements/${property.slug}?check_in=${encodeURIComponent(stay.check_in)}&check_out=${encodeURIComponent(stay.check_out)}&guests=${guestCount}`;

    const blocker = property.is_owner
        ? 'Vous ne pouvez pas réserver votre propre logement.'
        : !isAvailable
          ? isLongTerm
              ? 'Ce logement n’est plus disponible à cette date d’entrée.'
              : 'Ces dates ne sont plus disponibles. Choisissez-en d’autres sur la page du logement.'
          : !isLongTerm && nights < property.min_nights
            ? `Ce logement se réserve pour ${plural(property.min_nights, 'nuit')} minimum.`
            : !isLongTerm &&
                property.max_nights !== null &&
                nights > property.max_nights
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
                check_out: isLongTerm ? null : stay.check_out,
                guests: guestCount,
                special_requests: String(fd.get('special_requests') ?? ''),
                guest_name: fd.get('guest_name')
                    ? String(fd.get('guest_name'))
                    : undefined,
                guest_email: fd.get('guest_email')
                    ? String(fd.get('guest_email'))
                    : undefined,
                guest_password: fd.get('guest_password')
                    ? String(fd.get('guest_password'))
                    : undefined,
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
                            ? isLongTerm
                                ? 'Confirmer la location et payer en ligne'
                                : 'Confirmer et réserver'
                            : isLongTerm
                              ? 'Demander cette location longue durée'
                              : 'Demander à réserver'}
                    </h1>
                </div>

                {blocker && <Alert tone="warning">{blocker}</Alert>}

                <section className="flex flex-col gap-3">
                    <h2 className="text-lg font-semibold">
                        {isLongTerm ? 'Votre location' : 'Votre séjour'}
                    </h2>
                    {isLongTerm ? (
                        <dl className="grid gap-4 sm:grid-cols-3">
                            <div>
                                <dt className="text-sm text-zinc-500 dark:text-zinc-400">
                                    Entrée souhaitée
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
                                    Loyer d’avance
                                </dt>
                                <dd className="font-medium">
                                    {quote.advance_rent_months ?? 1} mois
                                </dd>
                            </div>
                            <div>
                                <dt className="text-sm text-zinc-500 dark:text-zinc-400">
                                    Charges
                                </dt>
                                <dd className="font-medium">
                                    {quote.charges_included
                                        ? 'Comprises'
                                        : 'Hors charges'}
                                </dd>
                            </div>
                        </dl>
                    ) : (
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
                                    {plural(nights, 'nuit')}
                                </dd>
                            </div>
                        </dl>
                    )}
                </section>

                <form
                    onSubmit={(event) => void submit(event)}
                    className="flex flex-col gap-6"
                >
                    {/* Sélecteur de voyageurs / occupants */}
                    <Field
                        label={isLongTerm ? 'Occupants' : 'Voyageurs'}
                        htmlFor="guests"
                        error={errors.guests}
                        className="max-w-xs"
                    >
                        <Select
                            id="guests"
                            name="guests"
                            value={guestCount}
                            onChange={(e) =>
                                setGuestCount(Number(e.target.value))
                            }
                        >
                            {Array.from(
                                { length: property.max_guests },
                                (_, count) => (
                                    <option key={count + 1} value={count + 1}>
                                        {plural(
                                            count + 1,
                                            isLongTerm ? 'occupant' : 'voyageur',
                                        )}
                                    </option>
                                ),
                            )}
                        </Select>
                    </Field>

                    {currentUser ? (
                        <div className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4.5 dark:border-zinc-800 dark:bg-zinc-900/50">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                                    Réservation au nom de
                                </p>
                                <p className="mt-0.5 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                                    {currentUser.name}
                                </p>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                    {currentUser.email}
                                </p>
                            </div>
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                                <span className="size-1.5 rounded-full bg-emerald-500" />
                                Compte connecté
                            </span>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
                            <div className="flex flex-col gap-1">
                                <Link
                                    href={`/login?redirectTo=${encodeURIComponent(
                                        isLongTerm
                                            ? `/logements/${property.slug}/reserver?check_in=${stay.check_in}&guests=${guestCount}`
                                            : `/logements/${property.slug}/reserver?check_in=${stay.check_in}&check_out=${stay.check_out}&guests=${guestCount}`,
                                    )}`}
                                    className="text-xs font-semibold text-primary-600 hover:underline dark:text-primary-400"
                                >
                                    Déjà un compte ? Se connecter
                                </Link>
                                <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                                    Vos coordonnées & Compte client
                                </h3>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                    Votre compte sera créé pour suivre votre réservation et recevoir vos accès.
                                </p>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <Field
                                    label="Nom complet"
                                    htmlFor="guest_name"
                                    error={errors.guest_name}
                                    hint="Prénom et Nom"
                                >
                                    <Input
                                        id="guest_name"
                                        name="guest_name"
                                        required
                                        placeholder="Ex : Jean Dupont"
                                        autoComplete="name"
                                    />
                                </Field>

                                <Field
                                    label="Adresse e-mail"
                                    htmlFor="guest_email"
                                    error={errors.guest_email}
                                    hint="Pour vos confirmations et factures"
                                >
                                    <Input
                                        id="guest_email"
                                        name="guest_email"
                                        type="email"
                                        required
                                        placeholder="jean.dupont@example.com"
                                        autoComplete="email"
                                    />
                                </Field>
                            </div>

                            <Field
                                label="Mot de passe du compte"
                                htmlFor="guest_password"
                                error={errors.guest_password}
                                hint="8 caractères minimum. Vous permettra de vous reconnecter à votre espace voyageur."
                            >
                                <Input
                                    id="guest_password"
                                    name="guest_password"
                                    type="password"
                                    required
                                    minLength={8}
                                    placeholder="••••••••"
                                    autoComplete="new-password"
                                />
                            </Field>
                        </div>
                    )}

                    <Field
                        label={
                            isLongTerm
                                ? 'Notes et présentation pour votre location (facultatif)'
                                : 'Notes et demandes particulières pour votre séjour (facultatif)'
                        }
                        htmlFor="special_requests"
                        error={errors.special_requests}
                        hint={
                            isLongTerm
                                ? 'Précisez votre situation, date d’emménagement souhaitée, garants, ou toute question relative au bail.'
                                : 'Précisez vos souhaits particuliers : par exemple chaise bébé, lit parapluie, heure prévisionnelle d’arrivée ou toute demande spécifique.'
                        }
                    >
                        <Textarea
                            id="special_requests"
                            name="special_requests"
                            rows={4}
                            maxLength={1000}
                            placeholder={
                                isLongTerm
                                    ? 'Ex : Bonjour, nous recherchons un logement pour un contrat de 12 mois à partir du 1er du mois prochain...'
                                    : 'Ex : Bonjour, nous voyagerons avec un jeune enfant et souhaiterions savoir s’il est possible d’avoir une chaise bébé à disposition...'
                            }
                        />
                    </Field>

                    {/* Sélection du mode de paiement */}
                    <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
                        <div>
                            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                                Mode de paiement
                            </h3>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                Choisissez votre moyen de règlement préféré. Le paiement est 100 % sécurisé.
                            </p>
                        </div>

                        <div className="flex flex-col gap-3">
                            {/* Carte bancaire */}
                            <label
                                className={cn(
                                    'flex cursor-pointer items-start gap-3.5 rounded-2xl border p-4.5 transition',
                                    paymentMethod === 'card'
                                        ? 'border-2 border-primary-500 bg-primary-50/15 shadow-2xs dark:border-primary-500 dark:bg-primary-950/20'
                                        : 'border border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700',
                                )}
                            >
                                <input
                                    type="radio"
                                    name="payment_method"
                                    value="card"
                                    checked={paymentMethod === 'card'}
                                    onChange={() => setPaymentMethod('card')}
                                    className="mt-0.5 size-4 text-primary-600 focus:ring-primary-500"
                                />
                                <div className="flex flex-col">
                                    <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                        Carte bancaire
                                    </span>
                                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                        Visa, Mastercard, CB, Apple Pay via Stripe.
                                    </span>
                                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                        Confirmation instantanée.
                                    </span>
                                </div>
                            </label>

                            {/* PayPal */}
                            <label
                                className={cn(
                                    'flex cursor-pointer items-start gap-3.5 rounded-2xl border p-4.5 transition',
                                    paymentMethod === 'paypal'
                                        ? 'border-2 border-primary-500 bg-primary-50/15 shadow-2xs dark:border-primary-500 dark:bg-primary-950/20'
                                        : 'border border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700',
                                )}
                            >
                                <input
                                    type="radio"
                                    name="payment_method"
                                    value="paypal"
                                    checked={paymentMethod === 'paypal'}
                                    onChange={() => setPaymentMethod('paypal')}
                                    className="mt-0.5 size-4 text-primary-600 focus:ring-primary-500"
                                />
                                <div className="flex flex-col">
                                    <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                        PayPal
                                    </span>
                                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                        Compte PayPal ou paiement en 4x sans frais.
                                    </span>
                                </div>
                            </label>

                            {/* Virement bancaire */}
                            <label
                                className={cn(
                                    'flex cursor-pointer items-start gap-3.5 rounded-2xl border p-4.5 transition',
                                    paymentMethod === 'bank_transfer'
                                        ? 'border-2 border-primary-500 bg-primary-50/15 shadow-2xs dark:border-primary-500 dark:bg-primary-950/20'
                                        : 'border border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700',
                                )}
                            >
                                <input
                                    type="radio"
                                    name="payment_method"
                                    value="bank_transfer"
                                    checked={paymentMethod === 'bank_transfer'}
                                    onChange={() =>
                                        setPaymentMethod('bank_transfer')
                                    }
                                    className="mt-0.5 size-4 text-primary-600 focus:ring-primary-500"
                                />
                                <div className="flex flex-col">
                                    <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                        Virement bancaire
                                    </span>
                                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                        Virement SEPA direct. Coordonnées IBAN fournies immédiatement.
                                    </span>
                                </div>
                            </label>
                        </div>
                    </div>

                    {(errors.check_in || errors.check_out) && (
                        <Alert tone="warning">
                            {errors.check_in ?? errors.check_out}
                        </Alert>
                    )}

                    <div className="flex flex-col gap-2 rounded-xl bg-zinc-50 p-4 text-sm text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
                        {property.is_instant ? (
                            <p>
                                {isLongTerm
                                    ? `Le logement est bloqué dès maintenant. Vous disposerez de ${paymentDelay} pour régler en ligne (${quote.advance_rent_months ?? 1} mois de loyer + caution).`
                                    : `Vos dates sont bloquées dès maintenant. Vous disposerez de ${paymentDelay} pour régler le séjour, sans quoi la réservation expirera.`}
                            </p>
                        ) : (
                            <p>
                                {isLongTerm
                                    ? `Le propriétaire a ${responseDelay} heures pour valider votre demande. Rien n’est débité avant son accord ; vous aurez ensuite ${paymentDelay} pour payer en ligne.`
                                    : `L’hôte a ${responseDelay} heures pour répondre. Rien n’est débité avant son accord ; vous aurez ensuite ${paymentDelay} pour payer.`}
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

