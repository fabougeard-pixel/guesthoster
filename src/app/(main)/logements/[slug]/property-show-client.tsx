'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { StaySelection } from '@/components/availability-calendar';
import { AvailabilityCalendar } from '@/components/availability-calendar';
import { Button, buttonClasses } from '@/components/button';
import { Badge, Card, Container } from '@/components/card';
import { FavoriteButton } from '@/components/favorite-button';
import { Alert, Label } from '@/components/form';
import { PriceBreakdown } from '@/components/price-breakdown';
import { ReviewCard } from '@/components/review-card';
import { RatingSummary } from '@/components/star-rating';
import { quoteLongTermUpfront } from '@/lib/domain/pricing';
import {
    diffInDays,
    formatDate,
    formatPrice,
    plural,
    todayIso,
} from '@/lib/format';
import { cn } from '@/lib/utils';
import type { DateRange, PropertyDetail, Review } from '@/types';

function Gallery({ property }: { property: PropertyDetail }) {
    const [activeIndex, setActiveIndex] = useState<number | null>(null);
    const images = property.images;
    const [cover, ...others] = images;

    // Keyboard navigation (Escape, ArrowLeft, ArrowRight) + body scroll lock
    useEffect(() => {
        if (activeIndex === null) {
            return;
        }

        function handleKeyDown(e: KeyboardEvent) {
            if (e.key === 'Escape') {
                setActiveIndex(null);
            } else if (e.key === 'ArrowRight') {
                setActiveIndex((prev) =>
                    prev !== null ? (prev + 1) % images.length : 0,
                );
            } else if (e.key === 'ArrowLeft') {
                setActiveIndex((prev) =>
                    prev !== null
                        ? (prev - 1 + images.length) % images.length
                        : 0,
                );
            }
        }

        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            document.body.style.overflow = originalOverflow;
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [activeIndex, images.length]);

    if (!cover) {
        return (
            <div className="flex aspect-video items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400 dark:bg-zinc-800">
                Pas encore de photo
            </div>
        );
    }

    const currentImage = activeIndex !== null ? images[activeIndex] : null;

    return (
        <>
            <div className="relative grid gap-2 overflow-hidden rounded-2xl sm:grid-cols-4 sm:grid-rows-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={cover.url}
                    alt={cover.alt}
                    onClick={() => setActiveIndex(0)}
                    className="aspect-4/3 size-full cursor-pointer object-cover transition duration-200 hover:opacity-95 sm:col-span-2 sm:row-span-2 sm:aspect-auto"
                />
                {others.slice(0, 4).map((image, idx) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        key={image.id}
                        src={image.url}
                        alt={image.alt}
                        loading="lazy"
                        onClick={() => setActiveIndex(idx + 1)}
                        className="hidden aspect-4/3 size-full cursor-pointer object-cover transition duration-200 hover:opacity-95 sm:block"
                    />
                ))}
                {images.length > 1 && (
                    <Button
                        variant="outline"
                        size="sm"
                        className="absolute right-3 bottom-3 shadow-md backdrop-blur-xs bg-white/90 hover:bg-white dark:bg-zinc-900/90 dark:hover:bg-zinc-900"
                        onClick={() => setActiveIndex(0)}
                    >
                        <svg
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            className="mr-1.5 size-4"
                            aria-hidden="true"
                        >
                            <path
                                fillRule="evenodd"
                                d="M1 5.25A2.25 2.25 0 0 1 3.25 3h13.5A2.25 2.25 0 0 1 19 5.25v9.5A2.25 2.25 0 0 1 16.75 17H3.25A2.25 2.25 0 0 1 1 14.75v-9.5Zm1.5 5.81v3.69c0 .414.336.75.75.75h13.5a.75.75 0 0 0 .75-.75v-2.69l-2.22-2.219a.75.75 0 0 0-1.06 0l-1.91 1.909-4.22-4.219a.75.75 0 0 0-1.06 0L2.5 11.06Z"
                                clipRule="evenodd"
                            />
                        </svg>
                        Voir les {images.length} photos
                    </Button>
                )}
            </div>

            {/* Visionneuse Diaporama plein écran / Lightbox (Suivant / Précédent) */}
            {activeIndex !== null && currentImage && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label={`Galerie photo · ${property.title}`}
                    className="fixed inset-0 z-50 flex flex-col justify-between bg-black/95 text-white backdrop-blur-md animate-in fade-in duration-200"
                >
                    {/* Barre supérieure */}
                    <header className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-6">
                        <div className="flex items-center gap-3">
                            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide backdrop-blur-xs">
                                {activeIndex + 1} / {images.length}
                            </span>
                            <span className="hidden max-w-md truncate text-sm font-medium text-zinc-300 sm:inline">
                                {property.title}
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setActiveIndex(null)}
                            aria-label="Fermer la galerie"
                            className="flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20"
                        >
                            <span>Fermer</span>
                            <svg
                                viewBox="0 0 20 20"
                                fill="currentColor"
                                className="size-4"
                                aria-hidden="true"
                            >
                                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                            </svg>
                        </button>
                    </header>

                    {/* Zone principale d'affichage avec boutons Précédent / Suivant */}
                    <div className="relative flex flex-1 items-center justify-center px-4 py-2 sm:px-16">
                        {images.length > 1 && (
                            <button
                                type="button"
                                onClick={() =>
                                    setActiveIndex((prev) =>
                                        prev !== null
                                            ? (prev - 1 + images.length) %
                                            images.length
                                            : 0,
                                    )
                                }
                                aria-label="Photo précédente (Flèche gauche)"
                                className="absolute left-2 z-10 flex size-11 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-md transition hover:scale-105 hover:bg-white/30 active:scale-95 sm:left-6 sm:size-13"
                            >
                                <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth={2.5}
                                    className="size-6"
                                    aria-hidden="true"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M15.75 19.5 8.25 12l7.5-7.5"
                                    />
                                </svg>
                            </button>
                        )}

                        <div className="flex max-h-[72vh] max-w-full flex-col items-center justify-center">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                key={currentImage.id}
                                src={currentImage.url}
                                alt={currentImage.alt}
                                className="max-h-[68vh] w-auto max-w-full select-none rounded-xl object-contain shadow-2xl transition-all duration-200"
                            />
                            {currentImage.alt && (
                                <p className="mt-2 max-w-xl truncate text-center text-xs text-zinc-400">
                                    {currentImage.alt}
                                </p>
                            )}
                        </div>

                        {images.length > 1 && (
                            <button
                                type="button"
                                onClick={() =>
                                    setActiveIndex((prev) =>
                                        prev !== null
                                            ? (prev + 1) % images.length
                                            : 0,
                                    )
                                }
                                aria-label="Photo suivante (Flèche droite)"
                                className="absolute right-2 z-10 flex size-11 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-md transition hover:scale-105 hover:bg-white/30 active:scale-95 sm:right-6 sm:size-13"
                            >
                                <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth={2.5}
                                    className="size-6"
                                    aria-hidden="true"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="m8.25 4.5 7.5 7.5-7.5 7.5"
                                    />
                                </svg>
                            </button>
                        )}
                    </div>

                    {/* Bandeau de miniatures inférieur */}
                    {images.length > 1 && (
                        <footer className="border-t border-white/10 bg-black/50 p-3 sm:p-4">
                            <div className="mx-auto flex max-w-4xl items-center justify-center gap-2 overflow-x-auto py-1">
                                {images.map((img, idx) => {
                                    const isSelected = idx === activeIndex;
                                    return (
                                        <button
                                            key={img.id}
                                            type="button"
                                            onClick={() => setActiveIndex(idx)}
                                            className={cn(
                                                'relative h-13 w-18 shrink-0 overflow-hidden rounded-lg transition sm:h-14 sm:w-20',
                                                isSelected
                                                    ? 'scale-105 opacity-100 ring-2 ring-primary-500 ring-offset-2 ring-offset-black'
                                                    : 'opacity-40 hover:opacity-90',
                                            )}
                                        >
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={img.url}
                                                alt={img.alt}
                                                className="size-full object-cover"
                                            />
                                        </button>
                                    );
                                })}
                            </div>
                        </footer>
                    )}
                </div>
            )}
        </>
    );
}

