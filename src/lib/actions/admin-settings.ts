'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { ActionResult } from '@/lib/actions/types';
import { resolveAdminAccess } from '@/lib/auth/session';
import {
    PAYMENT_SETTINGS_KEY,
    type PlatformPaymentSettings,
    type PlatformRentalSettings,
} from '@/lib/domain/platform-settings';
import { prisma } from '@/lib/prisma';

const settingsSchema = z.object({
    longTermVisitFeeMode: z.enum(['individual', 'global']),
    longTermGlobalVisitFee: z.number().int().min(0).max(1000),
    longTermWidgetButtonLabel: z.string().trim().min(2).max(60),
    longTermDefaultMinLeaseMonths: z.number().int().min(1).max(120),
    longTermShowDepositOnWidget: z.boolean(),
    longTermShowChargesOnWidget: z.boolean(),
    shortTermServiceFeeRate: z.number().min(0).max(50),
    shortTermDefaultCancellationDays: z.number().int().min(0).max(90),
});

export async function updatePlatformRentalSettingsAction(
    input: PlatformRentalSettings,
): Promise<ActionResult<PlatformRentalSettings>> {
    const access = await resolveAdminAccess('/admin/parametres');
    if (access === 'setup' || access === 'forbidden') {
        return { ok: false, error: 'Accès réservé aux administrateurs.' };
    }

    const parsed = settingsSchema.safeParse(input);
    if (!parsed.success) {
        return {
            ok: false,
            error:
                parsed.error.issues[0]?.message ??
                'Les paramètres fournis sont invalides.',
        };
    }

    const value = JSON.stringify(parsed.data);

    await prisma.platformSetting.upsert({
        where: { key: 'platform_rental_settings' },
        create: {
            key: 'platform_rental_settings',
            value,
            description: 'Configuration globale des locations saisonnières et standards',
        },
        update: {
            value,
        },
    });

    revalidatePath('/admin');
    revalidatePath('/admin/parametres');
    revalidatePath('/logements');
    revalidatePath('/');

    return {
        ok: true,
        data: parsed.data,
        toast: {
            type: 'success',
            message: 'Paramètres de configuration enregistrés avec succès.',
        },
    };
}

const paymentSettingsSchema = z
    .object({
        enableCard: z.boolean(),
        enablePaypal: z.boolean(),
        enableBankTransfer: z.boolean(),
        bankAccountHolder: z.string().trim().max(120),
        bankName: z.string().trim().max(120),
        bankIban: z.string().trim().max(40),
        bankBic: z.string().trim().max(20),
        bankInstructions: z.string().trim().max(500),
    })
    .refine((v) => v.enableCard || v.enablePaypal || v.enableBankTransfer, {
        message: 'Activez au moins un moyen de paiement.',
    })
    .refine((v) => !v.enableBankTransfer || (v.bankIban && v.bankAccountHolder), {
        message: 'Renseignez le titulaire et l’IBAN pour activer le virement.',
    });

export async function updatePlatformPaymentSettingsAction(
    input: PlatformPaymentSettings,
): Promise<ActionResult<PlatformPaymentSettings>> {
    const access = await resolveAdminAccess('/admin/paiements');
    if (access === 'setup' || access === 'forbidden') {
        return { ok: false, error: 'Accès réservé aux administrateurs.' };
    }

    const parsed = paymentSettingsSchema.safeParse(input);
    if (!parsed.success) {
        return {
            ok: false,
            error: parsed.error.issues[0]?.message ?? 'Paramètres invalides.',
        };
    }

    const value = JSON.stringify(parsed.data);
    await prisma.platformSetting.upsert({
        where: { key: PAYMENT_SETTINGS_KEY },
        create: {
            key: PAYMENT_SETTINGS_KEY,
            value,
            description: 'Moyens de paiement activés et coordonnées bancaires',
        },
        update: { value },
    });

    revalidatePath('/admin/paiements');
    revalidatePath('/logements', 'layout');
    revalidatePath('/reservations', 'layout');

    return {
        ok: true,
        data: parsed.data,
        toast: { type: 'success', message: 'Moyens de paiement enregistrés.' },
    };
}
