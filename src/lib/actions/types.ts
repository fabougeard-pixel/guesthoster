import type { ZodError } from 'zod';

export type FieldErrors = Record<string, string>;

export type ToastPayload = {
    type: 'success' | 'error' | 'info';
    message: string;
};

export type ActionResult<T = undefined> =
    | {
        ok: true;
        data?: T;
        toast?: ToastPayload;
        redirectTo?: string;
    }
    | {
        ok: false;
        error?: string;
        fieldErrors?: FieldErrors;
    };

export function zodToFieldErrors(error: ZodError): FieldErrors {
    const fieldErrors: FieldErrors = {};

    for (const issue of error.issues) {
        const key = issue.path.join('.');
        if (key && !fieldErrors[key]) {
            fieldErrors[key] = issue.message;
        }
    }

    return fieldErrors;
}

export function safeInternalPath(
    candidate: string | null | undefined,
    fallback = '/',
): string {
    if (!candidate || typeof candidate !== 'string') {
        return fallback;
    }

    const trimmed = candidate.trim();
    if (!trimmed.startsWith('/') || trimmed.startsWith('//')) {
        return fallback;
    }

    return trimmed;
}

