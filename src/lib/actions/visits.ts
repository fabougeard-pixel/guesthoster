'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { ActionResult } from '@/lib/actions/types';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth/session';
import { env } from '@/lib/env';
import { getStripeClient, isStripeConfigured } from '@/lib/services/stripe';
import {
    getPlatformPaymentSettings,
    getPlatformRentalSettings,
    listEnabledPaymentMethods,
} from '@/lib/domain/platform-settings';
import {
    notifyVisitCancelled,
    notifyVisitRequested,
} from '@/lib/notifications/service';

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
    paymentMethod?: string | null;
    paymentStatus?: string | null;
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
            error: 'Ce logement n’est pas configuré en location classique pour les visites.',
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
                      : 'pending',
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
                    body: `📅 Rendez-vous de visite planifié avec le propriétaire pour le ${data.visitDate} à ${data.timeSlot}.\nRéférence : ${reference}\nCandidat : ${data.name}\nTéléphone : ${data.phone || 'Non précisé'}\n${candidateSummary ? `Informations : ${candidateSummary}` : ''}`,
                },
            });
        }
    } catch (e) {
        console.warn('[createPropertyVisitAction] Failed to create inquiry message:', e);
    }

    // Notifications & emails transactionnels au Propriétaire et au Candidat
    try {
        await notifyVisitRequested({
            propertyId: property.id,
            propertyTitle: property.title,
            propertySlug: property.slug,
            ownerId: property.owner.id,
            ownerEmail: property.owner.email,
            ownerName: property.owner.name,
            candidateName: data.name,
            candidateEmail: data.email,
            candidatePhone: data.phone,
            visitDate: data.visitDate,
            timeSlot: data.timeSlot,
            reference,
            visitFee,
            candidateNotes: candidateSummary,
        });
    } catch (e) {
        console.warn('[createPropertyVisitAction] Failed to dispatch notifications:', e);
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
            paymentMethod: visit.paymentMethod,
            paymentStatus: visit.paymentStatus,
        },
        toast: {
            type: 'success',
            message: 'Votre rendez-vous de visite a été confirmé avec succès !',
        },
    };
}

export async function updatePropertyVisitStatusAction(input: {
    visitId: number;
    status: 'completed' | 'cancelled';
    cancelReason?: string;
}): Promise<ActionResult> {
    const user = await getCurrentUser();
    if (!user) {
        return { ok: false, error: 'Authentification requise.' };
    }

    const visit = await prisma.propertyVisit.findUnique({
        where: { id: input.visitId },
        include: {
            property: {
                select: {
                    id: true,
                    title: true,
                    slug: true,
                    userId: true,
                },
            },
        },
    });

    if (!visit) {
        return { ok: false, error: 'Rendez-vous de visite introuvable.' };
    }

    const isAdmin = user.role === 'admin';
    const isOwner = visit.property.userId === user.id;

    if (!isAdmin && !isOwner) {
        return {
            ok: false,
            error: 'Vous n’avez pas les droits pour modifier cette visite.',
        };
    }

    if (input.status === 'cancelled') {
        await prisma.propertyVisit.update({
            where: { id: visit.id },
            data: {
                status: 'cancelled',
                cancelledAt: new Date(),
            },
        });

        try {
            await notifyVisitCancelled({
                propertyTitle: visit.property.title,
                propertySlug: visit.property.slug,
                candidateName: visit.name,
                candidateEmail: visit.email,
                candidateUserId: visit.userId,
                visitDate: visit.visitDate.toISOString().slice(0, 10),
                timeSlot: visit.timeSlot,
                reference: visit.reference,
                reason: input.cancelReason?.trim() || null,
                cancelledBy: isAdmin ? 'admin' : 'owner',
            });
        } catch (e) {
            console.warn('[updatePropertyVisitStatusAction] Error sending cancel notification:', e);
        }

        revalidatePath('/hote/visites');
        revalidatePath('/admin/visites');
        revalidatePath('/hote');

        return {
            ok: true,
            toast: {
                type: 'info',
                message: 'Le rendez-vous de visite a été annulé.',
            },
        };
    }

    if (input.status === 'completed') {
        await prisma.propertyVisit.update({
            where: { id: visit.id },
            data: {
                status: 'completed',
            },
        });

        revalidatePath('/hote/visites');
        revalidatePath('/admin/visites');
        revalidatePath('/hote');

        return {
            ok: true,
            toast: {
                type: 'success',
                message: 'La visite a été marquée comme effectuée.',
            },
        };
    }

    return { ok: false, error: 'Statut de visite invalide.' };
}

