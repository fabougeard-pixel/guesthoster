'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { StaySelection } from '@/components/availability-calendar';
import { AvailabilityCalendar } from '@/components/availability-calendar';
import { Button, buttonClasses } from '@/components/button';
import { Badge, Card, Container } from '@/components/card';
import { PropertyInquiryChatDrawer } from '@/components/chat/property-inquiry-chat-drawer';
import { FavoriteButton } from '@/components/favorite-button';
import { Alert, Label } from '@/components/form';
import { PriceBreakdown } from '@/components/price-breakdown';
import { ReviewCard } from '@/components/review-card';
import { RatingSummary, Stars } from '@/components/star-rating';
import { VisitBookingModal } from '@/components/visit-booking-modal';
import {
    formatLeaseDuration,
    type PaymentMethodKey,
    type PlatformRentalSettings,
} from '@/lib/domain/platform-settings';
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
    onClear,
    onOpenChat,
    serviceFeeRate,
    rentalSettings,
    enabledMethods,
}: {
    serviceFeeRate: number;
    property: PropertyDetail;
    stay: StaySelection;
    guests: number;
    unavailableRanges: DateRange[];
    onGuestsChange: (guests: number) => void;
    onStayChange: (stay: StaySelection) => void;
    onClear: () => void;
    onOpenChat: () => void;
    rentalSettings?: PlatformRentalSettings;
    enabledMethods?: PaymentMethodKey[];
}) {
    const [calendarStep, setCalendarStep] = useState<
        'checkIn' | 'checkOut' | null
    >(null);
    const [isVisitModalOpen, setIsVisitModalOpen] = useState(false);

    // ==========================================
    // LOCATION STANDARD (BAIL D'HABITATION)
    // ==========================================
    if (property.rental_duration === 'long_term') {
        const quote = quoteLongTermUpfront({
            monthlyRent: property.monthly_rent,
            securityDeposit: property.security_deposit,
            monthlyCharges: property.monthly_charges,
            chargesIncluded: property.charges_included,
            advanceRentMonths: property.advance_rent_months,
        });

        const effectiveVisitFee =
            rentalSettings?.longTermVisitFeeMode === 'global'
                ? Math.round(rentalSettings.longTermGlobalVisitFee * 100)
                : (property.visit_fee ?? 0);

        const buttonLabel =
            rentalSettings?.longTermWidgetButtonLabel?.trim() ||
            'Prendre rendez-vous';

        const showDeposit =
            rentalSettings?.longTermShowDepositOnWidget ?? true;
        const showCharges =
            rentalSettings?.longTermShowChargesOnWidget ?? true;

        return (
            <>
                <Card className="flex flex-col gap-5 p-6 lg:sticky lg:top-24">
                    {/* Badge type de formule & durée minimale empilée */}
                    <div className="flex flex-col items-start gap-1">
                        <Badge tone="secondary" className="text-sm font-semibold">
                            Location standard
                        </Badge>
                        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                            Minimum {formatLeaseDuration(property.min_lease_months)}
                        </span>
                    </div>

                    {/* Loyer mensuel & statut des charges */}
                    <div className="flex flex-col gap-1 border-b border-zinc-100 pb-4 dark:border-zinc-800">
                        <p>
                            <span className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                                {formatPrice(property.monthly_rent)}
                            </span>{' '}
                            <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                                / mois
                            </span>
                        </p>
                        {showCharges && (
                            <p className="text-xs font-medium">
                                {property.charges_included ? (
                                    <span className="text-emerald-700 dark:text-emerald-400">
                                        ✓ Charges comprises dans le loyer
                                    </span>
                                ) : property.monthly_charges > 0 ? (
                                    <span className="text-amber-700 dark:text-amber-400">
                                        Charges en sus : +
                                        {formatPrice(property.monthly_charges)} / mois
                                    </span>
                                ) : (
                                    <span className="text-zinc-500 dark:text-zinc-400">
                                        Hors charges
                                    </span>
                                )}
                            </p>
                        )}
                    </div>

                    {/* Caractéristiques contractuelles et financières */}
                    <div className="grid grid-cols-2 gap-3 text-xs">
                        {showDeposit && (
                            <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-3 dark:border-zinc-800 dark:bg-zinc-850/50">
                                <span className="text-zinc-500 dark:text-zinc-400">Caution requise</span>
                                <p className="mt-0.5 text-sm font-bold text-zinc-900 dark:text-zinc-100">
                                    {formatPrice(property.security_deposit)}
                                </p>
                            </div>
                        )}
                        <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-3 dark:border-zinc-800 dark:bg-zinc-850/50">
                            <span className="text-zinc-500 dark:text-zinc-400">Contrat minimal</span>
                            <p className="mt-0.5 text-sm font-bold text-zinc-900 dark:text-zinc-100">
                                {formatLeaseDuration(property.min_lease_months)} renouvelable
                            </p>
                        </div>
                    </div>

                    {/* Décomposition financière exacte pour l'entrée */}
                    <PriceBreakdown
                        price={{ ...quote, rental_duration: 'long_term' }}
                        totalLabel="Total requis à la signature"
                        className="border-t border-zinc-200 pt-4 dark:border-zinc-800"
                    />

                    {/* Action principale : Prendre rendez-vous */}
                    <Button
                        size="lg"
                        onClick={() => setIsVisitModalOpen(true)}
                        className="w-full text-base font-semibold shadow-md"
                    >
                        {buttonLabel}
                    </Button>

                    <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
                        Visite personnalisée sur rendez-vous avec l’hôte.
                    </p>

                    <div className="border-t border-zinc-200 pt-3 text-center dark:border-zinc-800">
                        <button
                            type="button"
                            onClick={onOpenChat}
                            className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                        >
                            <svg viewBox="0 0 20 20" fill="currentColor" className="size-3.5" aria-hidden="true">
                                <path fillRule="evenodd" d="M10 2c-2.236 0-4.43.18-6.57.524C1.993 2.755 1 4.014 1 5.426v5.148c0 1.413.993 2.67 2.43 2.902.848.137 1.705.248 2.57.331v3.443a.75.75 0 0 0 1.28.53l3.58-3.579a.78.78 0 0 1 .527-.224 41.202 41.202 0 0 0 5.183-.5c1.437-.232 2.43-1.49 2.43-2.903V5.426c0-1.413-.993-2.67-2.43-2.902A41.289 41.289 0 0 0 10 2Z" clipRule="evenodd" />
                            </svg>
                            Une question ? Contacter l’hôte
                        </button>
                    </div>
                </Card>

                {/* Modale de prise de rendez-vous pour visite */}
                <VisitBookingModal
                    property={property}
                    isOpen={isVisitModalOpen}
                    onClose={() => setIsVisitModalOpen(false)}
                    effectiveVisitFee={effectiveVisitFee}
                    enabledMethods={enabledMethods}
                />
            </>
        );
    }

    // ==========================================
    // LOCATION COURTE DURÉE
    // ==========================================
    const cancellationDays = property.cancellation_days ?? 7;
    let cancellationInfo: {
        label: string;
        isPast: boolean;
        dateFormatted: string | null;
    } = {
        label: `Annulation gratuite jusqu’à ${cancellationDays} jours avant l’arrivée`,
        isPast: false,
        dateFormatted: null,
    };

    if (stay.checkIn) {
        const checkInDate = new Date(`${stay.checkIn}T00:00:00Z`);
        const deadlineDate = new Date(
            checkInDate.getTime() - cancellationDays * 24 * 60 * 60 * 1000,
        );
        const deadlineIso = deadlineDate.toISOString().slice(0, 10);
        const today = todayIso();

        const formattedDeadline = new Intl.DateTimeFormat('fr-FR', {
            day: 'numeric',
            month: 'long',
        }).format(deadlineDate);

        if (today > deadlineIso) {
            cancellationInfo = {
                label: `Non remboursable (délai d’annulation de ${cancellationDays} jours dépassé)`,
                isPast: true,
                dateFormatted: formattedDeadline,
            };
        } else {
            cancellationInfo = {
                label: `Annulation gratuite jusqu’au ${formattedDeadline} à ${property.check_in_time}`,
                isPast: false,
                dateFormatted: formattedDeadline,
            };
        }
    }

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

            {/* Sélecteur de dates interactif Arrivée / Départ séparés avec calendrier unique et fermeture automatique */}
            <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                    <Label>Dates du séjour</Label>
                    {calendarStep !== null && (
                        <button
                            type="button"
                            onClick={() => setCalendarStep(null)}
                            className="text-xs font-semibold text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                        >
                            Fermer
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-zinc-300 text-sm dark:border-zinc-700">
                    {/* Case Arrivée */}
                    <button
                        type="button"
                        onClick={() =>
                            setCalendarStep((prev) =>
                                prev === 'checkIn' ? null : 'checkIn',
                            )
                        }
                        className={cn(
                            'border-r border-zinc-300 p-3 text-left transition hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800/60',
                            calendarStep === 'checkIn' &&
                            'ring-2 ring-primary-500 ring-inset bg-primary-50/40 dark:bg-primary-950/30',
                        )}
                    >
                        <dt className="text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">
                            Arrivée
                        </dt>
                        <dd className="mt-0.5 font-medium text-zinc-900 dark:text-zinc-100">
                            {stay.checkIn
                                ? formatDate(stay.checkIn)
                                : 'Sélectionner'}
                        </dd>
                    </button>

                    {/* Case Départ */}
                    <button
                        type="button"
                        onClick={() =>
                            setCalendarStep((prev) =>
                                prev === 'checkOut' ? null : 'checkOut',
                            )
                        }
                        className={cn(
                            'p-3 text-left transition hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800/60',
                            calendarStep === 'checkOut' &&
                            'ring-2 ring-primary-500 ring-inset bg-primary-50/40 dark:bg-primary-950/30',
                        )}
                    >
                        <dt className="text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">
                            Départ
                        </dt>
                        <dd className="mt-0.5 font-medium text-zinc-900 dark:text-zinc-100">
                            {stay.checkOut
                                ? formatDate(stay.checkOut)
                                : 'Sélectionner'}
                        </dd>
                    </button>
                </div>

                {/* Calendrier unique interactif (un seul mois, se referme automatiquement après sélection) */}
                {calendarStep !== null && (
                    <div className="mt-2 rounded-2xl border border-primary-200 bg-white p-3.5 shadow-xl ring-1 ring-black/5 dark:border-primary-900/60 dark:bg-zinc-900 animate-in fade-in duration-150">
                        <div className="mb-2 flex items-center justify-between border-b border-zinc-100 pb-2 dark:border-zinc-800">
                            <span className="text-xs font-semibold text-primary-700 dark:text-primary-300">
                                {calendarStep === 'checkIn'
                                    ? 'Sélectionnez votre date d’arrivée'
                                    : `Sélectionnez votre départ (Arrivée : ${formatDate(stay.checkIn ?? '')})`}
                            </span>
                            <button
                                type="button"
                                onClick={() => setCalendarStep(null)}
                                className="text-xs font-semibold text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                            >
                                ✕
                            </button>
                        </div>
                        <AvailabilityCalendar
                            unavailableRanges={unavailableRanges}
                            value={stay}
                            monthsCount={1}
                            mode={calendarStep}
                            onChange={(newStay) => {
                                onStayChange(newStay);
                            }}
                            onDatePick={() => {
                                setCalendarStep(null);
                            }}
                            minNights={property.min_nights}
                            maxNights={property.max_nights}
                        />
                    </div>
                )}
            </div>

            {/* Voyageurs */}
            <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                    <Label htmlFor="guests-stepper">Voyageurs</Label>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        Capacité max. {property.max_guests} {plural(property.max_guests, 'personne')}
                    </span>
                </div>
                <div
                    id="guests-stepper"
                    className="flex h-11 items-center justify-between rounded-xl border border-zinc-300 bg-white px-2 shadow-2xs transition dark:border-zinc-700 dark:bg-zinc-900"
                >
                    <button
                        type="button"
                        onClick={() => onGuestsChange(Math.max(1, guests - 1))}
                        disabled={guests <= 1}
                        className="flex size-8 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-base font-semibold text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-30 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 dark:hover:text-zinc-100"
                        aria-label="Diminuer le nombre de voyageurs"
                    >
                        −
                    </button>
                    <div className="flex items-center gap-1.5 font-semibold text-zinc-900 dark:text-zinc-100">
                        <span className="text-sm font-semibold">{plural(guests, 'voyageur')}</span>
                        {guests === property.max_guests && (
                            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                                Capacité max
                            </span>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={() =>
                            onGuestsChange(Math.min(property.max_guests, guests + 1))
                        }
                        disabled={guests >= property.max_guests}
                        className="flex size-8 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-base font-semibold text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-30 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 dark:hover:text-zinc-100"
                        aria-label="Augmenter le nombre de voyageurs"
                    >
                        +
                    </button>
                </div>
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

            {/* Délai butoir pour l'annulation calculé dynamiquement */}
            <div
                className={cn(
                    'flex items-start gap-2.5 rounded-xl border p-3 text-xs transition',
                    cancellationInfo.isPast
                        ? 'border-amber-200 bg-amber-50/70 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200'
                        : 'border-emerald-200 bg-emerald-50/70 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-200',
                )}
            >
                <svg
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="mt-0.5 size-4 shrink-0"
                    aria-hidden="true"
                >
                    {cancellationInfo.isPast ? (
                        <path
                            fillRule="evenodd"
                            d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
                            clipRule="evenodd"
                        />
                    ) : (
                        <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z"
                            clipRule="evenodd"
                        />
                    )}
                </svg>
                <div className="flex flex-col">
                    <span className="font-semibold">{cancellationInfo.label}</span>
                    <span className="mt-0.5 text-[11px] opacity-80">
                        {cancellationInfo.isPast
                            ? 'Pour ces dates choisies, aucun remboursement ne sera accordé en cas d’annulation.'
                            : `Annulation sans frais garantie jusqu’à ${cancellationDays} ${plural(cancellationDays, 'jour')} avant l’arrivée.`}
                    </span>
                </div>
            </div>

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
                    onClick={() => setCalendarStep('checkIn')}
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
                        setCalendarStep(null);
                    }}
                    className="text-center text-xs font-medium text-zinc-500 underline underline-offset-4 transition hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                >
                    Effacer les dates
                </button>
            )}

            <div className="border-t border-zinc-200 pt-3 text-center dark:border-zinc-800">
                <button
                    type="button"
                    onClick={onOpenChat}
                    className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                >
                    <svg viewBox="0 0 20 20" fill="currentColor" className="size-3.5" aria-hidden="true">
                        <path fillRule="evenodd" d="M10 2c-2.236 0-4.43.18-6.57.524C1.993 2.755 1 4.014 1 5.426v5.148c0 1.413.993 2.67 2.43 2.902.848.137 1.705.248 2.57.331v3.443a.75.75 0 0 0 1.28.53l3.58-3.579a.78.78 0 0 1 .527-.224 41.202 41.202 0 0 0 5.183-.5c1.437-.232 2.43-1.49 2.43-2.903V5.426c0-1.413-.993-2.67-2.43-2.902A41.289 41.289 0 0 0 10 2Z" clipRule="evenodd" />
                    </svg>
                    Une question ? Contacter l’hôte
                </button>
            </div>
        </Card>
    );
}

