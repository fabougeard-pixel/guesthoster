import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge, Card } from '@/components/card';
import { ErrorView } from '@/components/error-view';
import { requireAdminAccess } from '@/lib/auth/session';
import {
    SUPPORT_CATEGORIES,
    SUPPORT_CATEGORY_ICONS,
    type SupportCategory,
} from '@/lib/domain/enums';
import { resolveThumbnailUrl } from '@/lib/domain/properties';
import { prisma } from '@/lib/prisma';
import { firstParam } from '@/lib/search-params';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Messages & Support Client · Administration',
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
    const tab = firstParam(sp.tab).trim(); // 'all' | 'support' | 'inquiries'
    const currentTab = tab === 'support' || tab === 'inquiries' ? tab : 'all';
    const filter = firstParam(sp.filter).trim(); // 'open' | 'closed' | ''
    const category = firstParam(sp.category).trim() as SupportCategory | '';

    const inquiryWhere = {
        ...(filter === 'open' ? { status: 'open' } : {}),
        ...(filter === 'closed' ? { status: 'closed' } : {}),
        ...(category === 'Paiements' ? { supportRequested: true } : {}),
    };

    const ticketWhere = {
        ...(filter === 'open' ? { status: { in: ['open', 'in_progress'] } } : {}),
        ...(filter === 'closed' ? { status: { in: ['resolved', 'closed'] } } : {}),
        ...(category ? { category } : {}),
    };

    const [inquiries, tickets, openInquiriesCount, openTicketsCount, paymentAlertsCount] =
        await Promise.all([
            currentTab !== 'support'
                ? prisma.propertyInquiry.findMany({
                    where: inquiryWhere,
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
                    orderBy: [{ supportRequested: 'desc' }, { updatedAt: 'desc' }],
                })
                : Promise.resolve([]),
            currentTab !== 'inquiries'
                ? prisma.supportTicket.findMany({
                    where: ticketWhere,
                    include: {
                        messages: {
                            orderBy: { createdAt: 'desc' },
                            take: 1,
                        },
                    },
                    orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
                })
                : Promise.resolve([]),
            prisma.propertyInquiry.count({ where: { status: 'open' } }),
            prisma.supportTicket.count({ where: { status: { in: ['open', 'in_progress'] } } }),
            prisma.propertyInquiry.count({ where: { supportRequested: true, status: 'open' } }),
        ]);

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                        Messages & Support Client
                    </h1>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        Supervisez les demandes de support direct (catégorisées) et les échanges conciergerie avec prise en charge paiement.
                    </p>
                </div>

                {paymentAlertsCount > 0 && (
                    <div className="flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-900 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                        <span>🚨</span>
                        <span>{paymentAlertsCount} demande(s) d’assistance paiement en attente</span>
                    </div>
                )}
            </div>

            {/* Onglets principaux */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 pb-3 dark:border-zinc-800">
                <div className="flex gap-2">
                    <Link
                        href={`/admin/messages?filter=${filter}${category ? `&category=${encodeURIComponent(category)}` : ''}`}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${currentTab === 'all'
                            ? 'bg-primary-600 text-white shadow-xs'
                            : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
                            }`}
                    >
                        Toutes les discussions ({openInquiriesCount + openTicketsCount})
                    </Link>
                    <Link
                        href={`/admin/messages?tab=support&filter=${filter}${category ? `&category=${encodeURIComponent(category)}` : ''}`}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${currentTab === 'support'
                            ? 'bg-primary-600 text-white shadow-xs'
                            : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
                            }`}
                    >
                        <span>🎧 Support Client Site</span>
                        <span className="rounded-full bg-white/20 px-1.5 py-0.2 text-[10px]">
                            {openTicketsCount}
                        </span>
                    </Link>
                    <Link
                        href={`/admin/messages?tab=inquiries&filter=${filter}${category ? `&category=${encodeURIComponent(category)}` : ''}`}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${currentTab === 'inquiries'
                            ? 'bg-primary-600 text-white shadow-xs'
                            : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
                            }`}
                    >
                        Conciergerie Logements ({openInquiriesCount})
                    </Link>
                </div>

                {/* Filtre d'état */}
                <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-zinc-400 font-medium">État :</span>
                    <Link
                        href={`/admin/messages?tab=${currentTab}${category ? `&category=${encodeURIComponent(category)}` : ''}`}
                        className={`rounded-md px-2 py-1 font-semibold transition ${!filter
                            ? 'bg-zinc-200 text-zinc-900 dark:bg-zinc-700 dark:text-zinc-100'
                            : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                            }`}
                    >
                        Tous
                    </Link>
                    <Link
                        href={`/admin/messages?tab=${currentTab}&filter=open${category ? `&category=${encodeURIComponent(category)}` : ''}`}
                        className={`rounded-md px-2 py-1 font-semibold transition ${filter === 'open'
                            ? 'bg-zinc-200 text-zinc-900 dark:bg-zinc-700 dark:text-zinc-100'
                            : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                            }`}
                    >
                        En cours
                    </Link>
                    <Link
                        href={`/admin/messages?tab=${currentTab}&filter=closed${category ? `&category=${encodeURIComponent(category)}` : ''}`}
                        className={`rounded-md px-2 py-1 font-semibold transition ${filter === 'closed'
                            ? 'bg-zinc-200 text-zinc-900 dark:bg-zinc-700 dark:text-zinc-100'
                            : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                            }`}
                    >
                        Clôturés
                    </Link>
                </div>
            </div>

            {/* Filtrage par catégorie de demande */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-zinc-400 font-medium">Catégories de support :</span>
                <Link
                    href={`/admin/messages?tab=${currentTab}&filter=${filter}`}
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${!category
                        ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400'
                        }`}
                >
                    Toutes
                </Link>
                {SUPPORT_CATEGORIES.map((cat) => {
                    const isSelected = category === cat;
                    return (
                        <Link
                            key={cat}
                            href={`/admin/messages?tab=${currentTab}&filter=${filter}&category=${encodeURIComponent(cat)}`}
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition ${isSelected
                                ? 'bg-primary-600 text-white dark:bg-primary-500'
                                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400'
                                }`}
                        >
                            <span>{SUPPORT_CATEGORY_ICONS[cat]}</span>
                            <span>{cat}</span>
                        </Link>
                    );
                })}
            </div>

            {/* Liste combinée Tickets Support + Inquiries */}
            {inquiries.length === 0 && tickets.length === 0 ? (
                <Card className="px-6 py-12 text-center text-zinc-500 dark:text-zinc-400">
                    Aucun message ou ticket ne correspond à ces critères.
                </Card>
            ) : (
                <div className="grid gap-3">
                    {/* Tickets de Support Client direct */}
                    {tickets.map((t) => {
                        const latest = t.messages[0];
                        const icon = SUPPORT_CATEGORY_ICONS[t.category as SupportCategory] || '📁';
                        return (
                            <Card
                                key={t.id}
                                className="border-l-4 border-l-primary-500 p-4 transition hover:border-zinc-300 dark:hover:border-zinc-700"
                            >
                                <Link
                                    href={`/admin/messages/${t.reference}`}
                                    className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-xl font-bold text-primary-700 dark:bg-primary-950 dark:text-primary-300">
                                            {icon}
                                        </div>
                                        <div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h2 className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                                                    <span>Support : {t.category}</span>
                                                    <code className="text-[11px] font-mono text-zinc-400 font-normal">
                                                        ({t.reference})
                                                    </code>
                                                </h2>
                                                {t.status === 'open' && (
                                                    <Badge tone="warning">Nouveau</Badge>
                                                )}
                                                {t.status === 'in_progress' && (
                                                    <Badge tone="primary">En cours</Badge>
                                                )}
                                                {t.status === 'resolved' && (
                                                    <Badge tone="success">Résolu</Badge>
                                                )}
                                                {t.status === 'closed' && (
                                                    <Badge tone="neutral">Clôturé</Badge>
                                                )}
                                                {t.priority === 'urgent' && (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-900 dark:bg-red-950/60 dark:text-red-300">
                                                        ⚡ Urgent
                                                    </span>
                                                )}
                                            </div>
                                            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                                                Demandeur :{' '}
                                                <strong className="text-zinc-800 dark:text-zinc-200">
                                                    {t.name}
                                                </strong>{' '}
                                                ({t.email})
                                                {t.phone ? ` · Tél : ${t.phone}` : ''}
                                            </p>
                                            {latest && (
                                                <p className="mt-1 line-clamp-1 text-xs text-zinc-600 dark:text-zinc-300">
                                                    <span className="font-medium text-zinc-500">
                                                        {latest.senderName} :
                                                    </span>{' '}
                                                    {latest.body}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 self-end sm:self-center">
                                        <span className="text-xs text-zinc-400 whitespace-nowrap">
                                            {formatWhen(latest?.createdAt ?? t.updatedAt)}
                                        </span>
                                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 dark:text-primary-400">
                                            Répondre en direct →
                                        </span>
                                    </div>
                                </Link>
                            </Card>
                        );
                    })}

                    {/* Conversations Inquiries / Logements */}
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
                            <Card
                                key={inq.id}
                                className={`p-4 transition hover:border-zinc-300 dark:hover:border-zinc-700 ${inq.supportRequested ? 'border-l-4 border-l-amber-500' : ''
                                    }`}
                            >
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
                                                {inq.supportRequested && (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-900 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700">
                                                        🚨 Support Paiement Requis
                                                    </span>
                                                )}
                                                {inq.isManagedByAdmin && !inq.supportRequested && (
                                                    <Badge tone="primary">Conciergerie</Badge>
                                                )}
                                            </div>
                                            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                                                Voyageur :{' '}
                                                <strong className="text-zinc-700 dark:text-zinc-300">
                                                    {inq.guest.name}
                                                </strong>{' '}
                                                ({inq.guest.email}) · Propriétaire : {inq.host.name} ({inq.host.email})
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


