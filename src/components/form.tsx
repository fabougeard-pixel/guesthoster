import type {
    InputHTMLAttributes,
    LabelHTMLAttributes,
    ReactNode,
    SelectHTMLAttributes,
    TextareaHTMLAttributes,
} from 'react';
import { cn } from '@/lib/utils';

const fieldClasses =
    'block w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 shadow-xs transition-colors placeholder:text-zinc-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none disabled:cursor-not-allowed disabled:bg-zinc-50 aria-invalid:border-red-500 aria-invalid:focus:ring-red-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:disabled:bg-zinc-800';

export function Input({
    className,
    type = 'text',
    ...props
}: InputHTMLAttributes<HTMLInputElement>) {
    return (
        <input
            type={type}
            className={cn(fieldClasses, 'h-10', className)}
            {...props}
        />
    );
}

export function Textarea({
    className,
    rows = 4,
    ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
    return (
        <textarea
            rows={rows}
            className={cn(fieldClasses, 'py-2', className)}
            {...props}
        />
    );
}

export function Select({
    className,
    ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
    return (
        <select className={cn(fieldClasses, 'h-10', className)} {...props} />
    );
}

export function Label({
    className,
    ...props
}: LabelHTMLAttributes<HTMLLabelElement>) {
    return (
        <label
            className={cn(
                'text-sm font-medium text-zinc-800 dark:text-zinc-200',
                className,
            )}
            {...props}
        />
    );
}

export function InputError({
    message,
    className,
}: {
    message?: string;
    className?: string;
}) {
    if (!message) {
        return null;
    }

    return (
        <p className={cn('text-sm text-red-600 dark:text-red-400', className)}>
            {message}
        </p>
    );
}

export function Field({
    label,
    htmlFor,
    error,
    hint,
    action,
    children,
    className,
}: {
    label: string;
    htmlFor: string;
    error?: string;
    hint?: string;
    action?: ReactNode;
    children: ReactNode;
    className?: string;
}) {
    return (
        <div className={cn('flex flex-col gap-1.5', className)}>
            <div className="flex items-center justify-between gap-2">
                <Label htmlFor={htmlFor}>{label}</Label>
                {action}
            </div>
            {children}
            {hint && !error && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {hint}
                </p>
            )}
            <InputError message={error} />
        </div>
    );
}

export function Checkbox({
    className,
    ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
    return (
        <input
            type="checkbox"
            className={cn(
                'size-4 rounded border-zinc-300 text-primary-600 accent-primary-600 focus:ring-primary-500 dark:border-zinc-600',
                className,
            )}
            {...props}
        />
    );
}

export function Alert({
    tone = 'success',
    children,
}: {
    tone?: 'success' | 'info' | 'warning';
    children: ReactNode;
}) {
    const toneClasses = {
        success:
            'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200',
        info: 'border-secondary-200 bg-secondary-50 text-secondary-900 dark:border-secondary-900 dark:bg-secondary-950 dark:text-secondary-200',
        warning:
            'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200',
    };

    return (
        <div
            role="status"
            className={cn(
                'rounded-lg border px-4 py-3 text-sm',
                toneClasses[tone],
            )}
        >
            {children}
        </div>
    );
}

