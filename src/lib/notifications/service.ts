import crypto from 'node:crypto';
import { BOOKING_STATUS_LABELS, type BookingStatus } from '@/lib/domain/enums';
import { env } from '@/lib/env';
import {
    addDays,
    formatDateTime,
    formatLongDateFr,
    formatPrice,
    formatShortDateFr,
    toIsoDate,
} from '@/lib/format';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/services/resend';

export const USER_NOTIFIABLE_TYPE = 'App\\Models\\User';

type InAppPayload = {
    title: string;
    body: string;
    url: string;
};

type MailPayload = {
    subject: string;
    greeting: string;
    lines: string[];
    actionLabel: string;
    actionUrl: string;
};

function firstName(fullName: string): string {
    const trimmed = fullName.trim();
    if (!trimmed) {
        return fullName;
    }

    return trimmed.split(/\s+/)[0] ?? trimmed;
}

function appUrl(path: string): string {
    return `${env.appUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

async function createInAppNotification(
    userId: number,
    type: string,
    payload: InAppPayload,
): Promise<void> {
    await prisma.notification.create({
        data: {
            id: crypto.randomUUID(),
            type,
            notifiableType: USER_NOTIFIABLE_TYPE,
            notifiableId: userId,
            data: JSON.stringify(payload),
        },
    });
}

async function safeSendMail(to: string, mail: MailPayload): Promise<void> {
    try {
        await sendEmail({
            to,
            ...mail,
        });
    } catch (error) {
        console.warn('Échec d’envoi d’e-mail de notification :', error);
    }
}

async function dispatchUserNotification({
    userId,
    email,
    type,
    inApp,
    mail,
}: {
    userId: number;
    email: string;
    type: string;
    inApp: InAppPayload;
    mail: MailPayload;
}): Promise<void> {
    await createInAppNotification(userId, type, inApp);
    await safeSendMail(email, mail);
}

function stayRangeText(checkIn: Date, checkOut: Date): string {
    return `du ${formatLongDateFr(toIsoDate(checkIn))} au ${formatLongDateFr(toIsoDate(checkOut))}`;
}

export async function notifyBookingRequested(bookingId: number): Promise<void> {
    const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
            guest: { select: { name: true } },
            property: {
                select: {
                    title: true,
                    managedByAdmin: true,
                    owner: { select: { id: true, email: true } },
                },
            },
        },
    });

    if (!booking) {
        return;
    }

    const stay = stayRangeText(booking.checkIn, booking.checkOut);
    const shortStay = `du ${formatShortDateFr(toIsoDate(booking.checkIn))} au ${formatShortDateFr(toIsoDate(booking.checkOut))}`;
    const expiresLabel = booking.expiresAt
        ? formatDateTime(booking.expiresAt.toISOString())
        : '';

    await dispatchUserNotification({
        userId: booking.property.owner.id,
        email: booking.property.owner.email,
        type: 'App\\Notifications\\BookingRequested',
        inApp: {
            title: 'Nouvelle demande de réservation',
            body: `${booking.guest.name} souhaite réserver « ${booking.property.title} » ${shortStay}.`,
            url: appUrl(`/reservations/${booking.reference}`),
        },
        mail: {
            subject: `Nouvelle demande de réservation · ${booking.property.title}`,
            greeting: 'Bonjour,',
            lines: [
                `${booking.guest.name} souhaite réserver « ${booking.property.title} » ${stay} pour ${booking.guests} voyageur(s).`,
                `Acceptez ou refusez la demande avant le ${expiresLabel}, faute de quoi elle expirera.`,
            ],
            actionLabel: 'Répondre à la demande',
            actionUrl: appUrl('/hote/reservations'),
        },
    });

    if (booking.property.managedByAdmin) {
        const adminUser = await prisma.user.findFirst({
            where: { role: 'admin' },
            select: { id: true, email: true },
        });

        if (adminUser && adminUser.id !== booking.property.owner.id) {
            await dispatchUserNotification({
                userId: adminUser.id,
                email: adminUser.email,
                type: 'App\\Notifications\\AdminBookingRequestAlert',
                inApp: {
                    title: 'Conciergerie : Nouvelle demande de réservation',
                    body: `${booking.guest.name} pour le logement géré « ${booking.property.title} » ${shortStay}.`,
                    url: appUrl('/admin/reservations'),
                },
                mail: {
                    subject: `Conciergerie · Nouvelle demande de réservation · ${booking.property.title}`,
                    greeting: 'Bonjour l’équipe Conciergerie,',
                    lines: [
                        `Une nouvelle demande de réservation a été soumise par ${booking.guest.name} pour le logement en gestion « ${booking.property.title} » ${stay} (${booking.guests} voyageur(s)).`,
                        `Cette demande expirera le ${expiresLabel} si elle n’est pas traitée.`,
                    ],
                    actionLabel: 'Gérer la demande (Admin)',
                    actionUrl: appUrl('/admin/reservations'),
                },
            });
        }
    }
}

export async function notifyBookingAwaitingPayment(
    bookingId: number,
): Promise<void> {
    const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
            guest: { select: { id: true, name: true, email: true } },
            property: { select: { title: true } },
        },
    });

    if (!booking) {
        return;
    }

    const stay = stayRangeText(booking.checkIn, booking.checkOut);
    const expiresLabel = booking.expiresAt
        ? formatDateTime(booking.expiresAt.toISOString())
        : '';
    const bookingUrl = appUrl(`/reservations/${booking.reference}`);

    await dispatchUserNotification({
        userId: booking.guest.id,
        email: booking.guest.email,
        type: 'App\\Notifications\\BookingAwaitingPayment',
        inApp: {
            title: 'Réglez votre séjour',
            body: `Vos dates à « ${booking.property.title} » sont bloquées jusqu’au ${expiresLabel}.`,
            url: bookingUrl,
        },
        mail: {
            subject: `Finalisez votre réservation · ${booking.property.title}`,
            greeting: `Bonjour ${booking.guest.name},`,
            lines: [
                `Votre séjour à « ${booking.property.title} » ${stay} est prêt à être confirmé.`,
                `Réglez votre réservation avant le ${expiresLabel} pour bloquer définitivement vos dates.`,
            ],
            actionLabel: 'Voir ma réservation',
            actionUrl: bookingUrl,
        },
    });
}

export async function notifyBookingConfirmed(bookingId: number): Promise<void> {
    const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
            guest: { select: { id: true, name: true, email: true } },
            property: {
                select: {
                    title: true,
                    address: true,
                    postalCode: true,
                    checkInTime: true,
                    checkOutTime: true,
                    city: { select: { name: true } },
                    owner: { select: { id: true, email: true } },
                },
            },
        },
    });

    if (!booking) {
        return;
    }

    const stay = stayRangeText(booking.checkIn, booking.checkOut);
    const total = formatPrice(booking.totalPrice);
    const bookingUrl = appUrl(`/reservations/${booking.reference}`);

    await Promise.all([
        dispatchUserNotification({
            userId: booking.property.owner.id,
            email: booking.property.owner.email,
            type: 'App\\Notifications\\BookingConfirmed',
            inApp: {
                title: 'Réservation confirmée',
                body: `${booking.guest.name} a réglé son séjour à « ${booking.property.title} ».`,
                url: bookingUrl,
            },
            mail: {
                subject: `Réservation confirmée · ${booking.reference}`,
                greeting: 'Bonjour,',
                lines: [
                    `${booking.guest.name} a réglé son séjour à « ${booking.property.title} » ${stay} (${booking.guests} voyageur(s)).`,
                    'Les dates sont désormais réservées dans votre calendrier.',
                ],
                actionLabel: 'Voir la réservation',
                actionUrl: bookingUrl,
            },
        }),
        dispatchUserNotification({
            userId: booking.guest.id,
            email: booking.guest.email,
            type: 'App\\Notifications\\BookingConfirmed',
            inApp: {
                title: 'Réservation confirmée',
                body: `Votre séjour à « ${booking.property.title} » est confirmé.`,
                url: bookingUrl,
            },
            mail: {
                subject: `Votre séjour est confirmé · ${booking.property.title}`,
                greeting: `Bonjour ${booking.guest.name},`,
                lines: [
                    `Paiement de ${total} reçu : votre séjour à « ${booking.property.title} » ${stay} est confirmé.`,
                    `Adresse : ${booking.property.address ?? ''}, ${booking.property.postalCode ?? ''} ${booking.property.city?.name ?? ''}`,
                    `Arrivée à partir de ${booking.property.checkInTime.slice(0, 5)}, départ avant ${booking.property.checkOutTime.slice(0, 5)}.`,
                ],
                actionLabel: 'Voir ma réservation',
                actionUrl: bookingUrl,
            },
        }),
    ]);
}

export async function notifyBookingDeclined(bookingId: number): Promise<void> {
    const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
            guest: { select: { id: true, name: true, email: true } },
            property: { select: { title: true } },
        },
    });

    if (!booking) {
        return;
    }

    const stay = stayRangeText(booking.checkIn, booking.checkOut);
    const searchQuery = new URLSearchParams({
        check_in: toIsoDate(booking.checkIn),
        check_out: toIsoDate(booking.checkOut),
        guests: String(booking.guests),
    }).toString();

    const lines = [
        `L’hôte n’a pas pu accepter votre demande pour « ${booking.property.title} » ${stay}.`,
    ];
    if (booking.cancellationReason) {
        lines.push(`Message de l’hôte : ${booking.cancellationReason}`);
    }
    lines.push('Aucun montant ne vous a été débité.');

    await dispatchUserNotification({
        userId: booking.guest.id,
        email: booking.guest.email,
        type: 'App\\Notifications\\BookingDeclined',
        inApp: {
            title: 'Demande non retenue',
            body: `L’hôte n’a pas pu accepter votre demande pour « ${booking.property.title} ».`,
            url: appUrl(`/reservations/${booking.reference}`),
        },
        mail: {
            subject: `Demande non retenue · ${booking.property.title}`,
            greeting: `Bonjour ${booking.guest.name},`,
            lines,
            actionLabel: 'Trouver un autre logement',
            actionUrl: appUrl(`/logements?${searchQuery}`),
        },
    });
}

export async function notifyBookingCancelled(
    bookingId: number,
    cancelledByRole: 'guest' | 'host' | 'admin',
): Promise<void> {
    const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
            guest: { select: { id: true, name: true, email: true } },
            property: {
                select: {
                    title: true,
                    owner: { select: { id: true, email: true } },
                },
            },
        },
    });

    if (!booking) {
        return;
    }

    const recipients: { id: number; email: string }[] = [];
    if (cancelledByRole !== 'guest') {
        recipients.push(booking.guest);
    }
    if (cancelledByRole !== 'host') {
        recipients.push(booking.property.owner);
    }

    const stay = stayRangeText(booking.checkIn, booking.checkOut);
    const who =
        cancelledByRole === 'guest'
            ? 'le voyageur'
            : cancelledByRole === 'host'
              ? 'l’hôte'
              : 'l’équipe GuestHoster';

    const lines = [
        `La réservation ${booking.reference} pour « ${booking.property.title} » ${stay} a été annulée par ${who}.`,
    ];
    if (booking.cancellationReason) {
        lines.push(`Motif : ${booking.cancellationReason}`);
    }
    if (booking.refundedAmount > 0) {
        lines.push(
            `Remboursement : ${formatPrice(booking.refundedAmount)} sur le moyen de paiement utilisé.`,
        );
    }

    const bookingUrl = appUrl(`/reservations/${booking.reference}`);

    await Promise.all(
        recipients.map((recipient) =>
            dispatchUserNotification({
                userId: recipient.id,
                email: recipient.email,
                type: 'App\\Notifications\\BookingCancelled',
                inApp: {
                    title: 'Réservation annulée',
                    body: `La réservation ${booking.reference} pour « ${booking.property.title} » a été annulée.`,
                    url: bookingUrl,
                },
                mail: {
                    subject: `Réservation annulée · ${booking.reference}`,
                    greeting: 'Bonjour,',
                    lines,
                    actionLabel: 'Voir la réservation',
                    actionUrl: bookingUrl,
                },
            }),
        ),
    );
}

export async function notifyBookingExpired(bookingId: number): Promise<void> {
    const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
            guest: { select: { id: true, name: true, email: true } },
            property: { select: { title: true } },
        },
    });

    if (!booking) {
        return;
    }

    const stay = stayRangeText(booking.checkIn, booking.checkOut);

    await dispatchUserNotification({
        userId: booking.guest.id,
        email: booking.guest.email,
        type: 'App\\Notifications\\BookingExpired',
        inApp: {
            title: 'Réservation expirée',
            body: `Votre réservation pour « ${booking.property.title} » a expiré et les dates ont été libérées.`,
            url: appUrl(`/reservations/${booking.reference}`),
        },
        mail: {
            subject: `Réservation expirée · ${booking.property.title}`,
            greeting: `Bonjour ${booking.guest.name},`,
            lines: [
                `Votre réservation pour « ${booking.property.title} » ${stay} a expiré : les dates ont été libérées.`,
            ],
            actionLabel: 'Relancer une recherche',
            actionUrl: appUrl('/logements'),
        },
    });
}

export async function notifyBookingPaymentRefunded(
    bookingId: number,
): Promise<void> {
    const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
            guest: { select: { id: true, name: true, email: true } },
            property: { select: { title: true } },
        },
    });

    if (!booking) {
        return;
    }

    const statusLabel =
        BOOKING_STATUS_LABELS[booking.status as BookingStatus] ?? booking.status;
    const refunded = formatPrice(booking.refundedAmount);

    await dispatchUserNotification({
        userId: booking.guest.id,
        email: booking.guest.email,
        type: 'App\\Notifications\\BookingPaymentRefunded',
        inApp: {
            title: 'Paiement remboursé',
            body: `Votre paiement pour « ${booking.property.title} » vous a été remboursé (${refunded}).`,
            url: appUrl(`/reservations/${booking.reference}`),
        },
        mail: {
            subject: `Paiement remboursé · ${booking.reference}`,
            greeting: `Bonjour ${booking.guest.name},`,
            lines: [
                `Votre paiement pour « ${booking.property.title} » est arrivé alors que la réservation n’était plus active (${statusLabel}).`,
                `Nous vous avons remboursé ${refunded}. Le montant apparaîtra sur votre compte sous quelques jours.`,
            ],
            actionLabel: 'Relancer une recherche',
            actionUrl: appUrl('/logements'),
        },
    });
}

export async function notifyPropertyPublished(propertyId: number): Promise<void> {
    const property = await prisma.property.findUnique({
        where: { id: propertyId },
        include: { owner: { select: { id: true, name: true, email: true } } },
    });

    if (!property) {
        return;
    }

    const propertyUrl = appUrl(`/logements/${property.slug}`);

    await dispatchUserNotification({
        userId: property.owner.id,
        email: property.owner.email,
        type: 'App\\Notifications\\PropertyPublished',
        inApp: {
            title: 'Logement en ligne',
            body: `« ${property.title} » a été validé et apparaît dans les recherches.`,
            url: propertyUrl,
        },
        mail: {
            subject: `Votre logement est en ligne · ${property.title}`,
            greeting: `Bonjour ${property.owner.name},`,
            lines: [
                `Bonne nouvelle : « ${property.title} » a été validé et apparaît désormais dans les recherches.`,
                'Pensez à tenir votre calendrier à jour pour éviter les demandes sur des dates indisponibles.',
            ],
            actionLabel: 'Voir l’annonce',
            actionUrl: propertyUrl,
        },
    });
}

export async function notifyPropertyRejected(
    propertyId: number,
    wasPublished = false,
): Promise<void> {
    const property = await prisma.property.findUnique({
        where: { id: propertyId },
        include: { owner: { select: { id: true, name: true, email: true } } },
    });

    if (!property) {
        return;
    }

    const editUrl = appUrl(`/hote/logements/${property.slug}/modifier`);
    const titlePrefix = wasPublished
        ? 'Logement retiré du catalogue'
        : 'Logement à revoir';

    await dispatchUserNotification({
        userId: property.owner.id,
        email: property.owner.email,
        type: 'App\\Notifications\\PropertyRejected',
        inApp: {
            title: titlePrefix,
            body: `« ${property.title} » : ${property.rejectionReason ?? ''}`,
            url: editUrl,
        },
        mail: {
            subject: `${titlePrefix} · ${property.title}`,
            greeting: `Bonjour ${property.owner.name},`,
            lines: [
                wasPublished
                    ? `Notre équipe a retiré « ${property.title} » du catalogue.`
                    : `Notre équipe n’a pas pu valider « ${property.title} » en l’état.`,
                `Motif : ${property.rejectionReason ?? ''}`,
                'Une fois les corrections faites, renvoyez le logement en validation depuis votre espace hôte. Les réservations déjà confirmées ne sont pas annulées.',
            ],
            actionLabel: 'Modifier le logement',
            actionUrl: editUrl,
        },
    });
}

export async function notifyReviewReceived(reviewId: number): Promise<void> {
    const review = await prisma.review.findUnique({
        where: { id: reviewId },
        include: {
            author: { select: { name: true } },
            booking: { select: { reference: true } },
            property: {
                select: {
                    title: true,
                    owner: { select: { id: true, email: true } },
                },
            },
        },
    });

    if (!review) {
        return;
    }

    const authorFirst = firstName(review.author.name);
    const snippet =
        review.comment.length > 300
            ? `${review.comment.slice(0, 297)}...`
            : review.comment;
    const bookingUrl = appUrl(`/reservations/${review.booking.reference}`);

    await dispatchUserNotification({
        userId: review.property.owner.id,
        email: review.property.owner.email,
        type: 'App\\Notifications\\ReviewReceived',
        inApp: {
            title: `Nouvel avis : ${review.rating}/5`,
            body: `${authorFirst} a noté son séjour à « ${review.property.title} ».`,
            url: bookingUrl,
        },
        mail: {
            subject: `Nouvel avis (${review.rating}/5) · ${review.property.title}`,
            greeting: 'Bonjour,',
            lines: [
                `${authorFirst} a laissé un avis sur « ${review.property.title} » : ${review.rating}/5.`,
                `« ${snippet} »`,
                'Vous pouvez y répondre publiquement depuis la page de la réservation.',
            ],
            actionLabel: 'Répondre à l’avis',
            actionUrl: bookingUrl,
        },
    });
}

export async function notifyReviewRequested(bookingId: number): Promise<void> {
    const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
            guest: { select: { id: true, name: true, email: true } },
            property: { select: { title: true } },
        },
    });

    if (!booking) {
        return;
    }

    const deadlineIso = addDays(
        toIsoDate(booking.checkOut),
        env.booking.reviewWindowDays,
    );
    const deadlineText = formatLongDateFr(deadlineIso);
    const bookingUrl = appUrl(`/reservations/${booking.reference}`);

    await dispatchUserNotification({
        userId: booking.guest.id,
        email: booking.guest.email,
        type: 'App\\Notifications\\ReviewRequested',
        inApp: {
            title: 'Donnez votre avis',
            body: `Comment s’est passé votre séjour à « ${booking.property.title} » ?`,
            url: bookingUrl,
        },
        mail: {
            subject: `Comment s’est passé votre séjour ? · ${booking.property.title}`,
            greeting: `Bonjour ${booking.guest.name},`,
            lines: [
                `Nous espérons que votre séjour à « ${booking.property.title} » s’est bien passé.`,
                `Votre avis aide les autres voyageurs à choisir, et votre hôte à progresser. Vous avez jusqu’au ${deadlineText} pour le donner.`,
            ],
            actionLabel: 'Donner mon avis',
            actionUrl: bookingUrl,
        },
    });
}

export async function notifyNewMessage(messageId: number): Promise<void> {
    const message = await prisma.message.findUnique({
        where: { id: messageId },
        include: {
            sender: { select: { id: true, name: true } },
            booking: {
                include: {
                    guest: { select: { id: true, email: true } },
                    property: {
                        select: {
                            title: true,
                            owner: { select: { id: true, email: true } },
                        },
                    },
                },
            },
        },
    });

    if (!message) {
        return;
    }

    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const recentUnreadSibling = await prisma.message.findFirst({
        where: {
            bookingId: message.bookingId,
            userId: message.userId,
            id: { lt: message.id },
            readAt: null,
            createdAt: { gte: tenMinutesAgo },
        },
        select: { id: true },
    });

    if (recentUnreadSibling) {
        return;
    }

    const recipient =
        message.userId === message.booking.userId
            ? message.booking.property.owner
            : message.booking.guest;

    const snippet =
        message.body.length > 300
            ? `${message.body.slice(0, 297)}...`
            : message.body;

    await safeSendMail(recipient.email, {
        subject: `Nouveau message de ${message.sender.name}`,
        greeting: 'Bonjour,',
        lines: [
            `${message.sender.name} vous a écrit au sujet de « ${message.booking.property.title} » :`,
            `« ${snippet} »`,
        ],
        actionLabel: 'Répondre',
        actionUrl: appUrl(`/messages/${message.booking.reference}`),
    });
}

export async function notifyVisitRequested({
    propertyTitle,
    propertySlug,
    ownerId,
    ownerEmail,
    ownerName,
    candidateName,
    candidateEmail,
    candidatePhone,
    visitDate,
    timeSlot,
    reference,
    visitFee,
    candidateNotes,
}: {
    propertyId?: number;
    propertyTitle: string;
    propertySlug: string;
    ownerId: number;
    ownerEmail: string;
    ownerName: string;
    candidateName: string;
    candidateEmail: string;
    candidatePhone?: string | null;
    visitDate: string;
    timeSlot: string;
    reference: string;
    visitFee: number;
    candidateNotes?: string | null;
}): Promise<void> {
    const formattedFee =
        visitFee > 0 ? `${(visitFee / 100).toFixed(2)} €` : 'Gratuit';

    // 1. Notification au Propriétaire (rôle propriétaire explicite pour location classique)
    await dispatchUserNotification({
        userId: ownerId,
        email: ownerEmail,
        type: 'App\\Notifications\\VisitRequested',
        inApp: {
            title: 'Nouveau rendez-vous de visite (Location classique)',
            body: `${candidateName} a réservé un créneau de visite pour votre logement « ${propertyTitle} » le ${visitDate} (${timeSlot}).`,
            url: appUrl(`/hote/logements`),
        },
        mail: {
            subject: `Nouveau rendez-vous de visite · ${propertyTitle}`,
            greeting: `Bonjour ${ownerName},`,
            lines: [
                `Un candidat à la location classique (${candidateName}) a réservé un créneau de visite pour votre bien « ${propertyTitle} ».`,
                `Date & heure du rendez-vous : le ${visitDate} à ${timeSlot}.`,
                `Référence du rendez-vous : ${reference}`,
                `Coordonnées du candidat : ${candidateEmail}${candidatePhone ? ` · ${candidatePhone}` : ''}`,
                ...(candidateNotes
                    ? [`Informations transmises par le candidat : « ${candidateNotes} »`]
                    : []),
                ...(visitFee > 0 ? [`Forfait de validation réglé : ${formattedFee}`] : []),
                `En tant que propriétaire, vous pouvez accueillir le candidat sur place au créneau convenu et échanger avec lui directement.`,
            ],
            actionLabel: 'Gérer mes logements & visites',
            actionUrl: appUrl(`/hote/logements`),
        },
    });

    // 2. Notification de confirmation au Candidat / Locataire
    await safeSendMail(candidateEmail, {
        subject: `Confirmation de votre rendez-vous de visite · ${propertyTitle}`,
        greeting: `Bonjour ${candidateName},`,
        lines: [
            `Votre rendez-vous de visite pour le bien « ${propertyTitle} » est bien confirmé.`,
            `Date & créneau : le ${visitDate} à ${timeSlot}.`,
            `Référence du rendez-vous : ${reference}`,
            `Propriétaire du bien : ${ownerName}`,
            `Le propriétaire vous accueillera sur place au créneau convenu pour effectuer la visite du logement et répondre à vos questions.`,
            ...(visitFee > 0
                ? [
                      `Forfait de validation réglé : ${formattedFee} (déductible lors de la signature du bail).`,
                  ]
                : []),
            `En cas d'empêchement, merci de prévenir le propriétaire au plus tôt.`,
        ],
        actionLabel: 'Voir la fiche du logement',
        actionUrl: appUrl(`/logements/${propertySlug}`),
    });
}

