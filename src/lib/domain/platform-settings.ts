import { prisma } from '@/lib/prisma';

export type PlatformRentalSettings = {
    // Location standard
    longTermVisitFeeMode: 'individual' | 'global';
    longTermGlobalVisitFee: number; // en euros (ex: 20)
    longTermWidgetButtonLabel: string; // ex: "Prendre rendez-vous"
    longTermDefaultMinLeaseMonths: number; // ex: 12
    longTermShowDepositOnWidget: boolean;
    longTermShowChargesOnWidget: boolean;
    // Location saisonnière
    shortTermServiceFeeRate: number; // pourcentage (ex: 5 pour 5%)
    shortTermDefaultCancellationDays: number; // jours (ex: 7)
};

export const DEFAULT_PLATFORM_RENTAL_SETTINGS: PlatformRentalSettings = {
    longTermVisitFeeMode: 'individual',
    longTermGlobalVisitFee: 20,
    longTermWidgetButtonLabel: 'Prendre rendez-vous',
    longTermDefaultMinLeaseMonths: 12,
    longTermShowDepositOnWidget: true,
    longTermShowChargesOnWidget: true,
    shortTermServiceFeeRate: 5,
    shortTermDefaultCancellationDays: 7,
};

const SETTINGS_KEY = 'platform_rental_settings';

export async function getPlatformRentalSettings(): Promise<PlatformRentalSettings> {
    try {
        const row = await prisma.platformSetting.findUnique({
            where: { key: SETTINGS_KEY },
        });

        if (!row || !row.value) {
            return DEFAULT_PLATFORM_RENTAL_SETTINGS;
        }

        const parsed = JSON.parse(row.value) as Partial<PlatformRentalSettings>;
        return {
            ...DEFAULT_PLATFORM_RENTAL_SETTINGS,
            ...parsed,
        };
    } catch {
        return DEFAULT_PLATFORM_RENTAL_SETTINGS;
    }
}

export function formatLeaseDuration(months: number): string {
    const safeMonths = Math.max(1, months || 12);
    if (safeMonths % 12 === 0) {
        const years = safeMonths / 12;
        return `${years} an${years > 1 ? 's' : ''}`;
    }
    return `${safeMonths} mois`;
}


export type PaymentMethodKey = 'card' | 'paypal' | 'bank_transfer';

export type PlatformPaymentSettings = {
    enableCard: boolean;
    enablePaypal: boolean;
    enableBankTransfer: boolean;
    bankAccountHolder: string;
    bankName: string;
    bankIban: string;
    bankBic: string;
    bankInstructions: string;
};

export const DEFAULT_PLATFORM_PAYMENT_SETTINGS: PlatformPaymentSettings = {
    enableCard: true,
    enablePaypal: false,
    enableBankTransfer: true,
    bankAccountHolder: '',
    bankName: '',
    bankIban: '',
    bankBic: '',
    bankInstructions:
        'Veuillez effectuer le virement sur le compte ci-dessous en indiquant la référence.',
};

export const PAYMENT_SETTINGS_KEY = 'platform_payment_settings';

export async function getPlatformPaymentSettings(): Promise<PlatformPaymentSettings> {
    try {
        const row = await prisma.platformSetting.findUnique({
            where: { key: PAYMENT_SETTINGS_KEY },
        });
        if (!row?.value) {
            return DEFAULT_PLATFORM_PAYMENT_SETTINGS;
        }

        return {
            ...DEFAULT_PLATFORM_PAYMENT_SETTINGS,
            ...(JSON.parse(row.value) as Partial<PlatformPaymentSettings>),
        };
    } catch {
        return DEFAULT_PLATFORM_PAYMENT_SETTINGS;
    }
}

export function listEnabledPaymentMethods(
    settings: PlatformPaymentSettings,
): PaymentMethodKey[] {
    const methods: PaymentMethodKey[] = [];
    if (settings.enableCard) {
        methods.push('card');
    }
    if (settings.enablePaypal) {
        methods.push('paypal');
    }
    if (settings.enableBankTransfer) {
        methods.push('bank_transfer');
    }

    return methods;
}
