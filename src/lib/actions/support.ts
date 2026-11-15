'use server';

import crypto from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getFreshSessionUser, isAdmin } from '@/lib/auth/session';
import { SUPPORT_CATEGORIES, type SupportCategory } from '@/lib/domain/enums';
import { prisma } from '@/lib/prisma';
import type { ActionResult, FieldErrors } from './types';
import type { SupportTicketDetail, SupportTicketMessage } from '@/types';

function zodToFieldErrors(error: z.ZodError): FieldErrors {
    const res: FieldErrors = {};
    for (const issue of error.issues) {
        const key = issue.path[0];
        if (typeof key === 'string' && !res[key]) {
            res[key] = issue.message;
        }
    }
    return res;
}

const createSupportSchema = z.object({
    name: z
        .string()
        .trim()
        .min(2, 'Le nom doit comporter au moins 2 caractères.')
        .max(120),
    email: z
        .string()
        .trim()
        .toLowerCase()
        .email('Adresse e-mail invalide.')
        .max(150),
    phone: z.string().trim().max(40).optional().or(z.literal('')),
    category: z.enum(SUPPORT_CATEGORIES, {
        message: 'Veuillez sélectionner une catégorie valide.',
    }),
    message: z
        .string()
        .trim()
        .min(5, 'Votre message doit comporter au moins 5 caractères.')
        .max(4000),
});

