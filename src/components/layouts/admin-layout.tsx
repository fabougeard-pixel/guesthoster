import type { ReactNode } from 'react';
import { SectionLayout } from '@/components/section-nav';

export function AdminLayout({ children }: { children: ReactNode }) {
    return (
        <SectionLayout
            title="Administration"
            subtitle="Gestion de la plateforme & conciergerie"
            workspace="admin"
            cta={{
                label: 'Ajouter un logement',
                href: '/admin/logements/nouveau',
            }}
            sections={[
                {
                    heading: 'Pilotage',
                    links: [
                        {
                            label: 'Tableau de bord',
                            href: '/admin',
                            exact: true,
                            icon: 'dashboard',
                        },
                    ],
                },
                {
                    heading: 'Gestion locative',
                    links: [
                        {
                            label: 'Logements',
                            href: '/admin/logements',
                            excludePaths: ['/admin/logements/nouveau'],
                            icon: 'home',
                        },
                        {
                            label: 'Ajouter un logement',
                            href: '/admin/logements/nouveau',
                            exact: true,
                            icon: 'plus',
                        },
                        {
                            label: 'Réservations',
                            href: '/admin/reservations',
                            icon: 'calendar',
                        },
                        {
                            label: 'Utilisateurs',
                            href: '/admin/utilisateurs',
                            icon: 'users',
                        },
                    ],
                },
                {
                    heading: 'Référentiels',
                    links: [
                        {
                            label: 'Pays',
                            href: '/admin/pays',
                            icon: 'globe',
                        },
                        {
                            label: 'Villes',
                            href: '/admin/villes',
                            icon: 'map-pin',
                        },
                        {
                            label: 'Équipements',
                            href: '/admin/equipements',
                            icon: 'sparkles',
                        },
                        {
                            label: 'Types de logement',
                            href: '/admin/types-de-logement',
                            icon: 'tag',
                        },
                    ],
                },
            ]}
        >
            {children}
        </SectionLayout>
    );
}
