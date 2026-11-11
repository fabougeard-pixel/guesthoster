import type { ReactNode } from 'react';
import { SectionLayout } from '@/components/section-nav';

export function HostLayout({ children }: { children: ReactNode }) {
    return (
        <SectionLayout
            title="Espace hôte"
            subtitle="Vos logements & réservations"
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
                        },
                    ],
                },
            ]}
        >
            {children}
        </SectionLayout>
    );
}
