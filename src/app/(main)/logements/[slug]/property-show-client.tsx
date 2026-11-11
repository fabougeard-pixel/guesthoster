'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { StaySelection } from '@/components/availability-calendar';
import { AvailabilityCalendar } from '@/components/availability-calendar';
import { Button, buttonClasses } from '@/components/button';
import { Badge, Card, Container } from '@/components/card';
import { FavoriteButton } from '@/components/favorite-button';
import { Alert, Label } from '@/components/form';
import { Modal } from '@/components/modal';
import { PriceBreakdown } from '@/components/price-breakdown';
import { ReviewCard } from '@/components/review-card';
import { RatingSummary } from '@/components/star-rating';
import { quoteLongTermUpfront } from '@/lib/domain/pricing';
import { diffInDays, formatDate, formatPrice, plural } from '@/lib/format';
import type { DateRange, PropertyDetail, Review } from '@/types';

function Gallery({ property }: { property: PropertyDetail }) {
    const [open, setOpen] = useState(false);
    const [cover, ...others] = property.images;

    if (!cover) {
        return (
            <div className="flex aspect-video items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400 dark:bg-zinc-800">
                Pas encore de photo
            </div>
        );
    }

    return (
        <>
            <div className="relative grid gap-2 overflow-hidden rounded-2xl sm:grid-cols-4 sm:grid-rows-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={cover.url}
                    alt={cover.alt}
                    className="aspect-4/3 size-full object-cover sm:col-span-2 sm:row-span-2 sm:aspect-auto"
                />
                {others.slice(0, 4).map((image) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        key={image.id}
                        src={image.url}
                        alt={image.alt}
                        loading="lazy"
                        className="hidden aspect-4/3 size-full object-cover sm:block"
                    />
                ))}
                {property.images.length > 1 && (
                    <Button
                        variant="outline"
                        size="sm"
                        className="absolute right-3 bottom-3 shadow"
                        onClick={() => setOpen(true)}
                    >
                        Voir les {property.images.length} photos
                    </Button>
                )}
            </div>
            <Modal
                open={open}
                onClose={() => setOpen(false)}
                title={`Photos · ${property.title}`}
                className="max-w-4xl"
            >
                <div className="flex max-h-[75vh] flex-col gap-4 overflow-y-auto">
                    {property.images.map((image) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            key={image.id}
                            src={image.url}
                            alt={image.alt}
                            loading="lazy"
                            className="w-full rounded-xl"
                        />
                    ))}
                </div>
            </Modal>
        </>
    );
}