function HostReviewsSlider({
    hostName,
    reviews = [],
}: {
    hostName: string;
    reviews: Review[];
}) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const total = reviews.length;

    if (total === 0) {
        return (
            <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/60 p-6 text-center dark:border-zinc-800 dark:bg-zinc-900/40">
                <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
                    <svg
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="size-5"
                    >
                        <path d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401Z" />
                    </svg>
                </div>
                <h4 className="mt-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    Nouvel hôte de confiance
                </h4>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    {hostName} est prêt à vous accueillir. Réservez votre séjour et soyez le premier voyageur à partager votre expérience !
                </p>
            </div>
        );
    }

    const currentReview = reviews[currentIndex];

    return (
        <div className="relative rounded-2xl border border-zinc-200 bg-zinc-50/70 p-5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900/60">
            <div className="flex items-center justify-between gap-4 border-b border-zinc-200/60 pb-3 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                    <Stars rating={currentReview.rating} />
                    <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                        {currentReview.rating} / 5
                    </span>
                </div>
                {total > 1 && (
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                        <span>
                            {currentIndex + 1} / {total}
                        </span>
                        <div className="flex gap-1">
                            <button
                                type="button"
                                onClick={() =>
                                    setCurrentIndex((i) => (i - 1 + total) % total)
                                }
                                aria-label="Avis précédent"
                                className="flex size-7 items-center justify-center rounded-full border border-zinc-300 bg-white text-zinc-700 shadow-2xs transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                            >
                                ←
                            </button>
                            <button
                                type="button"
                                onClick={() =>
                                    setCurrentIndex((i) => (i + 1) % total)
                                }
                                aria-label="Avis suivant"
                                className="flex size-7 items-center justify-center rounded-full border border-zinc-300 bg-white text-zinc-700 shadow-2xs transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                            >
                                →
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className="mt-4">
                <p className="text-sm italic text-zinc-800 dark:text-zinc-200">
                    « {currentReview.comment} »
                </p>
                <div className="mt-3 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                        {currentReview.author}
                    </span>
                    {currentReview.created_at && (
                        <span>
                            {new Date(currentReview.created_at).toLocaleDateString(
                                'fr-FR',
                                {
                                    month: 'short',
                                    year: 'numeric',
                                },
                            )}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

export function PropertyShowClient({
    property,
    unavailableRanges,
    serviceFeeRate,
    rentalSettings,
    enabledMethods,
    reviews,
    initialStay,
    initialGuests,
    isViewerAuthenticated = false,
}: {
    property: PropertyDetail;
    unavailableRanges: DateRange[];
    serviceFeeRate: number;
    rentalSettings?: PlatformRentalSettings;
    enabledMethods?: PaymentMethodKey[];
    reviews: Review[];
    initialStay: StaySelection;
    initialGuests: number;
    isViewerAuthenticated?: boolean;
}) {
    const [stay, setStay] = useState<StaySelection>(initialStay);
    const [guests, setGuests] = useState(
        initialGuests || property.max_guests || 1,
    );
    const [chatOpen, setChatOpen] = useState(false);
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
                        <div className="flex flex-col items-start gap-0.5">
                            <Badge tone="secondary">Location standard</Badge>
                            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                                Minimum {formatLeaseDuration(property.min_lease_months)}
                            </span>
                        </div>
                    )}
                    <Badge tone={property.is_instant ? 'primary' : 'neutral'}>
                        {property.booking_mode_label}
                    </Badge>
                </div>
            </header>

            <Gallery property={property} />

            <div className="grid gap-12 lg:grid-cols-[1fr_24rem]">
                <div className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800 [&>section]:py-8 [&>section:first-child]:pt-0">
                    <section className="flex flex-col gap-4">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <h2 className="text-lg font-semibold">
                                        {isLongTerm
                                            ? `Proposé par ${property.host.name}`
                                            : `Hébergé par ${property.host.name}`}
                                    </h2>
                                    <span
                                        className={cn(
                                            'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold',
                                            property.host.host_type === 'Hôte Premium'
                                                ? 'border border-amber-300 bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-300'
                                                : property.host.host_type === 'Superhôte'
                                                  ? 'border border-purple-300 bg-purple-100 text-purple-900 dark:bg-purple-950/50 dark:text-purple-300'
                                                  : property.host.host_type === 'Hôte Vérifié'
                                                    ? 'border border-sky-300 bg-sky-100 text-sky-900 dark:bg-sky-950/50 dark:text-sky-300'
                                                    : 'border border-zinc-200 bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
                                        )}
                                    >
                                        {property.host.host_type ?? 'Hôte Standard'}
                                    </span>
                                </div>
                                <p className="text-zinc-600 dark:text-zinc-400">
                                    {[
                                        isLongTerm
                                            ? null
                                            : plural(
                                                  property.max_guests,
                                                  'voyageur',
                                              ),
                                        property.bedrooms > 0
                                            ? plural(
                                                  property.bedrooms,
                                                  'chambre',
                                              )
                                            : 'Studio',
                                        property.beds > 0
                                            ? plural(property.beds, 'lit')
                                            : null,
                                        plural(
                                            property.bathrooms,
                                            'salle de bain',
                                            'salles de bain',
                                        ),
                                        isLongTerm
                                            ? `Bail standard min. ${formatLeaseDuration(property.min_lease_months)} renouvelable`
                                            : null,
                                    ]
                                        .filter(Boolean)
                                        .join(' · ')}
                                </p>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setChatOpen(true)}
                                className="flex items-center gap-1.5"
                            >
                                <svg
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                    className="size-4 text-primary-600"
                                    aria-hidden="true"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M10 2c-2.236 0-4.43.18-6.57.524C1.993 2.755 1 4.014 1 5.426v5.148c0 1.413.993 2.67 2.43 2.902.848.137 1.705.248 2.57.331v3.443a.75.75 0 0 0 1.28.53l3.58-3.579a.78.78 0 0 1 .527-.224 41.202 41.202 0 0 0 5.183-.5c1.437-.232 2.43-1.49 2.43-2.903V5.426c0-1.413-.993-2.67-2.43-2.902A41.289 41.289 0 0 0 10 2Z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                                Contacter l’hôte
                            </Button>
                        </div>
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
                                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-sm text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
                                    <p className="font-semibold">
                                        ✓ Logement disponible pour un bail standard 1 an renouvelable.
                                    </p>
                                    <p className="mt-1 text-xs text-emerald-800 dark:text-emerald-400">
                                        Les visites s’effectuent sur rendez-vous via le bouton « Prendre rendez-vous pour une visite » dans le volet ci-contre.
                                    </p>
                                </div>
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

                    {/* Section Hôte avec nom, statut, note 5 étoiles et avis en slide */}
                    <section id="hote" className="flex flex-col gap-6">
                        <div className="flex flex-col gap-5 rounded-3xl border border-zinc-200 bg-white p-6 shadow-xs sm:p-8 dark:border-zinc-800 dark:bg-zinc-900">
                            <div className="flex flex-wrap items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="relative flex size-14 shrink-0 items-center justify-center rounded-full bg-secondary-100 text-xl font-bold text-secondary-800 dark:bg-secondary-900/50 dark:text-secondary-300">
                                        {property.host.name.slice(0, 1).toUpperCase()}
                                        <span
                                            title="Hôte vérifié"
                                            className="absolute -right-1 -bottom-1 flex size-5 items-center justify-center rounded-full bg-primary-600 text-white shadow-xs"
                                        >
                                            <svg
                                                viewBox="0 0 20 20"
                                                fill="currentColor"
                                                className="size-3"
                                                aria-hidden="true"
                                            >
                                                <path
                                                    fillRule="evenodd"
                                                    d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                                                    clipRule="evenodd"
                                                />
                                            </svg>
                                        </span>
                                    </div>
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                                                {property.host.name}
                                            </h3>
                                            <span
                                                className={cn(
                                                    'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
                                                    property.host.host_type === 'Hôte Premium'
                                                        ? 'border border-amber-300 bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-300'
                                                        : property.host.host_type === 'Superhôte'
                                                          ? 'border border-purple-300 bg-purple-100 text-purple-900 dark:bg-purple-950/50 dark:text-purple-300'
                                                          : property.host.host_type === 'Hôte Vérifié'
                                                            ? 'border border-sky-300 bg-sky-100 text-sky-900 dark:bg-sky-950/50 dark:text-sky-300'
                                                            : property.host.host_type === 'Conciergerie Partenaire'
                                                              ? 'border border-emerald-300 bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300'
                                                              : 'border border-zinc-200 bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
                                                )}
                                            >
                                                {property.host.host_type ?? 'Hôte Standard'}
                                            </span>
                                        </div>
                                        <div className="mt-1 flex flex-wrap items-center gap-2.5 text-xs text-zinc-500 dark:text-zinc-400">
                                            {property.host.member_since && (
                                                <span>
                                                    Sur la plateforme depuis{' '}
                                                    {property.host.member_since_formatted ??
                                                        property.host.member_since}
                                                </span>
                                            )}
                                            <span>·</span>
                                            <div className="flex items-center gap-1 font-semibold text-zinc-800 dark:text-zinc-200">
                                                <Stars
                                                    rating={property.host.rating ?? 5}
                                                    className="scale-90"
                                                />
                                                <span>
                                                    {property.host.rating
                                                        ? property.host.rating.toFixed(1)
                                                        : '5.0'}{' '}
                                                    / 5
                                                </span>
                                                <span className="font-normal text-zinc-500">
                                                    ({plural(property.host.reviews_count ?? 0, 'avis')})
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setChatOpen(true)}
                                    className="flex items-center gap-1.5"
                                >
                                    <svg
                                        viewBox="0 0 20 20"
                                        fill="currentColor"
                                        className="size-4 text-primary-600"
                                        aria-hidden="true"
                                    >
                                        <path
                                            fillRule="evenodd"
                                            d="M10 2c-2.236 0-4.43.18-6.57.524C1.993 2.755 1 4.014 1 5.426v5.148c0 1.413.993 2.67 2.43 2.902.848.137 1.705.248 2.57.331v3.443a.75.75 0 0 0 1.28.53l3.58-3.579a.78.78 0 0 1 .527-.224 41.202 41.202 0 0 0 5.183-.5c1.437-.232 2.43-1.49 2.43-2.903V5.426c0-1.413-.993-2.67-2.43-2.902A41.289 41.289 0 0 0 10 2Z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                    Contacter l’hôte
                                </Button>
                            </div>

                            {/* Slider des avis relatifs à cet hôte */}
                            <div className="mt-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                                <h4 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                    Avis relatifs à cet hôte
                                </h4>
                                <HostReviewsSlider
                                    hostName={property.host.name}
                                    reviews={property.host.reviews ?? []}
                                />
                            </div>
                        </div>
                    </section>

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
                        serviceFeeRate={serviceFeeRate}
                        rentalSettings={rentalSettings}
                        enabledMethods={enabledMethods}
                        onClear={() =>
                            setStay({ checkIn: null, checkOut: null })
                        }
                        onOpenChat={() => setChatOpen(true)}
                    />
                </aside>
            </div>

            <PropertyInquiryChatDrawer
                open={chatOpen}
                onClose={() => setChatOpen(false)}
                propertySlug={property.slug}
                propertyTitle={property.title}
                hostName={property.host.name}
                isViewerAuthenticated={isViewerAuthenticated}
            />
        </Container>
    );
}

