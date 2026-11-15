import type { ReactNode } from 'react';
import { SectionLayout } from '@/components/section-nav';
import { AdminHostSwitcher } from '@/components/host/admin-host-switcher';
import type { HostContext } from '@/lib/auth/managed-host';

export function HostLayout({
    children,
    hostContext,
}: {
    children: ReactNode;
    hostContext?: HostContext;
}) {
    const activeHost = hostContext?.activeHost;
    const pendingBookings = activeHost?.pending_bookings_count ?? 0;
    const upcomingVisits = activeHost?.upcoming_visits_count ?? 0;
    const unreadMessages = activeHost?.unread_messages_count ?? 0;

    const subtitle =
        hostContext?.isAdmin && activeHost
            ? `Gestion active : ${activeHost.name}`
            : 'Vos logements, baux & séjours';

    return (
        <SectionLayout
            title="Espace propriétaire & hôte"
            subtitle={subtitle}
            workspace="host"
            cta={{
                label: 'Ajouter un logement',
                href: '/hote/logements/nouveau',
            }}
            sections={[
                {
                    heading: 'Gestion des biens',
                    links: [
                        {
                            label: 'Mes logements',
                            href: '/hote',
                            exact: true,
                            matchPrefixes: ['/hote/logements'],
                            excludePaths: ['/hote/logements/nouveau'],
                            icon: 'home',
                        },
                        {
                            label: 'Ajouter un logement',
                            href: '/hote/logements/nouveau',
                            exact: true,
                            icon: 'plus',
                        },
                        {
                            label: 'Réservations',
                            href: '/hote/reservations',
                            icon: 'calendar',
                            badge: pendingBookings > 0 ? pendingBookings : undefined,
                        },
                        {
                            label: 'Visites de logements',
                            href: '/hote/visites',
                            icon: 'map-pin',
                            badge: upcomingVisits > 0 ? upcomingVisits : undefined,
                        },
                        {
                            label: 'Messages & Chat',
                            href: '/hote/messages',
                            icon: 'message',
                            badge: unreadMessages > 0 ? unreadMessages : undefined,
                        },
                    ],
                },
            ]}
        >
            {hostContext?.isAdmin && hostContext.allHosts.length > 0 && (
                <AdminHostSwitcher hostContext={hostContext} />
            )}
            {children}
        </SectionLayout>
    );
}
