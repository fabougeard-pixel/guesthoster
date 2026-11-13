import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ErrorView } from '@/components/error-view';
import { requireAdminAccess } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import type { InquiryMessage, PropertyInquiryDetail } from '@/types';
import { AdminInquiryClient } from './admin-inquiry-client';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Détail de la conversation conciergerie · Administration',
};

export default async function AdminInquiryPage({
    params,
}: {
    params: Promise<{ reference: string }>;
}) {
    const admin = await requireAdminAccess('/admin/messages');
    if (!admin) {
        return <ErrorView status={403} />;
    }

    const { reference } = await params;

    const row = await prisma.propertyInquiry.findUnique({
        where: { reference },
        include: {
            guest: { select: { id: true, name: true, email: true } },
            host: { select: { id: true, name: true, email: true } },
            property: { select: { id: true, title: true, slug: true, managedByAdmin: true } },
            messages: {
                orderBy: { createdAt: 'asc' },
                include: { sender: { select: { id: true, name: true, role: true } } },
            },
        },
    });

    if (!row) {
        notFound();
    }

    const messages: InquiryMessage[] = row.messages.map((m) => {
        let senderName = m.sender.name;
        if (m.senderRole === 'admin') {
            senderName = `Conciergerie (pour ${row.host.name})`;
        } else if (m.senderRole === 'host') {
            senderName = row.host.name;
        } else {
            senderName = row.guest.name;
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

    const inquiryDetail: PropertyInquiryDetail = {
        id: row.id,
        reference: row.reference,
        property_id: row.propertyId,
        property_title: row.property.title,
        property_slug: row.property.slug,
        guest_id: row.guestId,
        guest_name: row.guest.name,
        guest_email: row.guest.email,
        host_id: row.hostId,
        host_name: row.host.name,
        host_email: row.host.email,
        is_managed_by_admin: row.isManagedByAdmin,
        status: row.status as 'open' | 'closed',
        closed_at: row.closedAt ? row.closedAt.toISOString() : null,
        recap_sent_at: row.recapSentAt ? row.recapSentAt.toISOString() : null,
        created_at: row.createdAt ? row.createdAt.toISOString() : null,
        messages,
    };

    return <AdminInquiryClient inquiry={inquiryDetail} />;
}