export async function notifyVisitCancelled({
    propertyTitle,
    propertySlug,
    candidateName,
    candidateEmail,
    candidateUserId,
    visitDate,
    timeSlot,
    reference,
    reason,
    cancelledBy,
}: {
    propertyTitle: string;
    propertySlug: string;
    candidateName: string;
    candidateEmail: string;
    candidateUserId?: number | null;
    visitDate: string;
    timeSlot: string;
    reference: string;
    reason?: string | null;
    cancelledBy: 'owner' | 'admin' | 'candidate';
}): Promise<void> {
    const actorLabel =
        cancelledBy === 'admin'
            ? 'La conciergerie / conciergerie'
            : cancelledBy === 'owner'
              ? 'Le propriétaire'
              : 'Le candidat';

    if (candidateUserId) {
        await dispatchUserNotification({
            userId: candidateUserId,
            email: candidateEmail,
            type: 'App\\Notifications\\VisitCancelled',
            inApp: {
                title: 'Rendez-vous de visite annulé',
                body: `${actorLabel} a annulé votre visite du bien « ${propertyTitle} » prévue le ${visitDate} (${timeSlot}).${reason ? ` Motif : « ${reason} »` : ''}`,
                url: appUrl(`/logements/${propertySlug}`),
            },
            mail: {
                subject: `Annulation du rendez-vous de visite · ${propertyTitle}`,
                greeting: `Bonjour ${candidateName},`,
                lines: [
                    `Nous vous informons que votre rendez-vous de visite pour le logement « ${propertyTitle} » prévu le ${visitDate} à ${timeSlot} a été annulé par ${actorLabel.toLowerCase()}.`,
                    `Référence : ${reference}`,
                    ...(reason ? [`Motif de l'annulation : « ${reason} »`] : []),
                    `Vous pouvez consulter les autres créneaux disponibles sur l'annonce ou rechercher un autre logement disponible.`,
                ],
                actionLabel: 'Voir l’annonce',
                actionUrl: appUrl(`/logements/${propertySlug}`),
            },
        });
    } else {
        await safeSendMail(candidateEmail, {
            subject: `Annulation du rendez-vous de visite · ${propertyTitle}`,
            greeting: `Bonjour ${candidateName},`,
            lines: [
                `Nous vous informons que votre rendez-vous de visite pour le logement « ${propertyTitle} » prévu le ${visitDate} à ${timeSlot} a été annulé par ${actorLabel.toLowerCase()}.`,
                `Référence : ${reference}`,
                ...(reason ? [`Motif de l'annulation : « ${reason} »`] : []),
                `Vous pouvez consulter les autres créneaux disponibles sur l'annonce ou rechercher un autre logement disponible.`,
            ],
            actionLabel: 'Voir l’annonce',
            actionUrl: appUrl(`/logements/${propertySlug}`),
        });
    }
}

