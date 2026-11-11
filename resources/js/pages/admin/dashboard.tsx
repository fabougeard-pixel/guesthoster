import { Head, Link } from '@inertiajs/react';
import { buttonClasses } from '@/components/button';
import { Card } from '@/components/card';
import { formatDateTime, formatPrice, plural } from '@/lib/format';
import { index as moderation } from '@/routes/admin/properties';
import { index as users } from '@/routes/admin/users';
import { show as showProperty } from '@/routes/properties';

type Props = {
    stats: {
        published: number;
        pending_review: number;
        pending_requests: number;
        awaiting_payment: number;
        upcoming_stays: number;
        hosts: number;
        travelers: number;
    };
    revenue: {
        months: { month: string; volume: number; fees: number }[];
        volume: number;
        fees: number;
    };
    topHosts: {
        id: number;
        name: string;
        email: string;
        stays: number;
        volume: number;
        listings: number;
    }[];
    reviewQueue: {
        id: number;
        slug: string;
        title: string;
        host: string;
        city: string | null;
        submitted_at: string | null;
    }[];
};

function monthLabel(month: string): string {
    const [year, monthIndex] = month.split('-').map(Number);

    return new Intl.DateTimeFormat('fr-FR', {
        month: 'short',
        timeZone: 'UTC',
    }).format(new Date(Date.UTC(year, monthIndex - 1, 1)));
}

function RevenueChart({ months }: { months: Props['revenue']['months'] }) {
    const max = Math.max(...months.map((month) => month.volume), 1);

    return (
        <ol
            className="mt-6 flex h-48 items-end gap-3"
            aria-label="Volume payé par mois"
        >
            {months.map((month) => (
                <li
                    key={month.month}
                    className="flex h-full flex-1 flex-col items-center justify-end gap-2"
                >
                    <span className="text-xs font-medium text-zinc-600 tabular-nums dark:text-zinc-300">
                        {month.volume > 0 ? formatPrice(month.volume) : ''}
                    </span>
                    <span
                        className="w-full max-w-12 rounded-t-md bg-secondary-700 dark:bg-secondary-500"
                        style={{
                            height: `${Math.max((month.volume / max) * 100, month.volume > 0 ? 4 : 1)}%`,
                        }}
                        title={`${formatPrice(month.volume)} payés, dont ${formatPrice(month.fees)} de frais de service`}
                    />
                    <span className="text-xs text-zinc-500 capitalize dark:text-zinc-400">
                        {monthLabel(month.month)}
                    </span>
                </li>
            ))}
        </ol>
    );
}

export default function AdminDashboard({
    stats,
    revenue,
    topHosts,
    reviewQueue,
}: Props) {
    const tiles = [
        { label: 'Logements en ligne', value: stats.published },
        {
            label: 'À valider',
            value: stats.pending_review,
            highlight: stats.pending_review > 0,
        },
        { label: 'Demandes en attente d’hôte', value: stats.pending_requests },
        { label: 'Paiements attendus', value: stats.awaiting_payment },
        { label: 'Séjours à venir', value: stats.upcoming_stays },
        {
            label: 'Hôtes / voyageurs',
            value: `${stats.hosts} / ${stats.travelers}`,
        },
    ];

    return (
        <>
            <Head title="Administration" />
            <h1 className="text-2xl font-semibold">Tableau de bord</h1>

            <dl className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
                {tiles.map((tile) => (
                    <Card
                        key={tile.label}
                        className={
                            tile.highlight
                                ? 'border-amber-300 p-5 dark:border-amber-800'
                                : 'p-5'
                        }
                    >
                        <dt className="text-sm text-zinc-500 dark:text-zinc-400">
                            {tile.label}
                        </dt>
                        <dd className="mt-1 text-3xl font-semibold tabular-nums">
                            {tile.value}
                        </dd>
                    </Card>
                ))}
            </dl>

            <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_24rem]">
                <Card className="p-6">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <h2 className="text-lg font-semibold">
                            Séjours payés · 6 derniers mois
                        </h2>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                            {formatPrice(revenue.volume)} encaissés, dont{' '}
                            <strong className="text-zinc-900 dark:text-zinc-100">
                                {formatPrice(revenue.fees)}
                            </strong>{' '}
                            de frais de service
                        </p>
                    </div>
                    <RevenueChart months={revenue.months} />
                    <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
                        Réservations confirmées ou terminées, à la date du
                        paiement. Les séjours annulés et remboursés sont exclus.
                    </p>
                </Card>

                <Card className="p-6">
                    <h2 className="text-lg font-semibold">Meilleurs hôtes</h2>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        Volume payé sur 12 mois
                    </p>
                    {topHosts.length === 0 ? (
                        <p className="mt-6 text-sm text-zinc-500 dark:text-zinc-400">
                            Aucun séjour payé pour le moment.
                        </p>
                    ) : (
                        <ol className="mt-4 flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800">
                            {topHosts.map((host, index) => (
                                <li
                                    key={host.id}
                                    className="flex items-center gap-3 py-3"
                                >
                                    <span className="w-5 text-sm font-semibold text-zinc-400">
                                        {index + 1}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <Link
                                            href={users({
                                                query: { q: host.email },
                                            })}
                                            className="block truncate font-medium hover:underline"
                                        >
                                            {host.name}
                                        </Link>
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                            {plural(host.stays, 'séjour')} ·{' '}
                                            {plural(
                                                host.listings,
                                                'logement en ligne',
                                                'logements en ligne',
                                            )}
                                        </p>
                                    </div>
                                    <span className="text-sm font-semibold tabular-nums">
                                        {formatPrice(host.volume)}
                                    </span>
                                </li>
                            ))}
                        </ol>
                    )}
                </Card>
            </div>

            <Card className="mt-6 p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-lg font-semibold">
                        Logements à valider
                    </h2>
                    <Link
                        href={moderation()}
                        className={buttonClasses({
                            variant: 'outline',
                            size: 'sm',
                        })}
                    >
                        Ouvrir la modération
                    </Link>
                </div>
                {reviewQueue.length === 0 ? (
                    <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
                        Rien à valider : tout est à jour.
                    </p>
                ) : (
                    <ul className="mt-4 flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800">
                        {reviewQueue.map((property) => (
                            <li
                                key={property.id}
                                className="flex flex-wrap items-center justify-between gap-2 py-3"
                            >
                                <div>
                                    <Link
                                        href={showProperty(property.slug)}
                                        className="font-medium hover:underline"
                                    >
                                        {property.title}
                                    </Link>
                                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                        {property.host}
                                        {property.city && ` · ${property.city}`}
                                    </p>
                                </div>
                                {property.submitted_at && (
                                    <span className="text-sm text-zinc-500 dark:text-zinc-400">
                                        Envoyé le{' '}
                                        {formatDateTime(property.submitted_at)}
                                    </span>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </Card>
        </>
    );
}
