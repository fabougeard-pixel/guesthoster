import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import type { Toast, ToastType } from '@/types';

type VisibleToast = Toast & { id: number };

const toneClasses: Record<ToastType, string> = {
    success:
        'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100',
    error: 'border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100',
    info: 'border-zinc-200 bg-white text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100',
};

const TOAST_DURATION_MS = 5000;

let nextToastId = 0;

/**
 * Affiche les messages flash `toast` envoyés par le serveur via Inertia::flash('toast', [...]).
 */
export function Toaster() {
    const [toasts, setToasts] = useState<VisibleToast[]>([]);

    const dismiss = (id: number) => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
    };

    useEffect(() => {
        return router.on('flash', (event) => {
            const toast = event.detail.flash.toast;

            if (!toast) {
                return;
            }

            const id = ++nextToastId;
            setToasts((current) => [...current, { ...toast, id }]);
            window.setTimeout(() => dismiss(id), TOAST_DURATION_MS);
        });
    }, []);

    return (
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
    );
}
