import type { ReactNode } from 'react';
import { SectionLayout } from '@/components/section-nav';

export function HostLayout({ children }: { children: ReactNode }) {
    return (
        <SectionLayout
            title="Espace hôte"
            links={[
                { label: 'Mes logements', href: '/hote', exact: true },
                { label: 'Réservations', href: '/hote/reservations' },
                { label: 'Nouveau logement', href: '/hote/logements/nouveau' },
            ]}
        >
            {children}
        </SectionLayout>
    );
}

