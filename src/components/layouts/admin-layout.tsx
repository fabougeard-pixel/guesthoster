import type { ReactNode } from 'react';
import { SectionLayout } from '@/components/section-nav';

export function AdminLayout({ children }: { children: ReactNode }) {
    return (
        <SectionLayout
            title="Administration"
            links={[
                { label: 'Tableau de bord', href: '/admin', exact: true },
                { label: 'Logements', href: '/admin/logements' },
                { label: 'Réservations', href: '/admin/reservations' },
                { label: 'Utilisateurs', href: '/admin/utilisateurs' },
                { label: 'Pays', href: '/admin/pays' },
                { label: 'Villes', href: '/admin/villes' },
                { label: 'Équipements', href: '/admin/equipements' },
                {
                    label: 'Types de logement',
                    href: '/admin/types-de-logement',
                },
            ]}
        >
            {children}
        </SectionLayout>
    );
}

