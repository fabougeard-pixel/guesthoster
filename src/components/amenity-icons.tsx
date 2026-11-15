import React from 'react';

export type CapacityIconType =
    | 'guests'
    | 'bedrooms'
    | 'beds'
    | 'bathrooms'
    | 'lease'
    | 'furnishing';

export function CapacityIcon({
    type,
    className = 'size-4 shrink-0',
}: {
    type: CapacityIconType;
    className?: string;
}) {
    switch (type) {
        case 'guests':
            return (
                <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={className}
                    aria-hidden="true"
                >
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
            );
        case 'bedrooms':
            return (
                <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={className}
                    aria-hidden="true"
                >
                    <path d="M3 21h18" />
                    <path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16" />
                    <path d="M15 12h.01" />
                </svg>
            );
        case 'beds':
            return (
                <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={className}
                    aria-hidden="true"
                >
                    <path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20M6 8v9" />
                </svg>
            );
        case 'bathrooms':
            return (
                <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={className}
                    aria-hidden="true"
                >
                    <path d="M9 6h6a2 2 0 0 1 2 2v1H7V8a2 2 0 0 1 2-2z" />
                    <path d="M4 12h16a1 1 0 0 1 1 1v2a6 6 0 0 1-6 6H9a6 6 0 0 1-6-6v-2a1 1 0 0 1 1-1z" />
                    <path d="M5 21l1-2M19 21l-1-2" />
                </svg>
            );
        case 'furnishing':
            return (
                <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={className}
                    aria-hidden="true"
                >
                    <path d="M20 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v3" />
                    <path d="M2 11a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-7z" />
                    <path d="M4 18v2M20 18v2" />
                </svg>
            );
        case 'lease':
            return (
                <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={className}
                    aria-hidden="true"
                >
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
            );
    }
}

