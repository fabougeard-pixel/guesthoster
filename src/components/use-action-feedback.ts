'use client';

import { useRouter } from 'next/navigation';
import { useAppState } from '@/components/providers';
import type { ActionResult, FieldErrors } from '@/lib/actions/types';

export function useActionFeedback() {
    const router = useRouter();
    const { pushToast, refreshCounters } = useAppState();

    function applyResult<T>(
        result: ActionResult<T>,
        options?: {
            onSuccess?: (data: T | undefined) => void;
            setFieldErrors?: (errors: FieldErrors) => void;
            setError?: (msg: string | undefined) => void;
        },
    ): boolean {
        if (!result.ok) {
            if (result.fieldErrors && options?.setFieldErrors) {
                options.setFieldErrors(result.fieldErrors);
            }
            if (result.error) {
                if (options?.setError) {
                    options.setError(result.error);
                } else {
                    pushToast({ type: 'error', message: result.error });
                }
            }
            return false;
        }

        if (result.toast) {
            pushToast(result.toast);
        }

        options?.onSuccess?.(result.data);
        void refreshCounters();

        if (result.redirectTo) {
            router.push(result.redirectTo);
        }
        router.refresh();
        return true;
    }

    return { applyResult, pushToast, refreshCounters, router };
}

