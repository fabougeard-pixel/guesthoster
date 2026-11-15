'use server';

import { z } from 'zod';
import { getFreshSessionUser } from '@/lib/auth/session';
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

const REASON_LABELS: Record<string, string> = {
    fake: 'Logement frauduleux ou annonce fictive',
    inaccurate: 'Informations, adresse ou photos inexactes',
    scam: 'Demande de paiement en dehors de GuestHoster',
    inappropriate: 'Contenu déplacé, discriminatoire ou offensant',
    security: 'Problème de salubrité ou de sécurité',
    other: 'Autre motif',
};

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
    const reasonLabel = REASON_LABELS[parsed.data.reason] ?? parsed.data.reason;

    // Log pour la modération et notification interne
    console.info(
        `[SIGNALEMENT ANNONCE] Logement "${property.title}" (${property.slug}) signalé par ${reporterName} (${reporterEmail}) : Motif = "${reasonLabel}", Détails = "${parsed.data.details || 'Aucun détail'}"`,
    );

    return {
        ok: true,
        toast: {
            type: 'success',
            message:
                'Merci pour votre vigilance. Notre équipe de conformité et de sécurité a bien enregistré votre signalement et va procéder aux vérifications.',
        },
    };
}