export async function createSupportTicketAction(input: {
    name: string;
    email: string;
    phone?: string | null;
    category: SupportCategory;
    message: string;
}): Promise<ActionResult<{ ticket: SupportTicketDetail }>> {
    const parsed = createSupportSchema.safeParse(input);
    if (!parsed.error && parsed.data) {
        // ok
    } else {
        return { ok: false, fieldErrors: zodToFieldErrors(parsed.error!) };
    }

    const user = await getFreshSessionUser();
    const reference = `SUP-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    const { name, email, phone, category, message: messageText } = parsed.data;

    // Créer le ticket support
    const ticket = await prisma.supportTicket.create({
        data: {
            reference,
            userId: user ? user.id : null,
            name,
            email,
            phone: phone || null,
            category,
            status: 'open',
            priority: category === 'Paiements' ? 'urgent' : 'normal',
        },
    });

    // Message 1 : message de l'utilisateur
    const userMessage = await prisma.supportTicketMessage.create({
        data: {
            ticketId: ticket.id,
            senderId: user ? user.id : null,
            senderRole: 'user',
            senderName: name,
            body: messageText,
        },
    });

    // Message 2 : message automatique immédiat du Support Guest Hoster
    const welcomeText =
        category === 'Paiements'
            ? `Bonjour ${name} ! Votre demande urgente concernant les paiements a bien été transmise à notre équipe support. Pour votre sécurité, toutes les transactions sont protégées par Guest Hoster. Un conseiller prend en charge votre conversation, veuillez patienter un instant...`
            : `Bonjour ${name} ! Votre demande concernant « ${category} » a bien été enregistrée par le support Guest Hoster. Un conseiller prend en charge votre conversation, veuillez patienter un instant...`;

    const supportWelcome = await prisma.supportTicketMessage.create({
        data: {
            ticketId: ticket.id,
            senderId: null,
            senderRole: 'admin',
            senderName: 'Guest Hoster (Support Client)',
            body: welcomeText,
        },
    });

    revalidatePath('/admin/messages');
    revalidatePath('/admin');

    const messages: SupportTicketMessage[] = [
        {
            id: userMessage.id,
            ticket_id: userMessage.ticketId,
            sender_id: userMessage.senderId,
            sender_role: 'user',
            sender_name: userMessage.senderName,
            body: userMessage.body,
            read_at: null,
            created_at: userMessage.createdAt ? userMessage.createdAt.toISOString() : new Date().toISOString(),
        },
        {
            id: supportWelcome.id,
            ticket_id: supportWelcome.ticketId,
            sender_id: null,
            sender_role: 'admin',
            sender_name: 'Guest Hoster (Support Client)',
            body: supportWelcome.body,
            read_at: null,
            created_at: supportWelcome.createdAt ? supportWelcome.createdAt.toISOString() : new Date().toISOString(),
        },
    ];

    return {
        ok: true,
        data: {
            ticket: {
                id: ticket.id,
                reference: ticket.reference,
                user_id: ticket.userId,
                name: ticket.name,
                email: ticket.email,
                phone: ticket.phone,
                category: ticket.category as SupportCategory,
                subject: ticket.subject,
                status: ticket.status as 'open' | 'in_progress' | 'resolved' | 'closed',
                priority: ticket.priority as 'normal' | 'urgent',
                resolved_at: ticket.resolvedAt ? ticket.resolvedAt.toISOString() : null,
                created_at: ticket.createdAt ? ticket.createdAt.toISOString() : new Date().toISOString(),
                updated_at: ticket.updatedAt ? ticket.updatedAt.toISOString() : new Date().toISOString(),
                messages,
            },
        },
    };
}

export async function getSupportTicketAction(
    reference: string,
): Promise<ActionResult<{ ticket: SupportTicketDetail }>> {
    const ticket = await prisma.supportTicket.findUnique({
        where: { reference },
        include: {
            messages: {
                orderBy: { createdAt: 'asc' },
            },
        },
    });

    if (!ticket) {
        return { ok: false, error: 'Ticket de support introuvable.' };
    }

    const messages: SupportTicketMessage[] = ticket.messages.map((m) => ({
        id: m.id,
        ticket_id: m.ticketId,
        sender_id: m.senderId,
        sender_role: m.senderRole as 'user' | 'admin' | 'system',
        sender_name: m.senderName,
        body: m.body,
        read_at: m.readAt ? m.readAt.toISOString() : null,
        created_at: m.createdAt ? m.createdAt.toISOString() : null,
    }));

    return {
        ok: true,
        data: {
            ticket: {
                id: ticket.id,
                reference: ticket.reference,
                user_id: ticket.userId,
                name: ticket.name,
                email: ticket.email,
                phone: ticket.phone,
                category: ticket.category as SupportCategory,
                subject: ticket.subject,
                status: ticket.status as 'open' | 'in_progress' | 'resolved' | 'closed',
                priority: ticket.priority as 'normal' | 'urgent',
                resolved_at: ticket.resolvedAt ? ticket.resolvedAt.toISOString() : null,
                created_at: ticket.createdAt ? ticket.createdAt.toISOString() : null,
                updated_at: ticket.updatedAt ? ticket.updatedAt.toISOString() : null,
                messages,
            },
        },
    };
}

export async function sendSupportTicketMessageAction(input: {
    reference: string;
    body: string;
}): Promise<ActionResult<{ message: SupportTicketMessage }>> {
    const trimmed = input.body.trim();
    if (!trimmed) {
        return { ok: false, fieldErrors: { body: 'Le message ne peut pas être vide.' } };
    }

    const ticket = await prisma.supportTicket.findUnique({
        where: { reference: input.reference },
    });

    if (!ticket) {
        return { ok: false, error: 'Ticket support introuvable.' };
    }

    if (ticket.status === 'closed') {
        return { ok: false, error: 'Cette demande a été clôturée.' };
    }

    const user = await getFreshSessionUser();
    const isUserAdmin = user ? isAdmin(user) : false;

    const senderRole: 'admin' | 'user' = isUserAdmin ? 'admin' : 'user';
    const senderName = isUserAdmin
        ? 'Guest Hoster (Support Client)'
        : user?.name || ticket.name;

    const message = await prisma.supportTicketMessage.create({
        data: {
            ticketId: ticket.id,
            senderId: user ? user.id : null,
            senderRole,
            senderName,
            body: trimmed,
        },
    });

    // Touch ticket updatedAt
    await prisma.supportTicket.update({
        where: { id: ticket.id },
        data: {
            updatedAt: new Date(),
            status: isUserAdmin && ticket.status === 'open' ? 'in_progress' : ticket.status,
        },
    });

    revalidatePath('/admin/messages');

    return {
        ok: true,
        data: {
            message: {
                id: message.id,
                ticket_id: message.ticketId,
                sender_id: message.senderId,
                sender_role: senderRole,
                sender_name: senderName,
                body: message.body,
                read_at: null,
                created_at: message.createdAt ? message.createdAt.toISOString() : new Date().toISOString(),
            },
        },
    };
}

export async function updateSupportTicketStatusAction(input: {
    reference: string;
    status: 'open' | 'in_progress' | 'resolved' | 'closed';
}): Promise<ActionResult<{ status: string }>> {
    const user = await getFreshSessionUser();
    if (!user || !isAdmin(user)) {
        return { ok: false, error: 'Accès réservé aux administrateurs.' };
    }

    const ticket = await prisma.supportTicket.findUnique({
        where: { reference: input.reference },
    });

    if (!ticket) {
        return { ok: false, error: 'Ticket introuvable.' };
    }

    await prisma.supportTicket.update({
        where: { id: ticket.id },
        data: {
            status: input.status,
            resolvedAt: input.status === 'resolved' || input.status === 'closed' ? new Date() : null,
            updatedAt: new Date(),
        },
    });

    revalidatePath('/admin/messages');

    return {
        ok: true,
        data: { status: input.status },
        toast: {
            type: 'success',
            message: `Statut du ticket mis à jour : ${input.status}.`,
        },
    };
}
