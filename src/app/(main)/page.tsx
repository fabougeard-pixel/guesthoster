import type { Metadata } from 'next';
import Link from 'next/link';
import { buttonClasses } from '@/components/button';
import { Badge, Card, Container } from '@/components/card';
import { PropertyCard } from '@/components/property-card';
import { SearchBar } from '@/components/search-bar';
import { serializePropertyCard } from '@/lib/domain/properties';
import { plural } from '@/lib/format';
import { prisma } from '@/lib/prisma';
import type { PropertyCard as PropertyCardData } from '@/types';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Locations courte & longue durée | GuestHoster',
    description:
        'GuestHoster : appartements, chalets et locations longue durée en France et à l’international, avec paiement sécurisé en ligne.',
};

const travelerSteps = [
    {
        title: 'Trouvez le logement idéal',
        description:
            'Filtrez par destination, formule courte ou longue durée, type de bien et budget.',
    },
    {
        title: 'Transparence tarifaire totale',
        description:
            'Tarif à la nuitée ou détail complet loyer, charges et caution sans frais cachés.',
    },
    {
        title: 'Réservation & paiement sécurisés',
        description:
            'Réservation instantanée ou sur validation, et messagerie directe avec votre hôte.',
    },
];

const hostSteps = [
    {
        title: 'Publiez votre bien en autonomie',
        description:
            'Courte durée ou longue durée, taxonomie personnalisable, photos avec couverture et galerie.',
    },
    {
        title: 'Pilotez vos conditions',
        description:
            'Fixez loyer, caution hors charges, mois d’avance ou tarifs à la nuitée selon vos besoins.',
    },
    {
        title: 'Gestion simplifiée & conciergerie',
        description:
            'Gérez directement vos annonces ou confiez l’exploitation en conciergerie depuis votre espace.',
    },
];

const trustPillars = [
    {
        badge: 'Séjours & Baux',
        tone: 'primary' as const,
        title: 'Courte & longue durée au même endroit',
        description:
            'Passez d’une escapade de quelques nuits à une location mensuelle avec loyer, charges et caution clairement calculés.',
    },
    {
        badge: 'Paiement en ligne',
        tone: 'secondary' as const,
        title: 'Transactions protégées par Stripe',
        description:
            'Règlement du séjour ou du montant d’entrée en ligne, avec suivi complet depuis votre espace.',
    },
    {
        badge: 'Propriétaires & Conciergerie',
        tone: 'primary' as const,
        title: 'Pensé pour les propriétaires exigeants',
        description:
            'Validation de chaque annonce, calendrier de disponibilités et accompagnement dédié.',
    },
];

