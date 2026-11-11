import type { Metadata } from 'next';
import Link from 'next/link';
import { buttonClasses } from '@/components/button';
import { Card, Container } from '@/components/card';
import { PropertyCard } from '@/components/property-card';
import { SearchBar } from '@/components/search-bar';
import { serializePropertyCard } from '@/lib/domain/properties';
import { plural } from '@/lib/format';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Locations de logements entre particuliers | GuestHoster',
    description:
        'GuestHoster : trouvez et réservez un logement chez l’habitant, ou proposez le vôtre.',
};

const travelerSteps = [
    {
        title: 'Trouvez le bon logement',
        description: 'Filtrez par ville, dates, nombre de voyageurs et budget.',
    },
    {
        title: 'Réservez en toute confiance',
        description:
            'Réservation instantanée ou sur demande, avec paiement sécurisé.',
    },
    {
        title: 'Échangez avec votre hôte',
        description: 'Une messagerie dédiée à chaque séjour, en temps réel.',
    },
];

const hostSteps = [
    {
        title: 'Publiez votre logement',
        description: 'Photos, équipements, tarifs et disponibilités.',
    },
    {
        title: 'Gardez la main',
        description:
            'Choisissez la réservation instantanée ou validez chaque demande.',
    },
    {
        title: 'Recevez vos paiements',
        description: 'Suivez vos réservations et vos revenus au même endroit.',
    },
];

function StepList({
    heading,
    steps,
}: {
    heading: string;
    steps: { title: string; description: string }[];
}) {
    return (
        <Card className="p-6 sm:p-8">
            <h2 className="text-xl font-semibold">{heading}</h2>
            <ol className="mt-6 flex flex-col gap-5">
                {steps.map((step, index) => (
                    <li key={step.title} className="flex gap-4">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-50 text-sm font-semibold text-primary-700 dark:bg-primary-950 dark:text-primary-300">
                            {index + 1}
                        </span>
                        <div>
                            <h3 className="font-medium">{step.title}</h3>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                {step.description}
                            </p>
                        </div>
                    </li>
                ))}
            </ol>
        </Card>
    );
}

export default async function HomePage() {
    let activeCities;
    let latestRows;

    try {
        [activeCities, latestRows] = await Promise.all([
            prisma.city.findMany({
                where: { isActive: true },
                orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
                include: {
                    country: { select: { name: true } },
                    properties: {
                        where: {
                            status: 'published',
                            owner: { is: { suspendedAt: null } },
                        },
                        select: { id: true },
                    },
                },
            }),
            prisma.property.findMany({
                where: {
                    status: 'published',
                    owner: { is: { suspendedAt: null } },
                },
                include: {
                    city: { include: { country: true } },
                    propertyType: true,
                    images: {
                        where: { processedAt: { not: null } },
                        orderBy: { position: 'asc' },
                        take: 1,
                    },
                },
                orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
                take: 8,
            }),
        ]);
    } catch (error) {
        console.error('[HomePage] Database query failed:', error);
        throw error;
    }

    const destinations = activeCities.map((city) => city.name);
    const popularCities = activeCities
        .map((city) => ({
            name: city.name,
            country: city.country.name,
            listings: city.properties.length,
        }))
        .filter((city) => city.listings > 0)
        .sort((a, b) => b.listings - a.listings || a.name.localeCompare(b.name))
        .slice(0, 8);

    const latestProperties = latestRows.map(serializePropertyCard);

    return (
        <>
            <section className="bg-linear-to-br from-secondary-800 via-secondary-900 to-secondary-950 text-white">
                <Container className="py-20 sm:py-28">
                    <p className="text-sm font-semibold tracking-wide text-primary-300 uppercase">
                        Bienvenue chez GuestHoster
                    </p>
                    <h1 className="mt-3 max-w-2xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
                        Des séjours chez l’habitant, réservés en quelques clics.
                    </h1>
                    <p className="mt-6 max-w-xl text-lg text-secondary-100">
                        Que vous partiez en voyage ou que vous ouvriez votre
                        porte, GuestHoster simplifie chaque étape.
                    </p>
                    <SearchBar destinations={destinations} className="mt-10" />
                </Container>
            </section>

            {popularCities.length > 0 && (
                <Container className="pt-16">
                    <h2 className="text-2xl font-semibold">
                        Destinations populaires
                    </h2>
                    <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {popularCities.map((city) => (
                            <li key={city.name}>
                                <Link
                                    href={`/logements?destination=${encodeURIComponent(city.name)}`}
                                    className="flex flex-col rounded-xl border border-zinc-200 px-4 py-3 transition-colors hover:border-primary-300 hover:bg-primary-50 dark:border-zinc-800 dark:hover:border-primary-800 dark:hover:bg-primary-950"
                                >
                                    <span className="font-medium">
                                        {city.name}
                                    </span>
                                    <span className="text-sm text-zinc-500 dark:text-zinc-400">
                                        {city.country} ·{' '}
                                        {plural(city.listings, 'logement')}
                                    </span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </Container>
            )}

            {latestProperties.length > 0 && (
                <Container className="pt-16">
                    <div className="flex items-end justify-between gap-4">
                        <h2 className="text-2xl font-semibold">
                            Nouveaux logements
                        </h2>
                        <Link
                            href="/logements"
                            className={buttonClasses({
                                variant: 'ghost',
                                size: 'sm',
                            })}
                        >
                            Tout voir
                        </Link>
                    </div>
                    <div className="mt-6 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
                        {latestProperties.map((property) => (
                            <PropertyCard
                                key={property.id}
                                property={property}
                            />
                        ))}
                    </div>
                </Container>
            )}

            <Container className="grid gap-6 py-16 md:grid-cols-2">
                <StepList heading="Pour les voyageurs" steps={travelerSteps} />
                <StepList heading="Pour les hôtes" steps={hostSteps} />
            </Container>
        </>
    );
}