function BookingCard({
    property,
    stay,
    guests,
    unavailableRanges,
    onGuestsChange,
    onMoveInChange,
    onClear,
    serviceFeeRate,
}: {
    serviceFeeRate: number;
    property: PropertyDetail;
    stay: StaySelection;
    guests: number;
    unavailableRanges: DateRange[];
    onGuestsChange: (guests: number) => void;
    onMoveInChange: (checkIn: string) => void;
    onClear: () => void;
}) {
    if (property.rental_duration === 'long_term') {
        const quote = quoteLongTermUpfront({
            monthlyRent: property.monthly_rent,
            securityDeposit: property.security_deposit,
            monthlyCharges: property.monthly_charges,
            chargesIncluded: property.charges_included,
            advanceRentMonths: property.advance_rent_months,
        });
        const isMoveInUnavailable = Boolean(
            stay.checkIn &&
                unavailableRanges.some(
                    (range) =>
                        stay.checkIn! >= range.start &&
                        stay.checkIn! < range.end,
                ),
        );
        const reserveHref = stay.checkIn
            ? `/logements/${property.slug}/reserver?check_in=${encodeURIComponent(stay.checkIn)}&guests=${guests}`
            : '#';

        return (
            <Card className="flex flex-col gap-5 p-6 lg:sticky lg:top-24">
                <div className="flex flex-col gap-1">
                    <p>
                        <span className="text-2xl font-semibold">
                            {formatPrice(property.monthly_rent)}
                        </span>{' '}
                        <span className="text-zinc-500 dark:text-zinc-400">
                            / mois
                        </span>
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {property.charges_included
                            ? 'Charges comprises'
                            : property.monthly_charges > 0
                              ? `Hors charges (+${formatPrice(property.monthly_charges)} / mois)`
                              : 'Hors charges'}
                    </p>
                </div>

                <div className="flex flex-col gap-1">
                    <Label htmlFor="move-in-date">
                        Date d’entrée souhaitée
                    </Label>
                    <input
                        id="move-in-date"
                        type="date"
                        value={stay.checkIn ?? ''}
                        onChange={(event) => onMoveInChange(event.target.value)}
                        className="h-10 rounded-lg border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                    />
                    {isMoveInUnavailable && (
                        <p className="text-xs text-red-600 dark:text-red-400">
                            Ce logement est indisponible à cette date.
                        </p>
                    )}
                </div>

                <div className="flex flex-col gap-1">
                    <Label htmlFor="guests">Occupants</Label>
                    <select
                        id="guests"
                        value={guests}
                        onChange={(event) =>
                            onGuestsChange(Number(event.target.value))
                        }
                        className="h-10 rounded-lg border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                    >
                        {Array.from(
                            { length: property.max_guests },
                            (_, count) => (
                                <option key={count + 1} value={count + 1}>
                                    {plural(count + 1, 'occupant')}
                                </option>
                            ),
                        )}
                    </select>
                </div>

                <PriceBreakdown
                    price={{ ...quote, rental_duration: 'long_term' }}
                    totalLabel="Total à payer à l’entrée"
                    className="border-t border-zinc-200 pt-4 dark:border-zinc-800"
                />

                {stay.checkIn && !isMoveInUnavailable ? (
                    <Link
                        href={reserveHref}
                        className={buttonClasses({ size: 'lg' })}
                    >
                        {property.is_instant
                            ? 'Réserver et payer en ligne'
                            : 'Demander cette location'}
                    </Link>
                ) : (
                    <Button size="lg" disabled>
                        {isMoveInUnavailable
                            ? 'Date indisponible'
                            : 'Choisissez une date d’entrée'}
                    </Button>
                )}
                <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
                    {property.is_instant
                        ? 'Paiement sécurisé en ligne, confirmation immédiate.'
                        : 'Le propriétaire valide votre dossier avant le paiement en ligne.'}
                </p>
                {stay.checkIn && (
                    <button
                        type="button"
                        onClick={onClear}
                        className="text-sm font-medium text-zinc-600 underline underline-offset-4 dark:text-zinc-300"
                    >
                        Effacer la date
                    </button>
                )}
            </Card>
        );
    }

    const nights =
        stay.checkIn && stay.checkOut
            ? diffInDays(stay.checkIn, stay.checkOut)
            : 0;
    const subtotal = nights * property.price_per_night + property.cleaning_fee;
    const serviceFee = Math.round(subtotal * serviceFeeRate);

    const reserveHref =
        stay.checkIn && stay.checkOut
            ? `/logements/${property.slug}/reserver?check_in=${encodeURIComponent(stay.checkIn)}&check_out=${encodeURIComponent(stay.checkOut)}&guests=${guests}`
            : '#';

    return (
        <Card className="flex flex-col gap-5 p-6 lg:sticky lg:top-24">
            <p>
                <span className="text-2xl font-semibold">
                    {formatPrice(property.price_per_night)}
                </span>{' '}
                <span className="text-zinc-500 dark:text-zinc-400">/ nuit</span>
            </p>

            <dl className="grid grid-cols-2 overflow-hidden rounded-xl border border-zinc-300 text-sm dark:border-zinc-700">
                <div className="border-r border-zinc-300 p-3 dark:border-zinc-700">
                    <dt className="text-xs font-semibold uppercase">Arrivée</dt>
                    <dd>
                        {stay.checkIn
                            ? formatDate(stay.checkIn)
                            : 'Choisir une date'}
                    </dd>
                </div>
                <div className="p-3">
                    <dt className="text-xs font-semibold uppercase">Départ</dt>
                    <dd>
                        {stay.checkOut
                            ? formatDate(stay.checkOut)
                            : 'Choisir une date'}
                    </dd>
                </div>
            </dl>

            <div className="flex flex-col gap-1">
                <Label htmlFor="guests">Voyageurs</Label>
                <select
                    id="guests"
                    value={guests}
                    onChange={(event) =>
                        onGuestsChange(Number(event.target.value))
                    }
                    className="h-10 rounded-lg border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                >
                    {Array.from({ length: property.max_guests }, (_, count) => (
                        <option key={count + 1} value={count + 1}>
                            {plural(count + 1, 'voyageur')}
                        </option>
                    ))}
                </select>
            </div>

            {nights > 0 && (
                <PriceBreakdown
                    price={{
                        nights,
                        price_per_night: property.price_per_night,
                        cleaning_fee: property.cleaning_fee,
                        service_fee: serviceFee,
                        total_price: subtotal + serviceFee,
                    }}
                    totalLabel="Total estimé"
                    className="border-t border-zinc-200 pt-4 dark:border-zinc-800"
                />
            )}

            {nights > 0 && stay.checkIn && stay.checkOut ? (
                <Link href={reserveHref} className={buttonClasses({ size: 'lg' })}>
                    {property.is_instant ? 'Réserver' : 'Demander à réserver'}
                </Link>
            ) : (
                <Button size="lg" disabled>
                    Choisissez vos dates
                </Button>
            )}
            <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
                {property.is_instant
                    ? 'Réservation immédiate, sans attendre l’hôte.'
                    : 'L’hôte confirme votre demande avant tout paiement.'}
            </p>
            {stay.checkIn && (
                <button
                    type="button"
                    onClick={onClear}
                    className="text-sm font-medium text-zinc-600 underline underline-offset-4 dark:text-zinc-300"
                >
                    Effacer les dates
                </button>
            )}
        </Card>
    );
}