function StepList({
    heading,
    accent,
    steps,
}: {
    heading: string;
    accent: 'primary' | 'secondary';
    steps: { title: string; description: string }[];
}) {
    const circleClass =
        accent === 'secondary'
            ? 'bg-secondary-50 text-secondary-800 dark:bg-secondary-950 dark:text-secondary-200'
            : 'bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300';

    return (
        <Card className="p-6 sm:p-8">
            <h2 className="text-xl font-semibold">{heading}</h2>
            <ol className="mt-6 flex flex-col gap-5">
                {steps.map((step, index) => (
                    <li key={step.title} className="flex gap-4">
                        <span
                            className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${circleClass}`}
                        >
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

function ShowcaseSection({
    id,
    badge,
    badgeTone,
    title,
    description,
    viewAllHref,
    viewAllLabel,
    items,
    emptyTitle,
    emptyDescription,
    className = '',
}: {
    id: string;
    badge: string;
    badgeTone: 'primary' | 'secondary';
    title: string;
    description: string;
    viewAllHref: string;
    viewAllLabel: string;
    items: PropertyCardData[];
    emptyTitle: string;
    emptyDescription: string;
    className?: string;
}) {
    return (
        <section id={id} className={className} aria-labelledby={`${id}-heading`}>
            <Container className="py-12">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="max-w-2xl">
                        <Badge tone={badgeTone}>{badge}</Badge>
                        <h2
                            id={`${id}-heading`}
                            className="mt-2 text-2xl font-semibold sm:text-3xl"
                        >
                            {title}
                        </h2>
                        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                            {description}
                        </p>
                    </div>
                    <Link
                        href={viewAllHref}
                        className={buttonClasses({
                            variant: 'outline',
                            size: 'sm',
                        })}
                    >
                        {viewAllLabel}
                    </Link>
                </div>

                {items.length > 0 ? (
                    <div className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
                        {items.map((property) => (
                            <PropertyCard
                                key={property.id}
                                property={property}
                            />
                        ))}
                    </div>
                ) : (
                    <Card className="mt-8 flex flex-col items-start justify-between gap-6 border-dashed p-6 sm:flex-row sm:items-center sm:p-8">
                        <div className="max-w-xl">
                            <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                                {emptyTitle}
                            </p>
                            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                                {emptyDescription}
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            <Link
                                href={viewAllHref}
                                className={buttonClasses({
                                    variant: 'outline',
                                    size: 'sm',
                                })}
                            >
                                Explorer le catalogue
                            </Link>
                            <Link
                                href="/hote/logements/nouveau"
                                className={buttonClasses({ size: 'sm' })}
                            >
                                Proposer un bien
                            </Link>
                        </div>
                    </Card>
                )}
            </Container>
        </section>
    );
}

const publishedWhere = {
    status: 'published',
    owner: { is: { suspendedAt: null } },
} as const;

const publishedInclude = {
    city: { include: { country: true } },
    propertyType: true,
    images: {
        where: { processedAt: { not: null } },
        orderBy: { position: 'asc' as const },
        take: 1,
    },
};

export default async function HomePage() {
    let activeCities;
    let apartmentRows;
    let chaletRows;
    let longTermRows;
    let latestRows;

    try {
        [activeCities, apartmentRows, chaletRows, longTermRows, latestRows] =
            await Promise.all([
                prisma.city.findMany({
                    where: { isActive: true },
                    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
                    include: {
                        country: { select: { name: true } },
                        properties: {
                            where: publishedWhere,
                            select: { id: true },
                        },
                    },
                }),
                prisma.property.findMany({
                    where: {
                        ...publishedWhere,
                        propertyType: { is: { slug: 'appartement' } },
                    },
                    include: publishedInclude,
                    orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
                    take: 4,
                }),
                prisma.property.findMany({
                    where: {
                        ...publishedWhere,
                        propertyType: { is: { slug: 'chalet' } },
                    },
                    include: publishedInclude,
                    orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
                    take: 4,
                }),
                prisma.property.findMany({
                    where: {
                        ...publishedWhere,
                        rentalDuration: 'long_term',
                    },
                    include: publishedInclude,
                    orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
                    take: 4,
                }),
                prisma.property.findMany({
                    where: publishedWhere,
                    include: publishedInclude,
                    orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
                    take: 8,
                }),
            ]);
    } catch (error) {
        console.error('[HomePage] Database query failed:', error);
        throw error;
    }

    const destinations = activeCities.map((city) => city.name);
    const featuredCities = activeCities
        .map((city) => ({
            name: city.name,
            country: city.country.name,
            isPopular: city.isPopular,
            sortOrder: city.sortOrder,
            listings: city.properties.length,
        }))
        .sort(
            (a, b) =>
                b.listings - a.listings ||
                Number(b.isPopular) - Number(a.isPopular) ||
                a.sortOrder - b.sortOrder ||
                a.name.localeCompare(b.name),
        )
        .slice(0, 8);

    const apartments = apartmentRows.map(serializePropertyCard);
    const chalets = chaletRows.map(serializePropertyCard);
    const longTermProperties = longTermRows.map(serializePropertyCard);
    const latestProperties = latestRows.map(serializePropertyCard);

    return (
        <>
            <section className="relative overflow-hidden bg-linear-to-br from-secondary-800 via-secondary-900 to-secondary-950 text-white">
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -top-24 -right-24 size-96 rounded-full bg-primary-500/20 blur-3xl"
                />
                <Container className="relative py-16 sm:py-24">
                    <span className="inline-flex items-center rounded-full border border-primary-400/30 bg-primary-500/15 px-3 py-1 text-xs font-semibold tracking-wide text-primary-200 uppercase">
                        Séjours & locations longue durée
                    </span>
                    <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
                        Appartements, chalets et locations longue durée en
                        quelques clics.
                    </h1>
                    <p className="mt-5 max-w-2xl text-lg text-secondary-100">
                        Réservez votre prochain séjour à la nuitée ou louez au
                        mois en toute transparence. Propriétaires : gérez vos
                        biens ou confiez-les en conciergerie.
                    </p>
                    <SearchBar destinations={destinations} className="mt-10" />

                    <div className="mt-6 flex flex-wrap items-center gap-2 text-sm">
                        <span className="text-secondary-200">
                            Accès rapide :
                        </span>
                        <Link
                            href="/logements?types[]=appartement"
                            className="rounded-full border border-white/20 bg-white/10 px-3.5 py-1 font-medium text-white transition hover:border-primary-400 hover:bg-primary-500"
                        >
                            Appartements
                        </Link>
                        <Link
                            href="/logements?types[]=chalet"
                            className="rounded-full border border-white/20 bg-white/10 px-3.5 py-1 font-medium text-white transition hover:border-primary-400 hover:bg-primary-500"
                        >
                            Chalets
                        </Link>
                        <Link
                            href="/logements?rental_duration=long_term"
                            className="rounded-full border border-white/20 bg-white/10 px-3.5 py-1 font-medium text-white transition hover:border-primary-400 hover:bg-primary-500"
                        >
                            Locations longue durée
                        </Link>
                        <Link
                            href="/logements"
                            className="rounded-full border border-white/20 bg-white/10 px-3.5 py-1 font-medium text-white transition hover:border-primary-400 hover:bg-primary-500"
                        >
                            Toutes les annonces
                        </Link>
                    </div>
                </Container>
            </section>

            {featuredCities.length > 0 && (
                <section
                    className="border-b border-zinc-200 bg-zinc-50/70 dark:border-zinc-800 dark:bg-zinc-900/40"
                    aria-labelledby="destinations-heading"
                >
                    <Container className="py-12">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                            <div>
                                <Badge tone="primary">Destinations</Badge>
                                <h2
                                    id="destinations-heading"
                                    className="mt-2 text-2xl font-semibold sm:text-3xl"
                                >
                                    Destinations incontournables
                                </h2>
                                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                                    Explorez nos villes actives en court séjour
                                    comme en location longue durée.
                                </p>
                            </div>
                            <Link
                                href="/logements"
                                className={buttonClasses({
                                    variant: 'outline',
                                    size: 'sm',
                                })}
                            >
                                Voir tout le catalogue
                            </Link>
                        </div>
                        <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                            {featuredCities.map((city) => (
                                <li key={city.name}>
                                    <Link
                                        href={`/logements?destination=${encodeURIComponent(city.name)}`}
                                        className="group flex flex-col justify-between gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-4 shadow-xs transition hover:border-primary-400 hover:bg-primary-50/40 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-primary-700 dark:hover:bg-primary-950/40"
                                    >
                                        <div>
                                            <span className="font-semibold text-zinc-900 group-hover:text-primary-600 dark:text-zinc-100 dark:group-hover:text-primary-400">
                                                {city.name}
                                            </span>
                                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                                {city.country}
                                            </p>
                                        </div>
                                        <span className="text-xs font-medium text-secondary-700 dark:text-secondary-300">
                                            {city.listings > 0
                                                ? plural(
                                                      city.listings,
                                                      'logement',
                                                  )
                                                : 'Découvrir les annonces'}
                                        </span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </Container>
                </section>
            )}

            <ShowcaseSection
                id="appartements"
                badge="Urbain & Confort"
                badgeTone="primary"
                title="Appartements sélectionnés"
                description="Studios modernes, appartements familiaux et pieds-à-terre équipés en centre-ville."
                viewAllHref="/logements?types[]=appartement"
                viewAllLabel="Tous les appartements"
                items={apartments}
                emptyTitle="Vos appartements bientôt à l’affiche"
                emptyDescription="Aucun appartement publié pour le moment. Explorez le catalogue ou déposez votre annonce en quelques minutes."
            />

            <ShowcaseSection
                id="chalets"
                badge="Nature & Évasion"
                badgeTone="secondary"
                title="Chalets d’exception"
                description="Des refuges chaleureux à la montagne ou au vert, pour se ressourcer en toute saison."
                viewAllHref="/logements?types[]=chalet"
                viewAllLabel="Tous les chalets"
                items={chalets}
                emptyTitle="Des chalets recherchés toute l’année"
                emptyDescription="Vous possédez un chalet ? Publiez-le sur GuestHoster en courte ou longue durée."
                className="border-y border-zinc-200 bg-secondary-50/35 dark:border-zinc-800 dark:bg-secondary-950/25"
            />

            <ShowcaseSection
                id="longue-duree"
                badge="Bail & Sérénité"
                badgeTone="secondary"
                title="Locations longue durée"
                description="Loyer mensuel clair, caution sans charges, charges comprises ou détaillées et premier règlement en ligne."
                viewAllHref="/logements?rental_duration=long_term"
                viewAllLabel="Toutes les longues durées"
                items={longTermProperties}
                emptyTitle="Louez au mois avec paiement sécurisé à l’entrée"
                emptyDescription="Propriétaires : définissez loyer, caution, mois d’avance (1, 2 mois ou plus) et mode de charges en toute flexibilité."
            />

            {latestProperties.length > 0 && (
                <Container className="border-t border-zinc-200 py-12 dark:border-zinc-800">
                    <div className="flex items-end justify-between gap-4">
                        <div>
                            <Badge tone="primary">À découvrir</Badge>
                            <h2 className="mt-2 text-2xl font-semibold">
                                Nouveaux logements
                            </h2>
                        </div>
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

            <section className="border-t border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
                <Container className="py-16">
                    <div className="max-w-2xl">
                        <Badge tone="primary">Plateforme tout-en-un</Badge>
                        <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">
                            Une expérience maîtrisée du premier clic à la remise
                            des clés
                        </h2>
                    </div>
                    <div className="mt-8 grid gap-6 md:grid-cols-3">
                        {trustPillars.map((pillar) => (
                            <Card key={pillar.title} className="p-6">
                                <Badge tone={pillar.tone}>{pillar.badge}</Badge>
                                <h3 className="mt-3 text-lg font-semibold">
                                    {pillar.title}
                                </h3>
                                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                                    {pillar.description}
                                </p>
                            </Card>
                        ))}
                    </div>

                    <div className="mt-10 grid gap-6 md:grid-cols-2">
                        <StepList
                            heading="Pour les voyageurs & locataires"
                            accent="primary"
                            steps={travelerSteps}
                        />
                        <StepList
                            heading="Pour les propriétaires & hôtes"
                            accent="secondary"
                            steps={hostSteps}
                        />
                    </div>
                </Container>
            </section>

            <Container className="py-14">
                <div className="flex flex-col items-start justify-between gap-6 rounded-3xl bg-linear-to-r from-secondary-800 via-secondary-900 to-secondary-950 p-8 text-white sm:flex-row sm:items-center sm:p-10">
                    <div className="max-w-xl">
                        <p className="text-xs font-semibold tracking-wider text-primary-300 uppercase">
                            Propriétaires & Conciergerie
                        </p>
                        <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">
                            Prêt à publier votre appartement, maison, gîte ou
                            chalet ?
                        </h2>
                        <p className="mt-2 text-sm text-secondary-100">
                            Choisissez entre location courte durée à la nuitée
                            ou location longue durée au mois, en gestion directe
                            ou en conciergerie.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <Link
                            href="/hote/logements/nouveau"
                            className={buttonClasses({ size: 'lg' })}
                        >
                            Déposer une annonce
                        </Link>
                        <Link
                            href="/logements"
                            className={buttonClasses({
                                variant: 'outline',
                                size: 'lg',
                                className:
                                    'border-white/30 bg-white/10 text-white hover:bg-white/20',
                            })}
                        >
                            Voir les biens
                        </Link>
                    </div>
                </div>
            </Container>
        </>
    );
}

