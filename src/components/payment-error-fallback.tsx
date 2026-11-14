'use client';

import type { PaymentMethodKey } from '@/lib/domain/platform-settings';

export type PaymentErrorState = {
    message: string;
    failedMethod: PaymentMethodKey;
    suggestedMethod: PaymentMethodKey;
};

export function getPaymentMethodLabel(method: PaymentMethodKey): string {
    switch (method) {
        case 'card':
            return 'Carte bancaire';
        case 'paypal':
            return 'PayPal';
        case 'bank_transfer':
            return 'Virement bancaire SEPA';
        default:
            return 'Autre moyen de paiement';
    }
}

export function getSuggestedPaymentMethod(
    failedMethod: PaymentMethodKey,
    enabledMethods: PaymentMethodKey[],
): PaymentMethodKey {
    if (failedMethod === 'card') {
        if (enabledMethods.includes('bank_transfer')) {
            return 'bank_transfer';
        }
        if (enabledMethods.includes('paypal')) {
            return 'paypal';
        }
    } else if (failedMethod === 'paypal') {
        if (enabledMethods.includes('card')) {
            return 'card';
        }
        if (enabledMethods.includes('bank_transfer')) {
            return 'bank_transfer';
        }
    } else if (failedMethod === 'bank_transfer') {
        if (enabledMethods.includes('card')) {
            return 'card';
        }
        if (enabledMethods.includes('paypal')) {
            return 'paypal';
        }
    }
    return (
        enabledMethods.find((m) => m !== failedMethod) ??
        enabledMethods[0] ??
        'bank_transfer'
    );
}

export function PaymentErrorBanner({
    error,
    onSwitch,
}: {
    error: PaymentErrorState;
    onSwitch: (newMethod: PaymentMethodKey) => void;
}) {
    return (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900 shadow-xs dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
            <div className="flex items-start gap-3">
                <svg
                    className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                </svg>
                <div className="flex-1 text-sm">
                    <p className="font-semibold text-amber-950 dark:text-amber-100">
                        {error.message}
                    </p>
                    {error.suggestedMethod && (
                        <div className="mt-2.5">
                            <p className="mb-2 text-xs text-amber-800 dark:text-amber-300">
                                Nous vous recommandons de finaliser votre règlement avec :{' '}
                                <span className="font-bold underline">
                                    {getPaymentMethodLabel(error.suggestedMethod)}
                                </span>
                            </p>
                            <button
                                type="button"
                                onClick={() => onSwitch(error.suggestedMethod)}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-amber-700"
                            >
                                <span>
                                    Basculer sur {getPaymentMethodLabel(error.suggestedMethod)}
                                </span>
                                <svg
                                    className="size-3.5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                    aria-hidden="true"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M14 5l7 7m0 0l-7 7m7-7H3"
                                    />
                                </svg>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export function PaymentErrorModal({
    error,
    onClose,
    onSwitch,
}: {
    error: PaymentErrorState | null;
    onClose: () => void;
    onSwitch: (newMethod: PaymentMethodKey) => void;
}) {
    if (!error) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 sm:p-8">
                {/* Icône d'avertissement */}
                <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
                    <svg
                        className="size-8"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                    </svg>
                </div>

                <h3 className="mb-2 text-center text-xl font-bold text-zinc-900 dark:text-zinc-100">
                    Moyen de paiement indisponible
                </h3>

                <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-center text-sm font-medium text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
                    {error.message}
                </p>

                {error.suggestedMethod && (
                    <div className="mb-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-850/50">
                        <p className="mb-1.5 text-center text-xs text-zinc-600 dark:text-zinc-400">
                            Option de paiement viable recommandée :
                        </p>
                        <div className="py-1 text-center text-base font-bold text-zinc-900 dark:text-zinc-100">
                            {getPaymentMethodLabel(error.suggestedMethod)}
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                onSwitch(error.suggestedMethod);
                                onClose();
                            }}
                            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 py-3 text-sm font-bold text-white shadow-md transition hover:bg-primary-700"
                        >
                            <span>
                                Basculer sur {getPaymentMethodLabel(error.suggestedMethod)}
                            </span>
                            <svg
                                className="size-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M14 5l7 7m0 0l-7 7m7-7H3"
                                />
                            </svg>
                        </button>
                    </div>
                )}

                <div className="text-center">
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-xs font-semibold text-zinc-500 transition hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                    >
                        Fermer
                    </button>
                </div>
            </div>
        </div>
    );
}
