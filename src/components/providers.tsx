'use client';

import type { ReactNode } from 'react';
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
} from 'react';
import { cn } from '@/lib/utils';
import type { Toast, ToastType, User } from '@/types';

type VisibleToast = Toast & { id: number };

const toneClasses: Record<ToastType, string> = {
    success:
        'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100',
    error: 'border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100',
    info: 'border-zinc-200 bg-white text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100',
};

const TOAST_DURATION_MS = 5000;
let nextToastId = 0;

type AppStateContextValue = {
    user: User | null;
    favoriteIds: number[];
    setFavoriteIds: React.Dispatch<React.SetStateAction<number[]>>;
    unreadNotifications: number;
    unreadMessages: number;
    refreshCounters: () => Promise<void>;
    pushToast: (toast: Toast) => void;
};

const AppStateContext = createContext<AppStateContextValue | null>(null);

export function useAppState(): AppStateContextValue {
    const ctx = useContext(AppStateContext);
    if (!ctx) {
        throw new Error(
            'useAppState doit être utilisé à l’intérieur de AppStateProvider.',
        );
    }
    return ctx;
}

export function AppStateProvider({
    initialUser,
    initialFavoriteIds,
    initialUnreadNotifications,
    initialUnreadMessages,
    children,
}: {
    initialUser: User | null;
    initialFavoriteIds: number[];
    initialUnreadNotifications: number;
    initialUnreadMessages: number;
    children: ReactNode;
}) {
    const [toasts, setToasts] = useState<VisibleToast[]>([]);
    const [favoriteIds, setFavoriteIds] =
        useState<number[]>(initialFavoriteIds);
    const [unreadNotifications, setUnreadNotifications] = useState(
        initialUnreadNotifications,
    );
    const [unreadMessages, setUnreadMessages] = useState(initialUnreadMessages);
    const [syncedProps, setSyncedProps] = useState({
        favoriteIds: initialFavoriteIds,
        unreadNotifications: initialUnreadNotifications,
        unreadMessages: initialUnreadMessages,
    });

    if (syncedProps.favoriteIds !== initialFavoriteIds) {
        setSyncedProps((prev) => ({
            ...prev,
            favoriteIds: initialFavoriteIds,
        }));
        setFavoriteIds(initialFavoriteIds);
    }
    if (syncedProps.unreadNotifications !== initialUnreadNotifications) {
        setSyncedProps((prev) => ({
            ...prev,
            unreadNotifications: initialUnreadNotifications,
        }));
        setUnreadNotifications(initialUnreadNotifications);
    }
    if (syncedProps.unreadMessages !== initialUnreadMessages) {
        setSyncedProps((prev) => ({
            ...prev,
            unreadMessages: initialUnreadMessages,
        }));
        setUnreadMessages(initialUnreadMessages);
    }

    const dismiss = useCallback((id: number) => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
    }, []);

    const pushToast = useCallback(
        (toast: Toast) => {
            const id = ++nextToastId;
            setToasts((current) => [...current, { ...toast, id }]);
            window.setTimeout(() => dismiss(id), TOAST_DURATION_MS);
        },
        [dismiss],
    );

    const refreshCounters = useCallback(async () => {
        if (!initialUser) {
            return;
        }
        try {
            const res = await fetch('/api/me/counters', {
                cache: 'no-store',
                credentials: 'same-origin',
            });
            if (!res.ok) {
                return;
            }
            const data = (await res.json()) as {
                unreadNotifications?: number;
                unreadMessages?: number;
            };
            if (typeof data.unreadNotifications === 'number') {
                setUnreadNotifications(data.unreadNotifications);
            }
            if (typeof data.unreadMessages === 'number') {
                setUnreadMessages(data.unreadMessages);
            }
        } catch {
            // Silent ignore when offline
        }
    }, [initialUser]);

    useEffect(() => {
        if (!initialUser) {
            return;
        }

        const onFocus = () => {
            void refreshCounters();
        };

        window.addEventListener('focus', onFocus);
        const timer = window.setInterval(() => {
            void refreshCounters();
        }, 30_000);

        return () => {
            window.removeEventListener('focus', onFocus);
            window.clearInterval(timer);
        };
    }, [initialUser, refreshCounters]);

    return (
        <AppStateContext.Provider
            value={{
                user: initialUser,
                favoriteIds,
                setFavoriteIds,
                unreadNotifications,
                unreadMessages,
                refreshCounters,
                pushToast,
            }}
        >
            {children}
            <div
                aria-live="polite"
                className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:items-end"
            >
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        role={toast.type === 'error' ? 'alert' : 'status'}
                        className={cn(
                            'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg',
                            toneClasses[toast.type],
                        )}
                    >
                        <p className="flex-1">{toast.message}</p>
                        <button
                            type="button"
                            onClick={() => dismiss(toast.id)}
                            className="opacity-60 hover:opacity-100"
                            aria-label="Fermer la notification"
                        >
                            ×
                        </button>
                    </div>
                ))}
            </div>
        </AppStateContext.Provider>
    );
}

