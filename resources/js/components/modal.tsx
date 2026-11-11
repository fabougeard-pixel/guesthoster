import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

type ModalProps = {
    open: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
    className?: string;
};

/**
 * Modale basée sur <dialog> natif : focus piégé, fermeture par Échap et fond inert gérés par le navigateur.
 */
export function Modal({
    open,
    onClose,
    title,
    children,
    className,
}: ModalProps) {
    const dialogRef = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        const dialog = dialogRef.current;

        if (!dialog) {
            return;
        }

        if (open && !dialog.open) {
            dialog.showModal();
        } else if (!open && dialog.open) {
            dialog.close();
        }
    }, [open]);

    return (
        <dialog
            ref={dialogRef}
            onClose={onClose}
            onClick={(event) => {
                if (event.target === dialogRef.current) {
                    onClose();
                }
            }}
            aria-label={title}
            className={cn(
                'm-auto w-full max-w-lg rounded-2xl bg-white p-0 text-zinc-900 shadow-xl backdrop:bg-zinc-950/50 dark:bg-zinc-900 dark:text-zinc-100',
                className,
            )}
        >
            <div className="flex items-center justify-between gap-4 border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
                <h2 className="text-lg font-semibold">{title}</h2>
                <button
                    type="button"
                    onClick={onClose}
                    className="rounded-lg p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                    aria-label="Fermer"
                >
                    <svg
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="size-5"
                        aria-hidden="true"
                    >
                        <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                    </svg>
                </button>
            </div>
            <div className="px-6 py-5">{children}</div>
        </dialog>
    );
}