function BookingCard({
    property,
    stay,
    guests,
    unavailableRanges,
    onGuestsChange,
    onStayChange,
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
    onStayChange: (stay: StaySelection) => void;
    onMoveInChange: (checkIn: string) => void;
    onClear: () => void;
}) {
    const today = todayIso();
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);

    // ==========================================
    // LOCATION LONGUE DURÉE
    // ==========================================
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
                {/* Loyer mensuel & statut des charges */}
                <div className="flex flex-col gap-1">
                    <p>
                        <span className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                            {formatPrice(property.monthly_rent)}
                        </span>{' '}
                        <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                            / mois
                        </span>
                    </p>
                    <p className="text-xs font-medium">
                        {property.charges_included ? (
                            <span className="text-emerald-700 dark:text-emerald-400">
                                ✓ Charges comprises dans le loyer
                            </span>
                        ) : property.monthly_charges > 0 ? (
                            <span className="text-amber-700 dark:text-amber-400">
                                Hors charges : +
                                {formatPrice(property.monthly_charges)} / mois
                            </span>
                        ) : (
                            <span className="text-zinc-500 dark:text-zinc-400">
                                Hors charges
                            </span>
                        )}
                    </p>
                </div>

                {/* Date d'entrée souhaitée */}
                <div className="flex flex-col gap-1.5">
                    <Label htmlFor="move-in-date">
                        Date d’entrée souhaitée
                    </Label>
                    <input
                        id="move-in-date"
                        type="date"
                        min={today}
                        value={stay.checkIn ?? ''}
                        onChange={(event) => onMoveInChange(event.target.value)}
                        className="h-10 rounded-xl border border-zinc-300 bg-white px-3 text-sm text-zinc-900 transition hover:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                    />
                    {isMoveInUnavailable && (
                        <p className="text-xs font-medium text-red-600 dark:text-red-400">
                            Ce logement est indisponible à cette date.
                        </p>
                    )}
                </div>

                {/* Nombre d'occupants */}
                <div className="flex flex-col gap-1.5">
                    <Label htmlFor="guests">Occupants</Label>
                    <select
                        id="guests"
                        value={guests}
                        onChange={(event) =>
                            onGuestsChange(Number(event.target.value))
                        }
                        className="h-10 rounded-xl border border-zinc-300 bg-white px-3 text-sm text-zinc-900 transition hover:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
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

                {/* Décomposition financière exacte à l'entrée */}
                <PriceBreakdown
                    price={{ ...quote, rental_duration: 'long_term' }}
                    totalLabel="Total à régler à l’entrée"
                    className="border-t border-zinc-200 pt-4 dark:border-zinc-800"
                />

                {/* Action de réservation */}
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
                        ? 'Paiement sécurisé en ligne, validation immédiate.'
                        : 'L’hôte examine votre demande avant tout paiement en ligne.'}
                </p>

                {stay.checkIn && (
                    <button
                        type="button"
                        onClick={onClear}
                        className="text-center text-xs font-medium text-zinc-500 underline underline-offset-4 transition hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                    >
                        Effacer la date d’entrée
                    </button>
                )}
            </Card>
        );
    }

    // ==========================================
    // LOCATION COURTE DURÉE
    // ==========================================
    const nights =
        stay.checkIn && stay.checkOut
            ? diffInDays(stay.checkIn, stay.checkOut)
            : 0;
    const subtotal = nights * property.price_per_night + property.cleaning_fee;
    const serviceFee = Math.round(subtotal * serviceFeeRate);
    const totalPrice = subtotal + serviceFee;

    const reserveHref =
        stay.checkIn && stay.checkOut
            ? `/logements/${property.slug}/reserver?check_in=${encodeURIComponent(stay.checkIn)}&check_out=${encodeURIComponent(stay.checkOut)}&guests=${guests}`
            : '#';

    return (
        <Card className="flex flex-col gap-5 p-6 lg:sticky lg:top-24">
            {/* Prix par nuit */}
            <div className="flex flex-col gap-1">
                <p>
                    <span className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                        {formatPrice(property.price_per_night)}
                    </span>{' '}
                    <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                        / nuit
                    </span>
                </p>
                {nights === 0 && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {property.cleaning_fee > 0
                            ? `Frais de ménage : ${formatPrice(property.cleaning_fee)} · Frais de service calculés lors du choix des dates`
                            : 'Frais de service calculés lors du choix des dates'}
                    </p>
                )}
            </div>

            {/* Sélecteur de dates interactif avec ouverture directe du calendrier */}
            <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                    <Label>Dates du séjour</Label>
                    <button
                        type="button"
                        onClick={() => setIsCalendarOpen((prev) => !prev)}
                        className="text-xs font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400"
                    >
                        {isCalendarOpen
                            ? 'Fermer le calendrier'
                            : 'Ouvrir le calendrier'}
                    </button>
                </div>

                <div
                    onClick={() => setIsCalendarOpen(true)}
                    className="grid cursor-pointer grid-cols-2 overflow-hidden rounded-xl border border-zinc-300 text-sm transition hover:border-primary-400 dark:border-zinc-700 dark:hover:border-primary-500"
                >
                    <div className="border-r border-zinc-300 p-3 dark:border-zinc-700">
                        <dt className="text-xs font-semibold text-zinc-500 uppercase dark:text-zinc-400">
                            Arrivée
                        </dt>
                        <dd className="mt-0.5 font-medium text-zinc-900 dark:text-zinc-100">
                            {stay.checkIn
                                ? formatDate(stay.checkIn)
                                : 'Sélectionner'}
                        </dd>
                    </div>
                    <div className="p-3">
                        <dt className="text-xs font-semibold text-zinc-500 uppercase dark:text-zinc-400">
                            Départ
                        </dt>
                        <dd className="mt-0.5 font-medium text-zinc-900 dark:text-zinc-100">
                            {stay.checkOut
                                ? formatDate(stay.checkOut)
                                : 'Sélectionner'}
                        </dd>
                    </div>
                </div>

                {/* Calendrier interactif directement intégré dans le widget */}
                {isCalendarOpen && (
                    <div className="mt-2 rounded-2xl border border-primary-200 bg-primary-50/20 p-3 shadow-inner dark:border-primary-900/60 dark:bg-primary-950/20 animate-in fade-in duration-150">
                        <div className="mb-2 flex items-center justify-between border-b border-primary-100 pb-2 dark:border-primary-900/40">
                            <span className="text-xs font-semibold text-primary-800 dark:text-primary-300">
                                {property.min_nights > 1
                                    ? `Sélectionnez vos dates (${property.min_nights} nuits min.)`
                                    : 'Sélectionnez vos dates'}
                            </span>
                            <button
                                type="button"
                                onClick={() => setIsCalendarOpen(false)}
                                className="text-xs font-semibold text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                            >
                                ✕
                            </button>
                        </div>
                        <AvailabilityCalendar
                            unavailableRanges={unavailableRanges}
                            value={stay}
                            onChange={(newStay) => {
                                onStayChange(newStay);
                                if (newStay.checkIn && newStay.checkOut) {
                                    setIsCalendarOpen(false);
                                }
                            }}
                            minNights={property.min_nights}
                            maxNights={property.max_nights}
                        />
                    </div>
                )}
            </div>

            {/* Voyageurs */}
            <div className="flex flex-col gap-1.5">
                <Label htmlFor="guests">Voyageurs</Label>
                <select
                    id="guests"
                    value={guests}
                    onChange={(event) =>
                        onGuestsChange(Number(event.target.value))
                    }
                    className="h-10 rounded-xl border border-zinc-300 bg-white px-3 text-sm text-zinc-900 transition hover:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                >
                    {Array.from({ length: property.max_guests }, (_, count) => (
                        <option key={count + 1} value={count + 1}>
                            {plural(count + 1, 'voyageur')}
                        </option>
                    ))}
                </select>
            </div>

            {/* Décomposition tarifaire dès que les dates sont choisies */}
            {nights > 0 && (
                <PriceBreakdown
                    price={{
                        rental_duration: 'short_term',
                        nights,
                        price_per_night: property.price_per_night,
                        cleaning_fee: property.cleaning_fee,
                        service_fee: serviceFee,
                        total_price: totalPrice,
                    }}
                    totalLabel="Total estimé"
                    className="border-t border-zinc-200 pt-4 dark:border-zinc-800"
                />
            )}

            {/* Bouton d'action */}
            {nights > 0 && stay.checkIn && stay.checkOut ? (
                <Link
                    href={reserveHref}
                    className={buttonClasses({ size: 'lg' })}
                >
                    {property.is_instant ? 'Réserver' : 'Demander à réserver'}
                </Link>
            ) : (
                <Button
                    size="lg"
                    onClick={() => setIsCalendarOpen(true)}
                    className="w-full bg-primary-500 hover:bg-primary-600"
                >
                    Choisir vos dates
                </Button>
            )}

            <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
                {property.is_instant
                    ? 'Réservation immédiate, sans attendre la validation de l’hôte.'
                    : 'L’hôte confirme votre demande avant tout paiement.'}
            </p>

            {stay.checkIn && (
                <button
                    type="button"
                    onClick={() => {
                        onClear();
                        setIsCalendarOpen(false);
                    }}
                    className="text-center text-xs font-medium text-zinc-500 underline underline-offset-4 transition hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
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
                        onStayChange={setStay}
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

