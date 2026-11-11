import { Link, router, usePage } from '@inertiajs/react';
import { useEchoNotification } from '@laravel/echo-react';
import { realtimeEnabled } from '@/lib/realtime';
import { index } from '@/routes/notifications';

/**
 * Recharge le compteur (et la liste si elle est affichée) à chaque notification diffusée.
 */
function NotificationListener({ userId }: { userId: number }) {
    useEchoNotification(`App.Models.User.${userId}`, () => {
        router.reload({ only: ['unreadNotifications', 'notifications'] });
    });

    return null;
}

export function NotificationsLink({ userId }: { userId: number }) {
    const { unreadNotifications } = usePage().props;

    return (
        <>
            {realtimeEnabled && <NotificationListener userId={userId} />}
            <Link
                href={index()}
                className="relative rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                aria-label={
                    unreadNotifications > 0
                        ? `Notifications, ${unreadNotifications} non lue${unreadNotifications > 1 ? 's' : ''}`
                        : 'Notifications'
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
                        d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
                    />
                </svg>
                {unreadNotifications > 0 && (
                    <span
                        className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-600 px-1 text-xs font-semibold text-white"
                        aria-hidden="true"
                    >
                        {unreadNotifications > 9 ? '9+' : unreadNotifications}
                    </span>
                )}
            </Link>
        </>
    );
}