export async function notifyTransferProofSubmitted(bookingId: number): Promise<void> {
    const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
            guest: { select: { id: true, name: true, email: true } },
            property: {
                select: {
                    title: true,
                    managedByAdmin: true,
                    owner: { select: { id: true, name: true, email: true } },
                },
            },
        },
    });

    if (!booking) return;

    const stay = stayRangeText(booking.checkIn, booking.checkOut);
    const total = formatPrice(booking.totalPrice);
    const hostBookingUrl = appUrl('/hote/reservations');
    const guestBookingUrl = appUrl(`/reservations/${booking.reference}`);
    const bankRefSnippet = booking.transferBankReference ? ` (Réf virement : ${booking.transferBankReference})` : '';

    const dispatches: Promise<void>[] = [
        // 1. Notifier l'hôte / propriétaire
        dispatchUserNotification({
            userId: booking.property.owner.id,
            email: booking.property.owner.email,
            type: 'App\\Notifications\\TransferProofSubmitted',
            inApp: {
                title: 'Ordre de virement reçu · Validation requise',
                body: `${booking.guest.name} a transmis un ordre de virement de ${total} pour son séjour. En attente de validation des fonds.`,
                url: hostBookingUrl,
            },
            mail: {
                subject: `Ordre de virement reçu · ${booking.property.title}`,
                greeting: `Bonjour ${booking.property.owner.name},`,
                lines: [
                    `${booking.guest.name} a effectué le virement bancaire pour son séjour à « ${booking.property.title} » ${stay} d'un montant de ${total}${bankRefSnippet}.`,
                    'Un justificatif de virement a été téléversé. Les dates du calendrier sont bloquées pendant 48 heures ouvrées.',
                    'Une fois les fonds reçus sur le compte bancaire, vous pouvez valider la réservation d’un clic depuis votre espace hôte.',
                ],
                actionLabel: 'Vérifier & Valider le virement',
                actionUrl: hostBookingUrl,
            },
        }),
        // 2. Accusé de réception au voyageur
        dispatchUserNotification({
            userId: booking.guest.id,
            email: booking.guest.email,
            type: 'App\\Notifications\\TransferProofReceived',
            inApp: {
                title: 'Ordre de virement bien reçu',
                body: `Votre justificatif de virement de ${total} est en cours de validation. Vos dates sont bloquées.`,
                url: guestBookingUrl,
            },
            mail: {
                subject: `Ordre de virement bien reçu · ${booking.property.title}`,
                greeting: `Bonjour ${booking.guest.name},`,
                lines: [
                    `Nous avons bien reçu votre ordre de virement de ${total} pour votre séjour à « ${booking.property.title} » ${stay}.`,
                    'Vos dates sont réservées et bloquées dans le calendrier pendant le délai interbancaire.',
                    'Dès que les fonds sont crédités (généralement sous 24 à 48 heures ouvrées), votre réservation sera officiellement confirmée.',
                ],
                actionLabel: 'Suivre ma réservation',
                actionUrl: guestBookingUrl,
            },
        }),
    ];

    // 3. Si le bien est en gestion de conciergerie admin, alerter aussi l'équipe conciergerie
    if (booking.property.managedByAdmin) {
        const adminUser = await prisma.user.findFirst({
            where: { role: 'admin' },
            select: { id: true, email: true },
        });

        if (adminUser && adminUser.id !== booking.property.owner.id) {
            dispatches.push(
                dispatchUserNotification({
                    userId: adminUser.id,
                    email: adminUser.email,
                    type: 'App\\Notifications\\AdminTransferProofAlert',
                    inApp: {
                        title: 'Conciergerie : Ordre de virement à vérifier',
                        body: `Virement de ${total} pour le logement en gestion « ${booking.property.title} » (Réf: ${booking.reference}).`,
                        url: appUrl('/admin/reservations'),
                    },
                    mail: {
                        subject: `Conciergerie · Ordre de virement à valider · ${booking.reference}`,
                        greeting: 'Bonjour l’équipe Conciergerie,',
                        lines: [
                            `Un ordre de virement de ${total} a été transmis par ${booking.guest.name} pour le logement géré « ${booking.property.title} » ${stay}.`,
                            'Vérifiez la bonne réception des fonds et validez ou rejetez le virement depuis l’espace d’administration.',
                        ],
                        actionLabel: 'Superviser les réservations',
                        actionUrl: appUrl('/admin/reservations'),
                    },
                }),
            );
        }
    }

    await Promise.all(dispatches);
}