export function PropertyShowClient({
    property,
    unavailableRanges,
    serviceFeeRate,
    reviews,
    initialStay,
    initialGuests,
}: {
    property: PropertyDetail;
    unavailableRanges: DateRange[];
    serviceFeeRate: number;
    reviews: Review[];
    initialStay: StaySelection;
    initialGuests: number;
}) {
    const [stay, setStay] = useState<StaySelection>(initialStay);
    const [guests, setGuests] = useState(initialGuests);
    const location = property.location;
    const isLongTerm = property.rental_duration === 'long_term';
    const longTermQuote = isLongTerm
        ? quoteLongTermUpfront({
              monthlyRent: property.monthly_rent,
              securityDeposit: property.security_deposit,
              monthlyCharges: property.monthly_charges,
              chargesIncluded: property.charges_included,
              advanceRentMonths: property.advance_rent_months,
          })
        : null;

    return (
        <Container className="flex flex-col gap-8 py-8">
            {property.status !== 'published' && (
                <Alert tone="warning">
                    Aperçu : ce logement n’est pas visible publiquement (
                    {property.status_label.toLowerCase()}).
                </Alert>
            )}

            <header className="flex flex-col gap-2">
                <div className="flex items-start justify-between gap-4">
                    <h1 className="text-2xl font-semibold sm:text-3xl">
                        {property.title}
                    </h1>
                    {property.status === 'published' && (
                        <FavoriteButton
                            propertyId={property.id}
                            slug={property.slug}
                            title={property.title}
                            variant="plain"
                            className="shrink-0 bg-zinc-100 dark:bg-zinc-800"
                        />
                    )}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                    <RatingSummary
                        average={property.rating_average}
                        count={property.reviews_count}
                        className="text-zinc-900 dark:text-zinc-100"
                    />
                    <span aria-hidden="true">·</span>
                    <span>
                        {property.type} · {property.city}, {property.country}
                    </span>
                    {isLongTerm && (
                        <Badge tone="secondary">Location longue durée</Badge>
                    )}
                    <Badge tone={property.is_instant ? 'primary' : 'neutral'}>
                        {property.booking_mode_label}
                    </Badge>
                </div>
            </header>

            <Gallery property={property} />

            <div className="grid gap-12 lg:grid-cols-[1fr_24rem]">
                <div className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800 [&>section]:py-8 [&>section:first-child]:pt-0">
                    <section className="flex flex-col gap-3">
                        <h2 className="text-lg font-semibold">
                            {isLongTerm
                                ? `Proposé par ${property.host.name}`
                                : `Hébergé par ${property.host.name}`}
                        </h2>
                        <p className="text-zinc-600 dark:text-zinc-400">
                            {[
                                plural(
                                    property.max_guests,
                                    isLongTerm ? 'occupant' : 'voyageur',
                                ),
                                property.bedrooms > 0
                                    ? plural(property.bedrooms, 'chambre')
                                    : 'Studio',
                                property.beds > 0
                                    ? plural(property.beds, 'lit')
                                    : null,
                                plural(
                                    property.bathrooms,
                                    'salle de bain',
                                    'salles de bain',
                                ),
                            ]
                                .filter(Boolean)
                                .join(' · ')}
                        </p>
                        {property.host.member_since && (
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                Hôte depuis {property.host.member_since}
                            </p>
                        )}
                    </section>

                    {isLongTerm && longTermQuote && (
                        <section className="flex flex-col gap-4">
                            <h2 className="text-lg font-semibold">
                                Conditions financières
                            </h2>
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                <Card className="p-4">
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                        Loyer mensuel
                                    </p>
                                    <p className="mt-1 text-lg font-semibold">
                                        {formatPrice(property.monthly_rent)}
                                    </p>
                                </Card>
                                <Card className="p-4">
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                        Charges
                                    </p>
                                    <p className="mt-1 text-lg font-semibold">
                                        {property.charges_included
                                            ? 'Comprises'
                                            : `${formatPrice(property.monthly_charges)} / mois`}
                                    </p>
                                </Card>
                                <Card className="p-4">
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                        Caution (hors charges)
                                    </p>
                                    <p className="mt-1 text-lg font-semibold">
                                        {formatPrice(property.security_deposit)}
                                    </p>
                                </Card>
                                <Card className="border-primary-200 bg-primary-50/50 p-4 dark:border-primary-900 dark:bg-primary-950/30">
                                    <p className="text-xs text-primary-700 dark:text-primary-300">
                                        Total à payer à l’entrée (
                                        {property.advance_rent_months} mois +
                                        caution)
                                    </p>
                                    <p className="mt-1 text-lg font-bold text-primary-700 dark:text-primary-300">
                                        {formatPrice(longTermQuote.total_price)}
                                    </p>
                                </Card>
                            </div>
                        </section>
                    )}

                    <section className="flex flex-col gap-3">
                        <h2 className="text-lg font-semibold">
                            À propos du logement
                        </h2>
                        <p className="whitespace-pre-line text-zinc-700 dark:text-zinc-300">
                            {property.description}
                        </p>
                    </section>

                    {property.amenities.length > 0 && (
                        <section className="flex flex-col gap-5">
                            <h2 className="text-lg font-semibold">
                                Équipements
                            </h2>
                            <div className="grid gap-6 sm:grid-cols-2">
                                {property.amenities.map((group) => (
                                    <div key={group.category}>
                                        <h3 className="mb-2 text-sm font-semibold text-zinc-500 dark:text-zinc-400">
                                            {group.category}
                                        </h3>
                                        <ul className="flex flex-col gap-1.5">
                                            {group.items.map((amenity) => (
                                                <li
                                                    key={amenity.slug}
                                                    className="flex items-center gap-2"
                                                >
                                                    <svg
                                                        viewBox="0 0 20 20"
                                                        fill="currentColor"
                                                        className="size-4 text-primary-600"
                                                        aria-hidden="true"
                                                    >
                                                        <path
                                                            fillRule="evenodd"
                                                            d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                                                            clipRule="evenodd"
                                                        />
                                                    </svg>
                                                    {amenity.name}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    <section className="flex flex-col gap-4">
                        <div>
                            <h2 className="text-lg font-semibold">
                                Disponibilités
                            </h2>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                {isLongTerm ? (
                                    <>
                                        Location longue durée : sélectionnez
                                        votre date d’entrée souhaitée pour
                                        réserver en ligne ({property.advance_rent_months}{' '}
                                        mois de loyer + caution).
                                    </>
                                ) : (
                                    <>
                                        {property.min_nights > 1
                                            ? `Séjour de ${plural(property.min_nights, 'nuit')} minimum. `
                                            : ''}
                                        Arrivée à partir de{' '}
                                        {property.check_in_time}, départ avant{' '}
                                        {property.check_out_time}.
                                    </>
                                )}
                            </p>
                        </div>
                        {isLongTerm ? (
                            unavailableRanges.length > 0 ? (
                                <ul className="flex flex-col gap-1.5 text-sm text-zinc-600 dark:text-zinc-400">
                                    {unavailableRanges.map((range, idx) => (
                                        <li key={idx}>
                                            Indisponible du{' '}
                                            {formatDate(range.start)} au{' '}
                                            {formatDate(range.end)}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-emerald-700 dark:text-emerald-400">
                                    Disponible immédiatement à la location.
                                </p>
                            )
                        ) : (
                            <AvailabilityCalendar
                                unavailableRanges={unavailableRanges}
                                value={stay}
                                onChange={setStay}
                                minNights={property.min_nights}
                                maxNights={property.max_nights}
                            />
                        )}
                    </section>

                    {location && (
                        <section className="flex flex-col gap-3">
                            <h2 className="text-lg font-semibold">
                                Où se situe le logement
                            </h2>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                {property.city}, {property.country} ·
                                emplacement approximatif, l’adresse exacte vous
                                est communiquée après confirmation de la
                                réservation.
                            </p>
                            <iframe
                                title={`Carte des environs de ${property.city}`}
                                loading="lazy"
                                className="aspect-video w-full rounded-2xl border border-zinc-200 dark:border-zinc-800"
                                src={`https://www.openstreetmap.org/export/embed.html?bbox=${location.lng - 0.03}%2C${location.lat - 0.018}%2C${location.lng + 0.03}%2C${location.lat + 0.018}&layer=mapnik`}
                            />
                        </section>
                    )}

                    <section id="avis" className="flex flex-col gap-6">
                        <div className="flex flex-wrap items-baseline gap-3">
                            <h2 className="text-lg font-semibold">
                                Avis des voyageurs
                            </h2>
                            <RatingSummary
                                average={property.rating_average}
                                count={property.reviews_count}
                            />
                        </div>
                        {reviews.length === 0 ? (
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                Pas encore d’avis : seuls les voyageurs ayant
                                séjourné ici peuvent en laisser un.
                            </p>
                        ) : (
                            <div className="grid gap-8 sm:grid-cols-2">
                                {reviews.map((review) => (
                                    <ReviewCard key={review.id} review={review} />
                                ))}
                            </div>
                        )}
                        {property.reviews_count > reviews.length && (
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                Les {reviews.length} avis les plus récents sur{' '}
                                {property.reviews_count}.
                            </p>
                        )}
                    </section>
                </div>

                <aside aria-label="Réservation">
                    <BookingCard
                        property={property}
                        stay={stay}
                        guests={guests}
                        unavailableRanges={unavailableRanges}
                        onGuestsChange={setGuests}
                        onMoveInChange={(checkIn) =>
                            setStay({ checkIn: checkIn || null, checkOut: null })
                        }
                        serviceFeeRate={serviceFeeRate}
                        onClear={() =>
                            setStay({ checkIn: null, checkOut: null })
                        }
                    />
                </aside>
            </div>
        </Container>
    );
}

