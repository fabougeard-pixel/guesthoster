'use client';

import Link from 'next/link';
import { buttonClasses } from '@/components/button';
import { Card, Container } from '@/components/card';
import { PropertyCard } from '@/components/property-card';
import { useAppState } from '@/components/providers';
import type { PropertyCard as PropertyCardData } from '@/types';

export function FavoritesClient({
    properties,
}: {
    properties: PropertyCardData[];
}) {
    const { favoriteIds } = useAppState();
    const saved = properties.filter((property) =>
        favoriteIds.includes(property.id),
    );

    return (
        <Container className="py-10">
            <h1 className="text-2xl font-semibold">Mes favoris</h1>

            {saved.length === 0 ? (
                <Card className="mt-8 px-6 py-16 text-center">
                    <p className="font-medium">Aucun favori pour le moment.</p>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        Touchez le cœur d’un logement pour le retrouver ici.
                    </p>
                    <Link
                        href="/logements"
                        className={buttonClasses({ className: 'mt-6' })}
                    >
                        Parcourir les logements
                    </Link>
                </Card>
            ) : (
                <div className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
                    {saved.map((property) => (
                        <PropertyCard key={property.id} property={property} />
                    ))}
                </div>
            )}
        </Container>
    );
}

