import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge, Card } from '@/components/card';
import { ErrorView } from '@/components/error-view';
import { requireAdminAccess } from '@/lib/auth/session';
import { resolveThumbnailUrl } from '@/lib/domain/properties';
import { prisma } from '@/lib/prisma';
import { firstParam } from '@/lib/search-params';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Messages & Conciergerie · Administration',
};

function formatWhen(iso: Date | null) {
    if (!iso) {
        return '';
    }
    const date = new Date(iso);
    const sameDay = date.toDateString() === new Date().toDateString();

    return new Intl.DateTimeFormat(
        'fr-FR',
        sameDay
            ? { hour: '2-digit', minute: '2-digit' }
            : { day: 'numeric', month: 'short' },
    ).format(date);
}

export default async function AdminMessagesPage({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const admin = await requireAdminAccess('/admin/messages');
    if (!admin) {
        return <ErrorView status={403} />;
    }

    const sp = await searchParams;
    const filter = firstParam(sp.filter).trim(); // 'open' | 'closed' | ''

    const where = {
        ...(filter === 'open' ? { status: 'open' } : {}),
        ...(filter === 'closed' ? { status: 'closed' } : {}),
    };

    const inquiries = await prisma.propertyInquiry.findMany({
        where,
        include: {
            guest: { select: { id: true, name: true, email: true } },
            host: { select: { id: true, name: true, email: true } },
            property: {
                select: {
                    id: true,
                    title: true,
                    slug: true,
                    managedByAdmin: true,
                    images: {
                        where: { processedAt: { not: null } },
                        orderBy: { position: 'asc' },
                        take: 1,
                    },
                },
            },
            messages: {
                orderBy: { createdAt: 'desc' },
                take: 1,
            },
        },
        orderBy: { updatedAt: 'desc' },
    });

    const openCount = await prisma.propertyInquiry.count({ where: { status: 'open' } });
    const closedCount = await prisma.propertyInquiry.count({ where: { status: 'closed' } });

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold">Messages & Conciergerie</h1>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        Échanges en direct avec les voyageurs pour les biens en gestion et conciergerie.
                    </p>
                </div>
            </div>

            {/* Onglets de filtrage */}
            <div className="flex gap-2 border-b border-zinc-200 pb-3 dark:border-zinc-800">
                <Link
                    href="/admin/messages"
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                        !filter
                            ? 'bg-primary-50 text-primary-700 dark:bg-primary-950/60 dark:text-primary-300'
                            : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
                    }`}
                >
                    Toutes ({openCount + closedCount})
                </Link>
                <Link
                    href="/admin/messages?filter=open"
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                        filter === 'open'
                            ? 'bg-primary-50 text-primary-700 dark:bg-primary-950/60 dark:text-primary-300'
                            : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
                    }`}
                >
                    En cours ({openCount})
                </Link>
                <Link
                    href="/admin/messages?filter=closed"
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                        filter === 'closed'
                            ? 'bg-primary-50 text-primary-700 dark:bg-primary-950/60 dark:text-primary-300'
                            : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
                    }`}
                >
                    Clôturées ({closedCount})
                </Link>
            </div>

            {inquiries.length === 0 ? (
                <Card className="px-6 py-12 text-center text-zinc-500 dark:text-zinc-400">
                    Aucun message pour l’instant dans cette section.
                </Card>
            ) : (
                <div className="grid gap-3">
                    {inquiries.map((inq) => {
                        const latest = inq.messages[0];
                        const cover = inq.property.images[0];
                        const coverUrl = cover
                            ? resolveThumbnailUrl(
                                  cover.thumbnailPath,
                                  cover.path,
                                  cover.cloudinaryPublicId,
                              )
                            : null;

                        return (
                            <Card key={inq.id} className="p-4 transition hover:border-zinc-300 dark:hover:border-zinc-700">
                                <Link
                                    href={`/admin/messages/${inq.reference}`}
                                    className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="size-12 shrink-0 overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800">
                                            {coverUrl && (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img
                                                    src={coverUrl}
                                                    alt=""
                                                    className="size-full object-cover"
                                                />
                                            )}
                                        </div>
                                        <div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
                                                    {inq.property.title}
                                                </h2>
                                                {inq.status === 'open' ? (
                                                    <Badge tone="success">En cours</Badge>
                                                ) : (
                                                    <Badge tone="neutral">Clôturée</Badge>
                                                )}
                                                {inq.isManagedByAdmin && (
                                                    <Badge tone="primary">Conciergerie</Badge>
                                                )}
                                            </div>
                                            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                                                Voyageur : <strong className="text-zinc-700 dark:text-zinc-300">{inq.guest.name}</strong> ({inq.guest.email}) · Propriétaire : {inq.host.name} ({inq.host.email})
                                            </p>
                                            {latest && (
                                                <p className="mt-1 line-clamp-1 text-xs text-zinc-600 dark:text-zinc-300">
                                                    Dernier message : {latest.body}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 self-end sm:self-center">
                                        <span className="text-xs text-zinc-400 whitespace-nowrap">
                                            {formatWhen(latest?.createdAt ?? inq.updatedAt)}
                                        </span>
                                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 dark:text-primary-400">
                                            Ouvrir la conversation →
                                        </span>
                                    </div>
                                </Link>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

