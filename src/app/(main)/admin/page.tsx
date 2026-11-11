import type { Metadata } from 'next';
import Link from 'next/link';
import { buttonClasses } from '@/components/button';
import { Card } from '@/components/card';
import { ErrorView } from '@/components/error-view';
import { hasAdminUser, requireAdminAccess } from '@/lib/auth/session';
import { formatDateTime, formatPrice, parseDate, plural, todayIso } from '@/lib/format';
import { prisma } from '@/lib/prisma';
import { AdminSetupForm } from './admin-setup-form';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Administration',
};

function monthLabel(month: string): string {
    const [year, monthIndex] = month.split('-').map(Number);

    return new Intl.DateTimeFormat('fr-FR', {
        month: 'short',
        timeZone: 'UTC',
    }).format(new Date(Date.UTC(year!, monthIndex! - 1, 1)));
}

function RevenueChart({
    months,
}: {
    months: { month: string; volume: number; fees: number }[];
}) {
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

export default async function AdminDashboardPage() {
    if (!(await hasAdminUser())) {
        return <AdminSetupForm />;
    }

    const admin = await requireAdminAccess('/admin');
    if (!admin) {
        return <ErrorView status={403} />;
    }

    const todayDate = parseDate(todayIso());
    const now = new Date();

    const monthKeys: string[] = [];
    for (let offset = 5; offset >= 0; offset -= 1) {
        const d = new Date(
            Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1),
        );
        const ym = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
        monthKeys.push(ym);
    }

    const sixMonthsStart = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1),
    );
    const twelveMonthsAgo = new Date(now.getTime() - 365 * 86_400_000);

    const [
        published,
        pendingReview,
        pendingRequests,
        awaitingPayment,
        upcomingStays,
        hostsCount,
        travelersCount,
        paidSixMonths,
        paidTwelveMonths,
        reviewQueueRows,
    ] = await Promise.all([
        prisma.property.count({ where: { status: 'published' } }),
        prisma.property.count({ where: { status: 'pending' } }),
        prisma.booking.count({ where: { status: 'pending' } }),
        prisma.booking.count({ where: { status: 'awaiting_payment' } }),
        prisma.booking.count({
            where: { status: 'confirmed', checkOut: { gt: todayDate } },
        }),
        prisma.user.count({ where: { role: 'host' } }),
        prisma.user.count({ where: { role: 'client' } }),
        prisma.booking.findMany({
            where: {
                status: { in: ['confirmed', 'completed'] },
                paidAt: { not: null, gte: sixMonthsStart },
            },
            select: { paidAt: true, totalPrice: true, serviceFee: true },
        }),
        prisma.booking.findMany({
            where: {
                status: { in: ['confirmed', 'completed'] },
                paidAt: { not: null, gte: twelveMonthsAgo },
            },
            select: {
                totalPrice: true,
                property: {
                    select: {
                        owner: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                _count: {
                                    select: {
                                        properties: {
                                            where: { status: 'published' },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        }),
        prisma.property.findMany({
            where: { status: 'pending' },
            orderBy: [{ submittedAt: 'asc' }, { id: 'asc' }],
            take: 5,
            include: {
                owner: { select: { name: true } },
                city: { select: { name: true } },
            },
        }),
    ]);

    const monthTotals = new Map(
        monthKeys.map((m) => [m, { volume: 0, fees: 0 }]),
    );
    for (const row of paidSixMonths) {
        if (!row.paidAt) {
            continue;
        }
        const ym = `${row.paidAt.getUTCFullYear()}-${String(row.paidAt.getUTCMonth() + 1).padStart(2, '0')}`;
        const bucket = monthTotals.get(ym);
        if (bucket) {
            bucket.volume += row.totalPrice;
            bucket.fees += row.serviceFee;
        }
    }

    const months = monthKeys.map((month) => ({
        month,
        volume: monthTotals.get(month)!.volume,
        fees: monthTotals.get(month)!.fees,
    }));

    const revenueVolume = months.reduce((sum, m) => sum + m.volume, 0);
    const revenueFees = months.reduce((sum, m) => sum + m.fees, 0);

    const hostStatsMap = new Map<
        number,
        {
            id: number;
            name: string;
            email: string;
            stays: number;
            volume: number;
            listings: number;
        }
    >();
    for (const row of paidTwelveMonths) {
        const owner = row.property.owner;
        const current = hostStatsMap.get(owner.id) ?? {
            id: owner.id,
            name: owner.name,
            email: owner.email,
            stays: 0,
            volume: 0,
            listings: owner._count.properties,
        };
        current.stays += 1;
        current.volume += row.totalPrice;
        hostStatsMap.set(owner.id, current);
    }

    const topHosts = [...hostStatsMap.values()]
        .sort((a, b) => b.volume - a.volume)
        .slice(0, 5);

    const reviewQueue = reviewQueueRows.map((row) => ({
        id: row.id,
        slug: row.slug,
        title: row.title,
        host: row.owner.name,
        city: row.city?.name ?? null,
        submitted_at: row.submittedAt ? row.submittedAt.toISOString() : null,
    }));

    const tiles = [
        { label: 'Logements en ligne', value: published },
        {
            label: 'À valider',
            value: pendingReview,
            highlight: pendingReview > 0,
        },
        { label: 'Demandes en attente d’hôte', value: pendingRequests },
        { label: 'Paiements attendus', value: awaitingPayment },
        { label: 'Séjours à venir', value: upcomingStays },
        {
            label: 'Hôtes / voyageurs',
            value: `${hostsCount} / ${travelersCount}`,
        },
    ];

    return (
        <>
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
                            {formatPrice(revenueVolume)} encaissés, dont{' '}
                            <strong className="text-zinc-900 dark:text-zinc-100">
                                {formatPrice(revenueFees)}
                            </strong>{' '}
                            de frais de service
                        </p>
                    </div>
                    <RevenueChart months={months} />
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
                                            href={`/admin/utilisateurs?q=${encodeURIComponent(host.email)}`}
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
                        href="/admin/logements"
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
                                        href={`/logements/${property.slug}`}
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

