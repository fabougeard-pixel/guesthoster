'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { ActionResult } from '@/lib/actions/types';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth/session';
import {
    getPlatformPaymentSettings,
    getPlatformRentalSettings,
    listEnabledPaymentMethods,
} from '@/lib/domain/platform-settings';

const visitBookingSchema = z.object({
    propertySlug: z.string().min(1, 'Logement introuvable.'),
    visitDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date invalide (AAAA-MM-JJ).'),
    timeSlot: z.string().min(2, 'Veuillez choisir un créneau horaire.'),
    name: z.string().trim().min(2, 'Veuillez renseigner votre nom complet.'),
    email: z.string().trim().toLowerCase().email('Adresse e-mail invalide.'),
    phone: z.string().trim().max(30).optional(),
    situation: z.string().trim().max(80).optional(),
    notes: z.string().trim().max(1000).optional(),
    paymentMethod: z
        .enum(['card', 'paypal', 'bank_transfer'])
        .optional(),
});

export type VisitBookingInput = z.infer<typeof visitBookingSchema>;

export type VisitBookingResult = {
    reference: string;
    visitDate: string;
    timeSlot: string;
    visitFee: number;
    name: string;
    email: string;
    phone: string | null;
    status: string;
};

export async function createPropertyVisitAction(
    rawInput: VisitBookingInput,
): Promise<ActionResult<VisitBookingResult>> {
    const parsed = visitBookingSchema.safeParse(rawInput);
    if (!parsed.success) {
        return {
            ok: false,
            error:
                parsed.error.issues[0]?.message ??
                'Les informations fournies sont incomplètes.',
        };
    }

    const data = parsed.data;

    // Validate that visit date is not in the past
    const today = new Date().toISOString().slice(0, 10);
    if (data.visitDate < today) {
        return {
            ok: false,
            error: 'La date de visite ne peut pas être dans le passé.',
        };
    }

    const property = await prisma.property.findUnique({
        where: { slug: data.propertySlug },
        include: {
            owner: true,
        },
    });

    if (!property) {
        return {
            ok: false,
            error: 'Logement introuvable.',
        };
    }

    if (property.rentalDuration !== 'long_term') {
        return {
            ok: false,
            error: 'Ce logement n’est pas configuré en location standard pour les visites.',
        };
    }

    const currentUser = await getCurrentUser();
    const settings = await getPlatformRentalSettings();
    const paymentSettings = await getPlatformPaymentSettings();
    const visitFee =
        settings.longTermVisitFeeMode === 'global'
            ? Math.round(settings.longTermGlobalVisitFee * 100)
            : (property.visitFee ?? 0);

    if (
        visitFee > 0 &&
        (!data.paymentMethod ||
            !listEnabledPaymentMethods(paymentSettings).includes(
                data.paymentMethod,
            ))
    ) {
        return {
            ok: false,
            error: 'Ce moyen de paiement n’est pas disponible. Choisissez-en un autre.',
        };
    }

    // Generate unique reference
    const randPart = Math.random().toString(36).substring(2, 8).toUpperCase();
    const reference = `VISIT-${randPart}`;

    const candidateSummary = [
        data.situation ? `Situation : ${data.situation}` : null,
        data.notes ? `Message : ${data.notes}` : null,
    ]
        .filter(Boolean)
        .join(' — ');

    const visit = await prisma.propertyVisit.create({
        data: {
            reference,
            propertyId: property.id,
            userId: currentUser?.id ?? null,
            name: data.name,
            email: data.email,
            phone: data.phone || null,
            visitDate: new Date(`${data.visitDate}T00:00:00Z`),
            timeSlot: data.timeSlot,
            candidateNotes: candidateSummary || null,
            visitFee,
            paymentMethod: data.paymentMethod ?? (visitFee === 0 ? 'free' : null),
            paymentStatus:
                visitFee === 0
                    ? 'free'
                    : data.paymentMethod === 'bank_transfer'
                      ? 'pending_transfer'
                      : 'paid',
            status: 'confirmed',
            confirmedAt: new Date(),
        },
    });

    // Notify in inquiries or messages if guest user is identified
    try {
        const guestId = currentUser?.id ?? null;
        if (guestId && guestId !== property.userId) {
            const existingInquiry = await prisma.propertyInquiry.findFirst({
                where: {
                    propertyId: property.id,
                    guestId,
                    status: 'open',
                },
            });

            const inquiry =
                existingInquiry ??
                (await prisma.propertyInquiry.create({
                    data: {
                        reference: `INQ-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
                        propertyId: property.id,
                        guestId,
                        hostId: property.userId,
                        isManagedByAdmin: property.managedByAdmin,
                        status: 'open',
                    },
                }));

            await prisma.propertyInquiryMessage.create({
                data: {
                    inquiryId: inquiry.id,
                    senderId: guestId,
                    senderRole: 'guest',
                    body: `📅 Rendez-vous de visite planifié pour le ${data.visitDate} à ${data.timeSlot}.\nRéférence : ${reference}\nNom : ${data.name}\nTéléphone : ${data.phone || 'Non précisé'}\n${candidateSummary ? `Informations : ${candidateSummary}` : ''}`,
                },
            });
        }
    } catch (e) {
        console.warn('[createPropertyVisitAction] Failed to create inquiry message:', e);
    }

    revalidatePath(`/logements/${property.slug}`);

    return {
        ok: true,
        data: {
            reference: visit.reference,
            visitDate: data.visitDate,
            timeSlot: visit.timeSlot,
            visitFee: visit.visitFee,
            name: visit.name,
            email: visit.email,
            phone: visit.phone,
            status: visit.status,
        },
        toast: {
            type: 'success',
            message: 'Votre rendez-vous de visite a été confirmé avec succès !',
        },
    };
}