export function AmenityIcon({
    slug,
    name,
    className = 'size-5 shrink-0',
}: {
    slug?: string;
    name?: string;
    className?: string;
}) {
    const key = (slug || name || '').toLowerCase();

    // Jacuzzi / Spa / Bain à remous
    if (key.includes('jacuzzi') || key.includes('spa') || key.includes('remous')) {
        return (
            <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={className}
                aria-hidden="true"
            >
                <path d="M4 12h16a2 2 0 0 1 2 2v2a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5v-2a2 2 0 0 1 2-2Z" />
                <path d="M6 7c0-1.5 1.5-2 1.5-3.5M12 7c0-1.5 1.5-2 1.5-3.5M18 7c0-1.5 1.5-2 1.5-3.5" />
                <path d="M4 16h16" />
            </svg>
        );
    }

    // Sauna
    if (key.includes('sauna') || key.includes('hammam')) {
        return (
            <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={className}
                aria-hidden="true"
            >
                <path d="M4 14h16a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1Z" />
                <path d="M8 7c0-1 1-1.5 1-2.5M12 7c0-1 1-1.5 1-2.5M16 7c0-1 1-1.5 1-2.5" />
                <path d="M4 18h16M7 21h10" />
            </svg>
        );
    }

    // Piscine / Pool
    if (key.includes('pool') || key.includes('piscine') || key.includes('nage')) {
        return (
            <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={className}
                aria-hidden="true"
            >
                <path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
                <path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
                <path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
            </svg>
        );
    }

    // Jeux de société / Board games
    if (key.includes('board-game') || key.includes('societe') || key.includes('société') || key.includes('jeu')) {
        return (
            <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={className}
                aria-hidden="true"
            >
                <rect width="16" height="16" x="4" y="4" rx="3" />
                <circle cx="9" cy="9" r="1.5" fill="currentColor" />
                <circle cx="15" cy="9" r="1.5" fill="currentColor" />
                <circle cx="9" cy="15" r="1.5" fill="currentColor" />
                <circle cx="15" cy="15" r="1.5" fill="currentColor" />
                <circle cx="12" cy="12" r="1.5" fill="currentColor" />
            </svg>
        );
    }

    // Baby-foot / Foosball / Bayfoot
    if (key.includes('foosball') || key.includes('babyfoot') || key.includes('baby-foot') || key.includes('bayfoot')) {
        return (
            <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={className}
                aria-hidden="true"
            >
                <rect width="18" height="14" x="3" y="5" rx="2" />
                <line x1="2" y1="8" x2="22" y2="8" />
                <line x1="2" y1="16" x2="22" y2="16" />
                <circle cx="12" cy="12" r="2.5" />
                <path d="M6 19v3M18 19v3M6 2v3M18 2v3" />
            </svg>
        );
    }

    // Billard / Billiards
    if (key.includes('billiard') || key.includes('billard')) {
        return (
            <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={className}
                aria-hidden="true"
            >
                <circle cx="12" cy="12" r="9" />
                <circle cx="12" cy="12" r="4" />
                <path d="M12 10.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z" />
            </svg>
        );
    }

    // Salle de sport / Fitness
    if (key.includes('fitness') || key.includes('sport') || key.includes('gym')) {
        return (
            <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={className}
                aria-hidden="true"
            >
                <path d="M6 4v16M18 4v16M2 8v8M22 8v8M6 12h12" />
            </svg>
        );
    }

    // Wi-Fi
    if (key.includes('wifi')) {
        return (
            <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={className}
                aria-hidden="true"
            >
                <path d="M5 13a10 10 0 0 1 14 0" />
                <path d="M8.5 16.5a5 5 0 0 1 7 0" />
                <path d="M2 8.82a15 15 0 0 1 20 0" />
                <line x1="12" y1="20" x2="12.01" y2="20" strokeWidth="3" />
            </svg>
        );
    }

    // Climatisation / Air conditioning
    if (key.includes('air-conditioning') || key.includes('clim')) {
        return (
            <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={className}
                aria-hidden="true"
            >
                <line x1="2" y1="12" x2="22" y2="12" />
                <line x1="12" y1="2" x2="12" y2="22" />
                <path d="m20 16-4-4 4-4M4 8l4 4-4 4M16 4l-4 4-4-4M8 20l4-4 4 4" />
            </svg>
        );
    }

    // Chauffage / Heating
    if (key.includes('heating') || key.includes('chauffage')) {
        return (
            <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={className}
                aria-hidden="true"
            >
                <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
            </svg>
        );
    }

    // Télévision / TV
    if (key.includes('tv') || key.includes('télévision') || key.includes('television')) {
        return (
            <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={className}
                aria-hidden="true"
            >
                <rect width="20" height="15" x="2" y="3" rx="2" />
                <line x1="12" y1="18" x2="12" y2="21" />
                <line x1="7" y1="21" x2="17" y2="21" />
            </svg>
        );
    }

    // Lave-linge / Washing machine
    if (key.includes('washing') || key.includes('linge') && key.includes('lave')) {
        return (
            <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={className}
                aria-hidden="true"
            >
                <rect width="18" height="20" x="3" y="2" rx="2" />
                <circle cx="12" cy="13" r="5" />
                <path d="M12 18a5 5 0 0 0 5-5" />
                <line x1="7" y1="6" x2="7.01" y2="6" strokeWidth="2.5" />
                <line x1="11" y1="6" x2="11.01" y2="6" strokeWidth="2.5" />
            </svg>
        );
    }

    // Linge de maison / Linen
    if (key.includes('linen') || key.includes('drap') || key.includes('linge')) {
        return (
            <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={className}
                aria-hidden="true"
            >
                <path d="M2 17h20M2 12h20M2 7h20" />
                <path d="M2 7a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2" />
                <path d="M2 17a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2" />
            </svg>
        );
    }

    // Espace de travail / Workspace
    if (key.includes('workspace') || key.includes('travail') || key.includes('bureau')) {
        return (
            <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={className}
                aria-hidden="true"
            >
                <rect width="18" height="12" x="3" y="4" rx="2" />
                <line x1="2" x2="22" y1="20" y2="20" />
            </svg>
        );
    }

    // Cuisine équipée / Kitchen
    if (key.includes('kitchen') || key.includes('cuisine')) {
        return (
            <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={className}
                aria-hidden="true"
            >
                <path d="M4 10h16a1 1 0 0 1 1 1v6a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4v-6a1 1 0 0 1 1-1Z" />
                <path d="M2 10h20M12 4v4M8 5v3M16 5v3" />
            </svg>
        );
    }

    // Lave-vaisselle / Dishwasher
    if (key.includes('dishwasher') || key.includes('vaisselle')) {
        return (
            <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={className}
                aria-hidden="true"
            >
                <rect width="18" height="20" x="3" y="2" rx="2" />
                <line x1="3" y1="7" x2="21" y2="7" />
                <circle cx="12" cy="14" r="4" />
                <line x1="7" y1="5" x2="7.01" y2="5" strokeWidth="2.5" />
            </svg>
        );
    }

    // Machine à café / Coffee
    if (key.includes('coffee') || key.includes('café') || key.includes('cafe')) {
        return (
            <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={className}
                aria-hidden="true"
            >
                <path d="M17 8h1a4 4 0 1 1 0 8h-1M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
                <line x1="6" y1="2" x2="6" y2="4" />
                <line x1="10" y1="2" x2="10" y2="4" />
                <line x1="14" y1="2" x2="14" y2="4" />
            </svg>
        );
    }

    // Micro-ondes / Microwave
    if (key.includes('microwave') || key.includes('micro-ondes') || key.includes('ondes')) {
        return (
            <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={className}
                aria-hidden="true"
            >
                <rect width="20" height="15" x="2" y="4" rx="2" />
                <rect width="10" height="9" x="5" y="7" rx="1" />
                <line x1="18" y1="8" x2="18.01" y2="8" strokeWidth="2.5" />
                <line x1="18" y1="12" x2="18.01" y2="12" strokeWidth="2.5" />
            </svg>
        );
    }

    // Ascenseur / Elevator
    if (key.includes('elevator') || key.includes('ascenseur')) {
        return (
            <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={className}
                aria-hidden="true"
            >
                <rect width="18" height="20" x="3" y="2" rx="2" />
                <path d="m7 10 2.5-3L12 10M17 14l-2.5 3L12 14" />
            </svg>
        );
    }

    // Animaux acceptés / Pets
    if (key.includes('pet') || key.includes('animal') || key.includes('animaux')) {
        return (
            <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={className}
                aria-hidden="true"
            >
                <circle cx="12" cy="14" r="3" />
                <circle cx="6.5" cy="10.5" r="1.5" />
                <circle cx="10" cy="7.5" r="1.5" />
                <circle cx="14" cy="7.5" r="1.5" />
                <circle cx="17.5" cy="10.5" r="1.5" />
            </svg>
        );
    }

    // Accessible PMR / Disabled
    if (key.includes('accessible') || key.includes('pmr') || key.includes('fauteuil')) {
        return (
            <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={className}
                aria-hidden="true"
            >
                <circle cx="16" cy="4" r="2" />
                <path d="M13.5 8h-3l-1.5 5 4 2v5M6 13a5 5 0 1 0 6 5" />
            </svg>
        );
    }

    // Parking gratuit / Car
    if (key.includes('parking') || key.includes('garage') || key.includes('voiture')) {
        return (
            <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={className}
                aria-hidden="true"
            >
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <path d="M9 17V7h4a3 3 0 0 1 0 6H9" />
            </svg>
        );
    }

    // Balcon ou terrasse / Rooftop
    if (key.includes('balcon') || key.includes('terrasse') || key.includes('rooftop')) {
        return (
            <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={className}
                aria-hidden="true"
            >
                <path d="M3 10h18M3 14h18M3 18h18M5 10v11M9 10v11M15 10v11M19 10v11" />
                <path d="M12 2a4 4 0 0 0-4 4h8a4 4 0 0 0-4-4Z" />
            </svg>
        );
    }

    // Jardin / Garden
    if (key.includes('garden') || key.includes('jardin') || key.includes('parc')) {
        return (
            <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={className}
                aria-hidden="true"
            >
                <path d="M12 22v-7M7 11.5A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 5 5.5c0 2-1 3.5-3 4.5H10c-2-1-3-2.5-3-4.5Z" />
            </svg>
        );
    }

    // Barbecue / BBQ
    if (key.includes('bbq') || key.includes('barbecue') || key.includes('grill')) {
        return (
            <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={className}
                aria-hidden="true"
            >
                <path d="M5 12h14a7 7 0 0 1-14 0ZM7 12 4 21M17 12l3 9M12 12v9M9 5a3 3 0 0 1 6 0M8 8h8" />
            </svg>
        );
    }

    // Détecteur de fumée / Smoke detector
    if (key.includes('smoke') || key.includes('fumee') || key.includes('fumée')) {
        return (
            <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={className}
                aria-hidden="true"
            >
                <circle cx="12" cy="12" r="9" />
                <circle cx="12" cy="12" r="3" />
                <line x1="12" y1="3" x2="12" y2="5" />
                <line x1="12" y1="19" x2="12" y2="21" />
                <line x1="3" y1="12" x2="5" y2="12" />
                <line x1="19" y1="12" x2="21" y2="12" />
            </svg>
        );
    }

    // Trousse de secours / First aid kit
    if (key.includes('first-aid') || key.includes('secours') || key.includes('soins')) {
        return (
            <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={className}
                aria-hidden="true"
            >
                <rect width="18" height="15" x="3" y="6" rx="2" />
                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M12 10v6M9 13h6" />
            </svg>
        );
    }

    // Extincteur / Fire extinguisher
    if (key.includes('fire') || key.includes('extincteur')) {
        return (
            <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={className}
                aria-hidden="true"
            >
                <path d="M15 6.5V3a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v3.5M8 6h8" />
                <path d="M7 9h10v11a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2ZM12 13v4" />
            </svg>
        );
    }

    // Default icon
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            aria-hidden="true"
        >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
    );
}

