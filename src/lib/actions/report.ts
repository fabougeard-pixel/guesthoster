'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getFreshSessionUser } from '@/lib/auth/session';
import { REPORT_REASON_LABELS } from '@/lib/domain/enums';
import { notifyReportCreated } from '@/lib/notifications/service';
import { prisma } from '@/lib/prisma';
import type { ActionResult } from './types';

const reportSchema = z.object({
    propertySlug: z.string().min(1),
    reason: z.enum([
        'fake',
        'inaccurate',
        'scam',
        'inappropriate',
        'security',
        'other',
    ]),
    details: z.string().trim().max(1000).optional().or(z.literal('')),
    contactEmail: z.string().trim().email().optional().or(z.literal('')),
});

export async function reportPropertyAction(input: {
    propertySlug: string;
    reason: 'fake' | 'inaccurate' | 'scam' | 'inappropriate' | 'security' | 'other';
    details?: string;
    contactEmail?: string;
}): Promise<ActionResult> {
    const parsed = reportSchema.safeParse(input);
    if (!parsed.success) {
        return { ok: false, error: 'Informations de signalement invalides.' };
    }

    const property = await prisma.property.findUnique({
        where: { slug: parsed.data.propertySlug },
        select: { id: true, title: true, slug: true },
    });

    if (!property) {
        return { ok: false, error: 'Annonce introuvable.' };
    }

    const user = await getFreshSessionUser();
    const reporterName = user ? user.name : 'Visiteur anonyme';
    const reporterEmail = user ? user.email : parsed.data.contactEmail || 'Non communiqué';
    const reasonLabel = REPORT_REASON_LABELS[parsed.data.reason] ?? parsed.data.reason;

    await prisma.propertyReport.create({
        data: {
            propertyId: property.id,
            userId: user ? user.id : null,
            reporterName,
            reporterEmail,
            reason: parsed.data.reason,
            details: parsed.data.details || null,
            status: 'pending',
        },
    });

    try {
        await notifyReportCreated({
            propertyTitle: property.title,
            propertySlug: property.slug,
            reasonLabel,
            details: parsed.data.details || null,
            reporterName,
            reporterEmail,
        });
    } catch (e) {
        console.warn('[reportPropertyAction] Failed to dispatch admin alert email:', e);
    }

    console.info(
        `[SIGNALEMENT ANNONCE] Logement "${property.title}" (${property.slug}) signalé par ${reporterName} (${reporterEmail}) : Motif = "${reasonLabel}", Détails = "${parsed.data.details || 'Aucun détail'}"`,
    );

    revalidatePath('/admin/signalements');
    revalidatePath('/admin/logements');

    return {
        ok: true,
        toast: {
            type: 'success',
            message:
                'Merci pour votre vigilance. Notre équipe de conformité et de sécurité a bien enregistré votre signalement et va procéder aux vérifications.',
        },
    };
}

export async function updatePropertyReportStatusAction(input: {
    reportId: number;
    status: 'resolved' | 'dismissed' | 'pending';
    adminNotes?: string;
}): Promise<ActionResult> {
    const user = await getFreshSessionUser();
    if (!user || user.role !== 'admin') {
        return { ok: false, error: 'Accès administrateur requis.' };
    }

    const report = await prisma.propertyReport.findUnique({
        where: { id: input.reportId },
    });
    if (!report) {
        return { ok: false, error: 'Signalement introuvable.' };
    }

    await prisma.propertyReport.update({
        where: { id: input.reportId },
        data: {
            status: input.status,
            adminNotes: input.adminNotes !== undefined ? input.adminNotes : report.adminNotes,
            resolvedAt: input.status !== 'pending' ? new Date() : null,
        },
    });

    revalidatePath('/admin/signalements');
    revalidatePath('/admin/logements');

    return {
        ok: true,
        toast: {
            type: 'success',
            message:
                input.status === 'resolved'
                    ? 'Signalement marqué comme traité.'
                    : input.status === 'dismissed'
                      ? 'Signalement classé sans suite.'
                      : 'Statut du signalement réinitialisé.',
        },
    };
}

export async function suspendPropertyByReportAction(input: {
    reportId: number;
    propertyId: number;
    rejectionReason: string;
}): Promise<ActionResult> {
    const user = await getFreshSessionUser();
    if (!user || user.role !== 'admin') {
        return { ok: false, error: 'Accès administrateur requis.' };
    }

    const reason =
        input.rejectionReason.trim() ||
        'Annonce suspendue suite à signalement et vérification de conformité.';

    await prisma.$transaction([
        prisma.property.update({
            where: { id: input.propertyId },
            data: {
                status: 'rejected',
                rejectionReason: reason,
            },
        }),
        prisma.propertyReport.update({
            where: { id: input.reportId },
            data: {
                status: 'resolved',
                adminNotes: `Annonce masquée/suspendue du catalogue public. Motif : ${reason}`,
                resolvedAt: new Date(),
            },
        }),
    ]);

    revalidatePath('/admin/signalements');
    revalidatePath('/admin/logements');
    revalidatePath('/logements');

    return {
        ok: true,
        toast: {
            type: 'success',
            message:
                'Annonce suspendue du catalogue et signalement marqué comme résolu.',
        },
    };
}
