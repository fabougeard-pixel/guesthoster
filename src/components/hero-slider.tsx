'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Container } from '@/components/card';
import { SearchBar } from '@/components/search-bar';
import { cn } from '@/lib/utils';

export type HeroSlide = {
    id: string;
    badge: string;
    title: string;
    subtitle: string;
    image?: string;
    imageAlt?: string;
    ctaLabel: string;
    ctaHref: string;
};

/**
 * Pour activer la photo du 2e slide (location longue durée),
 * ajoutez simplement `image: '/images/hero/votre-deuxieme-image.jpg'` sur le slide `long-term`.
 */
export const HERO_SLIDES: HeroSlide[] = [
    {
        id: 'short-term',
        badge: 'Location courte durée · Séjours & week-ends',
        title: 'Trouvez votre séjour idéal',
        subtitle:
            'Des locations de vacances uniques, pour des moments inoubliables.',
        image: '/images/hero/hero-guesthoster.png',
        imageAlt:
            'Villa lumineuse avec piscine à débordement face à la mer au coucher du soleil',
        ctaLabel: 'Explorer les séjours',
        ctaHref: '/logements?rental_duration=short_term',
    },
    {
        id: 'long-term',
        badge: 'Location longue durée · Au mois',
        title: 'Votre prochain chez-vous, en toute sérénité',
        subtitle:
            'Appartements, maisons et chalets à louer au mois avec loyer, charges et caution calculés clairement en ligne.',
        ctaLabel: 'Découvrir la longue durée',
        ctaHref: '/logements?rental_duration=long_term',
    },
];

const QUICK_LINKS = [
    { label: 'Appartements', href: '/logements?types[]=appartement' },
    { label: 'Chalets', href: '/logements?types[]=chalet' },
    { label: 'Longue durée', href: '/logements?rental_duration=long_term' },
    { label: 'Toutes les annonces', href: '/logements' },
];