export async function notifyInquiryMessage(messageId: number): Promise<void> {
    const message = await prisma.propertyInquiryMessage.findUnique({
        where: { id: messageId },
        include: {
            sender: { select: { id: true, name: true, email: true } },
            inquiry: {
                include: {
                    guest: { select: { id: true, name: true, email: true } },
                    host: { select: { id: true, name: true, email: true } },
                    property: { select: { title: true, slug: true, managedByAdmin: true } },
                },
            },
        },
    });

    if (!message) return;

    // Éviter le flood : ne pas renvoyer d'e-mail si un message du même expéditeur a été envoyé il y a moins de 10 min et n'est pas encore lu
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const recentUnreadSibling = await prisma.propertyInquiryMessage.findFirst({
        where: {
            inquiryId: message.inquiryId,
            senderId: message.senderId,
            id: { lt: message.id },
            readAt: null,
            createdAt: { gte: tenMinutesAgo },
        },
        select: { id: true },
    });

    if (recentUnreadSibling) return;

    const isGuestSender = message.senderId === message.inquiry.guestId;
    const recipient = isGuestSender ? message.inquiry.host : message.inquiry.guest;
    const senderName = message.sender.name;
    const targetUrl = isGuestSender ? appUrl('/hote/messages') : appUrl(`/logements/${message.inquiry.property.slug}`);

    const snippet =
        message.body.length > 300
            ? `${message.body.slice(0, 297)}...`
            : message.body;

    await dispatchUserNotification({
        userId: recipient.id,
        email: recipient.email,
        type: 'App\\Notifications\\InquiryMessageReceived',
        inApp: {
            title: `Nouveau message de ${senderName}`,
            body: `${senderName} au sujet de « ${message.inquiry.property.title} » : « ${snippet} »`,
            url: targetUrl,
        },
        mail: {
            subject: `Nouveau message au sujet de « ${message.inquiry.property.title} »`,
            greeting: `Bonjour ${recipient.name},`,
            lines: [
                `${senderName} vous a envoyé un nouveau message au sujet du logement « ${message.inquiry.property.title} » :`,
                `« ${snippet} »`,
            ],
            actionLabel: 'Voir la conversation & Répondre',
            actionUrl: targetUrl,
        },
    });
}