export type ComfortItem = {
    slug: string;
    name: string;
    badge: string;
    highlight?: boolean;
};

export function getComfortBadge(slug: string, name: string): string {
    const key = (slug + ' ' + name).toLowerCase();
    if (key.includes('jacuzzi') || key.includes('spa') || key.includes('remous')) {
        return 'Spa & Bain à remous chaud';
    }
    if (key.includes('sauna') || key.includes('hammam')) {
        return 'Détente thermique & Détox';
    }
    if (key.includes('pool') || key.includes('piscine') || key.includes('nage')) {
        return 'Baignade & Rafraîchissement';
    }
    if (key.includes('board-game') || key.includes('societe') || key.includes('société')) {
        return 'Jeux conviviaux & Famille';
    }
    if (key.includes('foosball') || key.includes('babyfoot') || key.includes('baby-foot') || key.includes('bayfoot')) {
        return 'Divertissement & Matchs conviviaux';
    }
    if (key.includes('billiard') || key.includes('billard')) {
        return 'Espace loisirs & Précision';
    }
    if (key.includes('fitness') || key.includes('sport') || key.includes('gym')) {
        return 'Espace forme & Bien-être physique';
    }
    if (key.includes('air-conditioning') || key.includes('clim')) {
        return 'Confort thermique & Température idéale';
    }
    if (key.includes('tv') || key.includes('télévision') || key.includes('television')) {
        return 'Divertissement & Séries';
    }
    if (key.includes('balcon') || key.includes('terrasse') || key.includes('rooftop')) {
        return 'Vue & Espace extérieur privatif';
    }
    if (key.includes('garden') || key.includes('jardin')) {
        return 'Nature & Jardin privatif';
    }
    if (key.includes('bbq') || key.includes('barbecue')) {
        return 'Grillades & Moments festifs';
    }
    if (key.includes('pet') || key.includes('animal') || key.includes('animaux')) {
        return 'Vos animaux sont les bienvenus';
    }
    if (key.includes('accessible') || key.includes('pmr')) {
        return 'Logement adapté et accessible';
    }
    if (key.includes('elevator') || key.includes('ascenseur')) {
        return 'Accès facile par ascenseur';
    }
    return 'Équipement de confort premium';
}

