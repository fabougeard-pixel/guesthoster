'use server';

import crypto from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { getFreshSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/services/resend';
import type { ActionResult } from './types';
import type { InquiryMessage, PropertyInquiryDetail } from '@/types';

function formatMessageDate(date: Date | null): string {
    if (!date) {
        return '';
    }
    return new Intl.DateTimeFormat('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
}

export async function getOrCreateInquiryAction(
    propertySlug: string,
): Promise<ActionResult<{ inquiry: PropertyInquiryDetail; isCounterpartAdmin: boolean }>> {
    const user = await getFreshSessionUser();
    if (!user) {
        return {
            ok: false,
            error: 'Veuillez vous connecter pour contacter l’hôte.',
        };
    }

    const property = await prisma.property.findUnique({
        where: { slug: propertySlug },
        include: {
            owner: { select: { id: true, name: true, email: true } },
        },
    });

    if (!property) {
        return { ok: false, error: 'Logement introuvable.' };
    }

    // Le propriétaire ne peut pas se contacter lui-même
    if (user.id === property.userId) {
        return {
            ok: false,
            error: 'Vous êtes le propriétaire de ce logement.',
        };
    }

    // Recherche d'une conversation ouverte existante
    let inquiry = await prisma.propertyInquiry.findFirst({
        where: {
            propertyId: property.id,
            guestId: user.id,
            status: 'open',
        },
        include: {
            property: { select: { id: true, title: true, slug: true, managedByAdmin: true } },
            guest: { select: { id: true, name: true, email: true } },
            host: { select: { id: true, name: true, email: true } },
            messages: {
                orderBy: { createdAt: 'asc' },
                include: { sender: { select: { id: true, name: true, role: true } } },
            },
        },
    });

    if (!inquiry) {
        const reference = `INQ-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
        inquiry = await prisma.propertyInquiry.create({
            data: {
                reference,
                propertyId: property.id,
                guestId: user.id,
                hostId: property.userId,
                isManagedByAdmin: property.managedByAdmin,
                status: 'open',
            },
            include: {
                property: { select: { id: true, title: true, slug: true, managedByAdmin: true } },
                guest: { select: { id: true, name: true, email: true } },
                host: { select: { id: true, name: true, email: true } },
                messages: {
                    orderBy: { createdAt: 'asc' },
                    include: { sender: { select: { id: true, name: true, role: true } } },
                },
            },
        });
    }

    const isCounterpartAdmin = inquiry.isManagedByAdmin;

    const messages: InquiryMessage[] = inquiry.messages.map((m) => {
        let senderName = m.sender.name;
        // Si c'est l'administrateur qui a répondu sur un bien géré, le client voit le nom de l'hôte
        if (m.senderRole === 'admin') {
            senderName = user.role === 'admin'
                ? `${inquiry.host.name} (Conciergerie Admin)`
                : inquiry.host.name;
        } else if (m.senderRole === 'host') {
            senderName = inquiry.host.name;
        } else {
            senderName = inquiry.guest.name;
        }

        return {
            id: m.id,
            inquiry_id: m.inquiryId,
            sender_id: m.senderId,
            sender_role: m.senderRole as 'guest' | 'host' | 'admin',
            sender_name: senderName,
            body: m.body,
            read_at: m.readAt ? m.readAt.toISOString() : null,
            created_at: m.createdAt ? m.createdAt.toISOString() : null,
        };
    });

    return {
        ok: true,
        data: {
            inquiry: {
                id: inquiry.id,
                reference: inquiry.reference,
                property_id: inquiry.propertyId,
                property_title: inquiry.property.title,
                property_slug: inquiry.property.slug,
                guest_id: inquiry.guestId,
                guest_name: inquiry.guest.name,
                guest_email: inquiry.guest.email,
                host_id: inquiry.hostId,
                host_name: inquiry.host.name,
                host_email: inquiry.host.email,
                is_managed_by_admin: inquiry.isManagedByAdmin,
                status: inquiry.status as 'open' | 'closed',
                closed_at: inquiry.closedAt ? inquiry.closedAt.toISOString() : null,
                recap_sent_at: inquiry.recapSentAt ? inquiry.recapSentAt.toISOString() : null,
                created_at: inquiry.createdAt ? inquiry.createdAt.toISOString() : null,
                messages,
            },
            isCounterpartAdmin,
        },
    };
}

export async function sendInquiryMessageAction(input: {
    reference: string;
    body: string;
}): Promise<ActionResult<{ message: InquiryMessage }>> {
    const user = await getFreshSessionUser();
    if (!user) {
        return { ok: false, error: 'Session expirée. Veuillez vous reconnecter.' };
    }

    const trimmed = input.body.trim();
    if (!trimmed) {
        return { ok: false, fieldErrors: { body: 'Le message ne peut pas être vide.' } };
    }

    const inquiry = await prisma.propertyInquiry.findUnique({
        where: { reference: input.reference },
        include: {
            property: { select: { title: true, slug: true } },
            guest: { select: { id: true, name: true, email: true } },
            host: { select: { id: true, name: true, email: true } },
        },
    });

    if (!inquiry) {
        return { ok: false, error: 'Conversation introuvable.' };
    }

    if (inquiry.status === 'closed') {
        return {
            ok: false,
            error: 'Cette session de chat a été clôturée. Ouvrez une nouvelle demande.',
        };
    }

    const isGuest = inquiry.guestId === user.id;
    const isHost = inquiry.hostId === user.id;
    const isAdmin = user.role === 'admin';

    if (!isGuest && !isHost && !isAdmin) {
        return { ok: false, error: 'Accès non autorisé à cette conversation.' };
    }

    let senderRole: 'guest' | 'host' | 'admin' = 'guest';
    if (isAdmin && inquiry.isManagedByAdmin && !isGuest) {
        senderRole = 'admin';
    } else if (isHost) {
        senderRole = 'host';
    }

    const message = await prisma.propertyInquiryMessage.create({
        data: {
            inquiryId: inquiry.id,
            senderId: user.id,
            senderRole,
            body: trimmed,
        },
    });

    // Touch updatedAt
    await prisma.propertyInquiry.update({
        where: { id: inquiry.id },
        data: { updatedAt: new Date() },
    });

    let senderName = user.name;
    if (senderRole === 'admin') {
        senderName = user.role === 'admin'
            ? `${inquiry.host.name} (Conciergerie Admin)`
            : inquiry.host.name;
    } else if (senderRole === 'host') {
        senderName = inquiry.host.name;
    }

    revalidatePath(`/logements/${inquiry.property.slug}`);
    revalidatePath('/messages');
    revalidatePath('/admin/messages');

    return {
        ok: true,
        data: {
            message: {
                id: message.id,
                inquiry_id: message.inquiryId,
                sender_id: message.senderId,
                sender_role: message.senderRole as 'guest' | 'host' | 'admin',
                sender_name: senderName,
                body: message.body,
                read_at: null,
                created_at: message.createdAt ? message.createdAt.toISOString() : null,
            },
        },
    };
}

export async function closeInquiryAndSendRecapAction(
    reference: string,
): Promise<ActionResult<{ recapSent: boolean }>> {
    const user = await getFreshSessionUser();
    if (!user) {
        return { ok: false, error: 'Session expirée.' };
    }

    const inquiry = await prisma.propertyInquiry.findUnique({
        where: { reference },
        include: {
            property: { select: { title: true, slug: true } },
            guest: { select: { id: true, name: true, email: true } },
            host: { select: { id: true, name: true, email: true } },
            messages: {
                orderBy: { createdAt: 'asc' },
                include: { sender: { select: { name: true } } },
            },
        },
    });

    if (!inquiry) {
        return { ok: false, error: 'Conversation introuvable.' };
    }

    const isHost = inquiry.hostId === user.id;
    const isAdmin = user.role === 'admin';

    if (!isHost && !isAdmin) {
        return {
            ok: false,
            error: 'Seul l’hôte ou l’administrateur de conciergerie peut clôturer cette session.',
        };
    }

    let recapSent = false;

    // Si le bien est géré par la conciergerie (Admin), envoyer un email récapitulatif complet au propriétaire
    if (inquiry.isManagedByAdmin && inquiry.host.email) {
        const messageLines = inquiry.messages.map((m) => {
            const timeStr = formatMessageDate(m.createdAt);
            const speaker =
                m.senderRole === 'admin'
                    ? `Conciergerie (pour vous)`
                    : m.senderRole === 'host'
                      ? 'Vous'
                      : `Voyageur (${inquiry.guest.name})`;
            return `• [${timeStr}] ${speaker} : « ${m.body} »`;
        });

        const lines = [
            `Une session d'échange en direct vient de se terminer concernant votre bien en conciergerie : "${inquiry.property.title}".`,
            `Le voyageur "${inquiry.guest.name}" (${inquiry.guest.email}) a posé des questions préalables auxquelles notre conciergerie a répondu en votre nom.`,
            `Voici le récapitulatif complet des échanges :`,
            '',
            ...messageLines,
            '',
            `Statut de la session : Clôturée le ${formatMessageDate(new Date())}.`,
            `Vous pouvez retrouver les détails de votre logement et de vos réservations sur votre espace hôte GuestHoster.`,
        ];

        try {
            await sendEmail({
                to: inquiry.host.email,
                subject: `Récapitulatif des échanges : ${inquiry.property.title} · Conciergerie GuestHoster`,
                greeting: `Bonjour ${inquiry.host.name},`,
                lines,
            });
            recapSent = true;
        } catch (e) {
            console.error('Erreur lors de l’envoi de l’email récapitulatif :', e);
        }
    }

    await prisma.propertyInquiry.update({
        where: { id: inquiry.id },
        data: {
            status: 'closed',
            closedAt: new Date(),
            ...(recapSent ? { recapSentAt: new Date() } : {}),
        },
    });

    revalidatePath(`/logements/${inquiry.property.slug}`);
    revalidatePath('/messages');
    revalidatePath('/admin/messages');

    return {
        ok: true,
        data: { recapSent },
        toast: {
            type: 'success',
            message: recapSent
                ? `Session clôturée. Le récapitulatif des échanges a été envoyé à ${inquiry.host.email}.`
                : 'Session de chat clôturée.',
        },
    };
}

