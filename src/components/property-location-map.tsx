'use client';

import { useState } from 'react';
import type { PropertyDetail } from '@/types';
import { cn } from '@/lib/utils';

export function PropertyLocationMap({
    property,
    className,
}: {
    property: PropertyDetail;
    className?: string;
}) {
    const [zoom, setZoom] = useState(14);

    const lat = property.location?.lat;
    const lng = property.location?.lng;

    // Calcul de la requête pour Google Maps : coordonnées si dispo, sinon adresse + ville + pays
    const locationQuery =
        lat !== undefined && lng !== undefined
            ? `${lat},${lng}`
            : [property.address, property.city, property.country]
                  .filter(Boolean)
                  .join(', ');

    const encodedQuery = encodeURIComponent(locationQuery || 'Paris, France');

    // URLs d'action
    const embedUrl = `https://maps.google.com/maps?q=${encodedQuery}&t=m&z=${zoom}&output=embed&iwloc=near`;
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedQuery}`;
    const nearbyRestaurantsUrl =
        lat !== undefined && lng !== undefined
            ? `https://www.google.com/maps/search/restaurants/@${lat},${lng},15z`
            : `https://www.google.com/maps/search/restaurants+${encodedQuery}`;

    function handleZoomIn() {
        setZoom((prev) => Math.min(18, prev + 1));
    }

    function handleZoomOut() {
        setZoom((prev) => Math.max(10, prev - 1));
    }

    return (
        <div className={cn('flex flex-col gap-4', className)}>
            {/* Conteneur principal de la carte interactive */}
            <div className="group relative h-[380px] w-full overflow-hidden rounded-3xl border border-zinc-200/90 bg-zinc-100 shadow-sm sm:h-[460px] dark:border-zinc-800 dark:bg-zinc-850">
                {/* 1. Iframe Google Maps */}
                <iframe
                    key={`gmap-${zoom}-${encodedQuery}`}
                    title={`Carte de localisation - ${property.title}`}
                    src={embedUrl}
                    className="h-full w-full border-0 grayscale-[15%] transition-all duration-300 dark:brightness-90 dark:contrast-105"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                />

                {/* 2. Marqueur central personnalisé (Style Airbnb / Capture utilisateur) */}
                <div
                    className="pointer-events-none absolute inset-0 flex items-center justify-center"
                    aria-hidden="true"
                >
                    {/* Halo d'approximation circulaire */}
                    <div className="absolute size-32 rounded-full border border-zinc-900/15 bg-zinc-950/5 shadow-inner sm:size-44 dark:border-white/15 dark:bg-white/5" />

                    {/* Pastille du logement (Cercle noir + Icône maison blanche) */}
                    <div className="relative flex size-12 items-center justify-center rounded-full bg-zinc-950 text-white shadow-2xl ring-4 ring-white sm:size-14 dark:bg-zinc-900 dark:ring-zinc-800">
                        <svg
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            className="size-6 text-white sm:size-7"
                            aria-hidden="true"
                        >
                            {/* Toit et corps de maison avec porte */}
                            <path d="M11.47 2.47a.75.75 0 0 1 1.06 0l9 9a.75.75 0 0 1-1.06 1.06L20 12.06V20.5a1.5 1.5 0 0 1-1.5 1.5h-4.5a.75.75 0 0 1-.75-.75v-5a.75.75 0 0 0-.75-.75h-1a.75.75 0 0 0-.75.75v5a.75.75 0 0 1-.75.75H5.5A1.5 1.5 0 0 1 4 20.5v-8.44l-.47.47a.75.75 0 0 1-1.06-1.06l9-9Z" />
                        </svg>
                    </div>
                </div>

                {/* 3. Bouton flottant haut-gauche : Découvrez les restaurants (comme sur la capture) */}
                <div className="absolute top-4 left-4 z-10 flex items-center">
                    <a
                        href={nearbyRestaurantsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 rounded-full border border-zinc-200/80 bg-white/95 px-4 py-2 text-xs font-semibold text-zinc-800 shadow-md backdrop-blur-xs transition hover:bg-white hover:text-primary-600 hover:shadow-lg dark:border-zinc-700 dark:bg-zinc-900/95 dark:text-zinc-100 dark:hover:text-primary-400"
                    >
                        <svg
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            className="size-3.5 text-zinc-500 dark:text-zinc-400"
                            aria-hidden="true"
                        >
                            <path
                                fillRule="evenodd"
                                d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z"
                                clipRule="evenodd"
                            />
                        </svg>
                        <span>Découvrez les restaurants</span>
                    </a>
                </div>

                {/* 4. Contrôles flottants haut-droite : Agrandir / Plein écran */}
                <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
                    <a
                        href={googleMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Ouvrir dans Google Maps"
                        className="flex size-9 items-center justify-center rounded-full border border-zinc-200/80 bg-white/95 text-zinc-700 shadow-md backdrop-blur-xs transition hover:bg-white hover:text-primary-600 hover:shadow-lg dark:border-zinc-700 dark:bg-zinc-900/95 dark:text-zinc-200 dark:hover:text-primary-400"
                    >
                        <svg
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            className="size-4"
                            aria-hidden="true"
                        >
                            <path
                                fillRule="evenodd"
                                d="M4.25 2A2.25 2.25 0 0 0 2 4.25v2a.75.75 0 0 0 1.5 0v-2a.75.75 0 0 1 .75-.75h2a.75.75 0 0 0 0-1.5h-2ZM13.75 2a.75.75 0 0 0 0 1.5h2a.75.75 0 0 1 .75.75v2a.75.75 0 0 0 1.5 0v-2A2.25 2.25 0 0 0 15.75 2h-2ZM3.5 13.75a.75.75 0 0 0-1.5 0v2A2.25 2.25 0 0 0 4.25 18h2a.75.75 0 0 0 0-1.5h-2a.75.75 0 0 1-.75-.75v-2ZM18 13.75a.75.75 0 0 0-1.5 0v2a.75.75 0 0 1-.75.75h-2a.75.75 0 0 0 0 1.5h2A2.25 2.25 0 0 0 18 15.75v-2Z"
                                clipRule="evenodd"
                            />
                        </svg>
                    </a>
                </div>

                {/* 5. Contrôles de zoom flottants bas-droite (+ / -) */}
                <div className="absolute right-4 bottom-8 z-10 flex flex-col overflow-hidden rounded-xl border border-zinc-200/80 bg-white/95 shadow-md backdrop-blur-xs dark:border-zinc-700 dark:bg-zinc-900/95">
                    <button
                        type="button"
                        onClick={handleZoomIn}
                        title="Zoom avant"
                        disabled={zoom >= 18}
                        className="flex size-9 items-center justify-center text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-40 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                        <span className="text-lg font-bold leading-none">+</span>
                    </button>
                    <div className="h-px w-full bg-zinc-200 dark:bg-zinc-700" />
                    <button
                        type="button"
                        onClick={handleZoomOut}
                        title="Zoom arrière"
                        disabled={zoom <= 10}
                        className="flex size-9 items-center justify-center text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-40 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                        <span className="text-lg font-bold leading-none">−</span>
                    </button>
                </div>
            </div>

            {/* Légende et informations sur le quartier */}
            <div className="flex flex-col gap-1.5 text-sm text-zinc-600 dark:text-zinc-400">
                <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {property.city}, {property.country}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {property.rental_duration === 'long_term'
                        ? 'Idéalement situé au cœur de la ville avec un accès rapide aux transports en commun, commerces et services de proximité. Les créneaux de visite sur place permettent de découvrir l’immeuble et le quartier.'
                        : 'L’emplacement précis et les instructions détaillées pour votre arrivée en autonomie vous seront communiqués dès la confirmation de votre réservation.'}
                </p>
            </div>
        </div>
    );
}