/**
 * Extracts and organizes comfort and leisure items from property amenities
 * and property description keywords.
 */
export function extractComfortItems(
    amenities: { category: string; items: { slug: string; name: string }[] }[],
    description?: string,
    title?: string,
): ComfortItem[] {
    const map = new Map<string, ComfortItem>();

    // 1. Direct from amenities
    for (const group of amenities) {
        const cat = group.category.toLowerCase();
        const isComfortGroup = cat.includes('confort') || cat.includes('comfort');

        for (const item of group.items) {
            const key = item.slug.toLowerCase();
            const isComfortSlug =
                isComfortGroup ||
                key.includes('jacuzzi') ||
                key.includes('spa') ||
                key.includes('sauna') ||
                key.includes('pool') ||
                key.includes('piscine') ||
                key.includes('board-game') ||
                key.includes('societe') ||
                key.includes('foosball') ||
                key.includes('babyfoot') ||
                key.includes('bayfoot') ||
                key.includes('billiard') ||
                key.includes('fitness') ||
                key.includes('air-conditioning') ||
                key.includes('tv') ||
                key.includes('balcony') ||
                key.includes('garden') ||
                key.includes('bbq');

            if (isComfortSlug && !map.has(item.slug)) {
                map.set(item.slug, {
                    slug: item.slug,
                    name: item.name,
                    badge: getComfortBadge(item.slug, item.name),
                    highlight:
                        key.includes('jacuzzi') ||
                        key.includes('spa') ||
                        key.includes('sauna') ||
                        key.includes('pool') ||
                        key.includes('piscine') ||
                        key.includes('foosball') ||
                        key.includes('board-game'),
                });
            }
        }
    }

    // 2. Extra check for keywords in description/title if not already present
    const text = `${title ?? ''} ${description ?? ''}`.toLowerCase();
    if (!map.has('jacuzzi') && (text.includes('spa de nage') || text.includes('jacuzzi') || text.includes('bain à remous') || text.includes('spa'))) {
        map.set('jacuzzi', {
            slug: 'jacuzzi',
            name: text.includes('spa de nage') ? 'Spa de nage & Jacuzzi' : 'Jacuzzi / Spa de relaxation',
            badge: 'Détente & Bulles chaudes privatives',
            highlight: true,
        });
    }
    if (!map.has('sauna') && text.includes('sauna')) {
        map.set('sauna', {
            slug: 'sauna',
            name: 'Sauna',
            badge: 'Chaleur relaxante & Détox',
            highlight: true,
        });
    }
    if (!map.has('foosball') && (text.includes('baby-foot') || text.includes('babyfoot') || text.includes('bayfoot'))) {
        map.set('foosball', {
            slug: 'foosball',
            name: 'Baby-foot',
            badge: 'Divertissement & Défis conviviaux',
            highlight: true,
        });
    }
    if (!map.has('board-games') && (text.includes('jeux de société') || text.includes('jeux de societe'))) {
        map.set('board-games', {
            slug: 'board-games',
            name: 'Jeux de société',
            badge: 'Moments conviviaux en famille',
            highlight: true,
        });
    }

    return Array.from(map.values());
}