export async function confirmVisitBankTransferAction(
    visitId: number,
): Promise<ActionResult> {
    const user = await getCurrentUser();
    if (!user) {
        return { ok: false, error: 'Authentification requise.' };
    }

    const visit = await prisma.propertyVisit.findUnique({
        where: { id: visitId },
        include: {
            property: { select: { userId: true } },
        },
    });

    if (!visit) {
        return { ok: false, error: 'Visite introuvable.' };
    }

    const isAdmin = user.role === 'admin';
    const isOwner = visit.property.userId === user.id;

    if (!isAdmin && !isOwner) {
        return { ok: false, error: 'Accès refusé.' };
    }

    await prisma.propertyVisit.update({
        where: { id: visit.id },
        data: {
            paymentStatus: 'paid',
        },
    });

    revalidatePath('/hote/visites');
    revalidatePath('/admin/visites');

    return {
        ok: true,
        toast: {
            type: 'success',
            message: 'Le règlement des frais de visite par virement a été validé.',
        },
    };
}

export async function confirmVisitPaymentAction(input: {
    reference: string;
    paymentMethod: 'card' | 'paypal' | 'bank_transfer';
    transactionId?: string;
}): Promise<ActionResult<{ success: boolean }>> {
    try {
        const visit = await prisma.propertyVisit.findUnique({
            where: { reference: input.reference },
        });

        if (!visit) {
            return { ok: false, error: 'Demande de location introuvable.' };
        }

        await prisma.propertyVisit.update({
            where: { reference: input.reference },
            data: {
                paymentMethod: input.paymentMethod,
                paymentStatus:
                    input.paymentMethod === 'bank_transfer'
                        ? 'pending_transfer'
                        : 'paid',
                confirmedAt: new Date(),
            },
        });

        revalidatePath('/hote/visites');
        revalidatePath('/admin/visites');

        return {
            ok: true,
            data: { success: true },
            toast: {
                type: 'success',
                message:
                    input.paymentMethod === 'bank_transfer'
                        ? 'Ordre de virement bien enregistré.'
                        : 'Paiement de la caution reçu et confirmé !',
            },
        };
    } catch (e) {
        return {
            ok: false,
            error:
                e instanceof Error
                    ? e.message
                    : 'Erreur inattendue lors de la confirmation du paiement.',
        };
    }
}

export async function initiateVisitPaymentAction(
    reference: string,
): Promise<ActionResult<{ checkoutUrl: string }>> {
    if (!isStripeConfigured()) {
        return {
            ok: false,
            error: 'Le paiement Stripe n’est pas configuré sur ce serveur.',
        };
    }

    const visit = await prisma.propertyVisit.findUnique({
        where: { reference },
        include: {
            property: { select: { title: true, slug: true } },
        },
    });

    if (!visit) {
        return { ok: false, error: 'Demande introuvable.' };
    }

    try {
        const stripe = getStripeClient();
        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            locale: 'fr',
            customer_email: visit.email,
            client_reference_id: visit.reference,
            metadata: {
                visit_reference: visit.reference,
                property_id: String(visit.propertyId),
            },
            payment_intent_data: {
                metadata: {
                    visit_reference: visit.reference,
                    property_id: String(visit.propertyId),
                },
            },
            line_items: [
                {
                    quantity: 1,
                    price_data: {
                        currency: env.stripeCurrency,
                        unit_amount: visit.visitFee,
                        product_data: {
                            name: `Caution de location · ${visit.property.title}`,
                            description: `Garantie / caution pour le logement ${visit.property.title} (réf. ${visit.reference})`,
                        },
                    },
                },
            ],
            success_url: `${env.appUrl}/logements/${visit.property.slug}?paid_visit=${visit.reference}`,
            cancel_url: `${env.appUrl}/logements/${visit.property.slug}?cancel_visit=${visit.reference}`,
        });

        if (!session.url) {
            return {
                ok: false,
                error: 'Impossible de générer le lien de paiement Stripe.',
            };
        }

        return { ok: true, data: { checkoutUrl: session.url } };
    } catch (e) {
        return {
            ok: false,
            error:
                e instanceof Error
                    ? e.message
                    : 'Erreur Stripe lors de l’initialisation.',
        };
    }
}

