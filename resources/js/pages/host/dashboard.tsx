import { Head, Link } from '@inertiajs/react';
import { buttonClasses } from '@/components/button';
import { Card } from '@/components/card';
import { PropertyStatusBadge } from '@/components/status-badge';
import { formatPrice, plural } from '@/lib/format';
import { calendar, create, edit } from '@/routes/host/properties';
import type { HostPropertySummary } from '@/types';

type Props = {
    properties: HostPropertySummary[];
    stats: {
        published: number;
        pending: number;
        drafts: number;
        upcoming_bookings: number;
    };
};

export default function HostDashboard({ properties, stats }: Props) {
    const tiles = [
        { label: 'En ligne', value: stats.published },
        { label: 'En validation', value: stats.pending },
        { label: 'Brouillons à compléter', value: stats.drafts },
        { label: 'Séjours à venir', value: stats.upcoming_bookings },
    ];

    return (
        <>
            <Head title="Mes logements" />
            <div className="flex flex-wrap items-center justify-between gap-4">
                <h1 className="text-2xl font-semibold">Mes logements</h1>
                <Link href={create()} className={buttonClasses()}>
                    Ajouter un logement
                </Link>
            </div>

            <dl className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
                {tiles.map((tile) => (
                    <Card key={tile.label} className="p-5">
                        <dt className="text-sm text-zinc-500 dark:text-zinc-400">
                            {tile.label}
                        </dt>
                        <dd className="mt-1 text-3xl font-semibold">
                            {tile.value}
                        </dd>
                    </Card>
                ))}
            </dl>

            {properties.length === 0 ? (
                <Card className="mt-8 px-6 py-16 text-center">
                    <p className="font-medium">
                        Vous n’avez pas encore de logement.
                    </p>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        Décrivez votre logement en quelques étapes, nous le
                        validons puis il apparaît dans les recherches.
                    </p>
                    <Link
                        href={create()}
                        className={buttonClasses({ className: 'mt-6' })}
                    >
                        Créer mon premier logement
                    </Link>
                </Card>
            ) : (
                <ul className="mt-8 flex flex-col gap-4">
                    {properties.map((property) => (
                        <li key={property.id}>
                            <Card className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                                <div className="aspect-4/3 w-full shrink-0 overflow-hidden rounded-xl bg-zinc-100 sm:w-36 dark:bg-zinc-800">
                                    {property.cover_url && (
                                        <img
                                            src={property.cover_url}
                                            alt=""
                                            className="size-full object-cover"
                                        />
                                    )}
                                </div>
                                <div className="flex flex-1 flex-col gap-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h2 className="font-medium">
                                            {property.title}
                                        </h2>
                                        <PropertyStatusBadge
                                            status={property.status}
                                            label={property.status_label}
                                        />
                                    </div>
                                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                        {property.city ?? 'Ville à préciser'}
                                        {property.price_per_night > 0 &&
                                            ` · ${formatPrice(property.price_per_night)} / nuit`}
                                        {property.upcoming_bookings > 0 &&
                                            ` · ${plural(property.upcoming_bookings, 'séjour à venir', 'séjours à venir')}`}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <Link
                                        href={calendar(property.slug)}
                                        className={buttonClasses({
                                            variant: 'ghost',
                                            size: 'sm',
                                        })}
                                    >
                                        Calendrier
                                    </Link>
                                    <Link
                                        href={edit({ property: property.slug })}
                                        className={buttonClasses({
                                            variant: 'outline',
                                            size: 'sm',
                                        })}
                                    >
                                        Modifier
                                    </Link>
                                </div>
                            </Card>
                        </li>
                    ))}
                </ul>
            )}
        </>
    );
}
