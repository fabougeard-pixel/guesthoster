import { Link, router, usePage } from '@inertiajs/react';
import { useEcho } from '@laravel/echo-react';
import { realtimeEnabled } from '@/lib/realtime';
import { cn } from '@/lib/utils';
import { index } from '@/routes/messages';

/**
 * Met à jour le compteur dès qu'un message arrive sur le canal privé de l'utilisateur.
 */
function UnreadListener({ userId }: { userId: number }) {
    useEcho(`App.Models.User.${userId}`, '.message.sent', () => {
        router.reload({ only: ['unreadMessages'] });
    });

    return null;
}

export function MessagesLink({ userId }: { userId: number }) {
    const { unreadMessages } = usePage().props;

    return (
        <>
            {realtimeEnabled && <UnreadListener userId={userId} />}
            <Link
                href={index()}
                className="relative rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                aria-label={
                    unreadMessages > 0
                        ? `Messages, ${unreadMessages} non lu${unreadMessages > 1 ? 's' : ''}`
                        : 'Messages'
                }
            >
                <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.8}
                    className="size-6"
                    aria-hidden="true"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z"
                    />
                </svg>
                {unreadMessages > 0 && (
                    <span
                        className={cn(
                            'absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-600 px-1 text-xs font-semibold text-white',
                        )}
                        aria-hidden="true"
                    >
                        {unreadMessages > 9 ? '9+' : unreadMessages}
                    </span>
                )}
            </Link>
        </>
    );
}