export function HeroSlider({
    destinations,
    slides = HERO_SLIDES,
}: {
    destinations: string[];
    slides?: HeroSlide[];
}) {
    const [activeIndex, setActiveIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const total = slides.length;

    useEffect(() => {
        if (total <= 1 || isPaused) {
            return;
        }
        const timer = setInterval(() => {
            setActiveIndex((prev) => (prev + 1) % total);
        }, 6500);

        return () => clearInterval(timer);
    }, [total, isPaused]);

    const current = slides[activeIndex] ?? slides[0];

    function goPrev() {
        setActiveIndex((prev) => (prev - 1 + total) % total);
    }

    function goNext() {
        setActiveIndex((prev) => (prev + 1) % total);
    }

    return (
        <section
            aria-roledescription="carousel"
            aria-label="Présentation GuestHoster"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onFocusCapture={() => setIsPaused(true)}
            onBlurCapture={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) {
                    setIsPaused(false);
                }
            }}
            className="relative flex min-h-[500px] items-center overflow-hidden bg-zinc-100 sm:min-h-[540px] lg:min-h-[570px]"
        >
            {/* Arrière-plan des slides (images + voile lisible à gauche) */}
            {slides.map((slide, index) => {
                const isActive = index === activeIndex;
                return (
                    <div
                        key={slide.id}
                        aria-hidden={!isActive}
                        className={cn(
                            'pointer-events-none absolute inset-0 transition-opacity duration-700 ease-out',
                            isActive ? 'opacity-100' : 'opacity-0',
                        )}
                    >
                        {slide.image ? (
                            <>
                                <Image
                                    src={slide.image}
                                    alt={slide.imageAlt ?? ''}
                                    fill
                                    priority={index === 0}
                                    sizes="100vw"
                                    className="object-cover object-right md:object-center"
                                />
                                {/* Dégradé clair sur la gauche pour garantir un contraste net façon maquette */}
                                <div className="absolute inset-0 bg-linear-to-r from-white/92 via-white/75 via-45% to-white/10 sm:from-white/88 sm:via-white/62 sm:via-50% sm:to-transparent" />
                                <div className="absolute inset-0 bg-linear-to-t from-black/20 via-transparent to-white/25" />
                            </>
                        ) : (
                            /* Visuel de secours élégant aux couleurs GuestHoster en attendant la 2e photo */
                            <div className="relative size-full bg-linear-to-br from-white via-secondary-50 to-primary-100/80">
                                <div className="absolute -top-24 -right-20 size-[32rem] rounded-full bg-primary-400/20 blur-3xl" />
                                <div className="absolute -bottom-24 left-1/3 size-[28rem] rounded-full bg-secondary-500/15 blur-3xl" />
                                <div className="absolute top-12 right-8 hidden max-w-xs rounded-2xl border border-secondary-200/70 bg-white/80 p-5 shadow-lg backdrop-blur-md lg:block">
                                    <p className="text-xs font-semibold tracking-wide text-secondary-800 uppercase">
                                        Location longue durée
                                    </p>
                                    <p className="mt-1 text-sm font-semibold text-zinc-900">
                                        Loyer · Charges · Caution
                                    </p>
                                    <p className="mt-1 text-xs text-zinc-600">
                                        Tout est calculé automatiquement avant
                                        votre réservation en ligne.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}

            {/* Contenu principal + barre de recherche fixe */}
            <Container className="relative z-10 py-14 sm:py-16 lg:py-20">
                <div className="max-w-xl sm:min-h-[11.5rem]">
                    <span className="inline-flex items-center rounded-full border border-secondary-200/80 bg-white/85 px-3 py-1 text-xs font-semibold tracking-wide text-secondary-800 shadow-xs backdrop-blur-sm">
                        {current.badge}
                    </span>
                    <h1 className="mt-4 text-4xl font-bold tracking-tight text-balance text-secondary-950 sm:text-5xl lg:text-[3.4rem] lg:leading-[1.08]">
                        {current.title}
                    </h1>
                    <p className="mt-4 max-w-lg text-base font-medium text-secondary-950/85 sm:text-lg">
                        {current.subtitle}
                    </p>
                </div>

                <SearchBar
                    variant="pill"
                    destinations={destinations}
                    className="mt-8 max-w-4xl"
                />

                <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                        {QUICK_LINKS.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="rounded-full border border-white/60 bg-white/85 px-3.5 py-1.5 font-medium text-secondary-950 shadow-xs backdrop-blur-sm transition hover:border-primary-500 hover:bg-primary-500 hover:text-white"
                            >
                                {item.label}
                            </Link>
                        ))}
                    </div>

                    {total > 1 && (
                        <div className="flex items-center gap-2 rounded-full border border-white/60 bg-white/85 px-2.5 py-1.5 shadow-xs backdrop-blur-sm">
                            <button
                                type="button"
                                onClick={goPrev}
                                aria-label="Slide précédente"
                                className="flex size-7 items-center justify-center rounded-full text-secondary-900 transition hover:bg-secondary-100"
                            >
                                <svg
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                    className="size-4"
                                    aria-hidden="true"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                            </button>

                            <div className="flex items-center gap-1.5">
                                {slides.map((slide, index) => {
                                    const active = index === activeIndex;
                                    return (
                                        <button
                                            key={slide.id}
                                            type="button"
                                            onClick={() =>
                                                setActiveIndex(index)
                                            }
                                            aria-label={`Afficher le slide ${index + 1} : ${slide.title}`}
                                            aria-current={active}
                                            className={cn(
                                                'h-2 rounded-full transition-all',
                                                active
                                                    ? 'w-6 bg-primary-500'
                                                    : 'w-2 bg-secondary-900/30 hover:bg-secondary-900/60',
                                            )}
                                        />
                                    );
                                })}
                            </div>

                            <button
                                type="button"
                                onClick={goNext}
                                aria-label="Slide suivante"
                                className="flex size-7 items-center justify-center rounded-full text-secondary-900 transition hover:bg-secondary-100"
                            >
                                <svg
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                    className="size-4"
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
                    )}
                </div>
            </Container>
        </section>
    );
}

