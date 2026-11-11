import { Head, Link } from '@inertiajs/react';
import { Card, Container } from '@/components/card';
import { cn } from '@/lib/utils';
import { show } from '@/routes/messages';

type Conversation = {
    reference: string;
    property_title: string;
    cover_url: string | null;
    counterpart: string;
    role: 'guest' | 'host';
    status_label: string;
    last_message: string | null;
    last_message_mine: boolean;
    last_message_at: string | null;
    unread: number;
};

function formatWhen(iso: string) {
    const date = new Date(iso);
    const sameDay = date.toDateString() === new Date().toDateString();

    return new Intl.DateTimeFormat(
        'fr-FR',
        sameDay
            ? { hour: '2-digit', minute: '2-digit' }
            : { day: 'numeric', month: 'short' },
    ).format(date);
}

export default function Inbox({
    conversations,
}: {
    conversations: Conversation[];
}) {
    return (
        <>
            <Head title="Messages" />
            <Container className="max-w-3xl py-10">
                <h1 className="text-2xl font-semibold">Messages</h1>
                {conversations.length === 0 ? (
                    <Card className="mt-8 px-6 py-12 text-center text-zinc-600 dark:text-zinc-400">
                        Aucune conversation pour l’instant. Vous pourrez écrire
                        à votre hôte, ou à vos voyageurs, depuis la page d’une
                        réservation.
                    </Card>
                ) : (
                    <ul className="mt-8 flex flex-col divide-y divide-zinc-200 rounded-2xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
                        {conversations.map((conversation) => (
                            <li key={conversation.reference}>
                                <Link
                                    href={show(conversation.reference)}
                                    className="flex items-center gap-4 p-4 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900"
                                >
                                    <div className="size-14 shrink-0 overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800">
                                        {conversation.cover_url && (
                                            <img
                                                src={conversation.cover_url}
                                                alt=""
                                                className="size-full object-cover"
                                            />
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-baseline justify-between gap-3">
                                            <p
                                                className={cn(
                                                    'truncate',
                                                    conversation.unread > 0
                                                        ? 'font-semibold'
                                                        : 'font-medium',
                                                )}
                                            >
                                                {conversation.counterpart}
                                                <span className="font-normal text-zinc-500 dark:text-zinc-400">
                                                    {' '}
                                                    ·{' '}
                                                    {conversation.role ===
                                                    'guest'
                                                        ? 'votre hôte'
                                                        : 'voyageur'}
                                                </span>
                                            </p>
                                            {conversation.last_message_at && (
                                                <time
                                                    className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400"
                                                    dateTime={
                                                        conversation.last_message_at
                                                    }
                                                >
                                                    {formatWhen(
                                                        conversation.last_message_at,
                                                    )}
                                                </time>
                                            )}
                                        </div>
                                        <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">
                                            {conversation.property_title} ·{' '}
                                            {conversation.status_label}
                                        </p>
                                        <p
                                            className={cn(
                                                'truncate text-sm',
                                                conversation.unread > 0
                                                    ? 'font-medium text-zinc-900 dark:text-zinc-100'
                                                    : 'text-zinc-600 dark:text-zinc-400',
                                            )}
                                        >
                                            {conversation.last_message_mine &&
                                                'Vous : '}
                                            {conversation.last_message}
                                        </p>
                                    </div>
                                    {conversation.unread > 0 && (
                                        <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-primary-600 px-1.5 text-xs font-semibold text-white">
                                            <span className="sr-only">
                                                Non lus :{' '}
                                            </span>
                                            {conversation.unread}
                                        </span>
                                    )}
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </Container>
        </>
    );
}