export async function notifyReportCreated({
    propertyTitle,
    propertySlug,
    reasonLabel,
    details,
    reporterName,
    reporterEmail,
}: {
    propertyTitle: string;
    propertySlug: string;
    reasonLabel: string;
    details?: string | null;
    reporterName: string;
    reporterEmail: string;
}): Promise<void> {
    const adminUser = await prisma.user.findFirst({
        where: { role: 'admin' },
        select: { id: true, email: true },
    });

    if (!adminUser) return;

    await dispatchUserNotification({
        userId: adminUser.id,
        email: adminUser.email,
        type: 'App\\Notifications\\PropertyReportAlert',
        inApp: {
            title: 'Alerte modération : Annonce signalée',
            body: `Le logement « ${propertyTitle} » a été signalé pour : ${reasonLabel}.`,
            url: appUrl('/admin/signalements'),
        },
        mail: {
            subject: `Alerte modération : Annonce signalée · ${propertyTitle}`,
            greeting: 'Bonjour l’équipe de Modération,',
            lines: [
                `Un signalement a été déposé pour l’annonce « ${propertyTitle} » (${propertySlug}).`,
                `Motif du signalement : ${reasonLabel}`,
                `Signalé par : ${reporterName} (${reporterEmail})`,
                ...(details ? [`Détails transmis : « ${details} »`] : []),
                'Vérifiez cette annonce sur le tableau de bord des signalements et prenez les mesures appropriées.',
            ],
            actionLabel: 'Consulter les signalements',
            actionUrl: appUrl('/admin/signalements'),
        },
    });
}





