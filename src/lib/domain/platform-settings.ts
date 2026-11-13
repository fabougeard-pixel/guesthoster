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

