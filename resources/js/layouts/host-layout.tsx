import type { ReactNode } from 'react';
import { SectionLayout } from '@/components/section-nav';
import { dashboard } from '@/routes/host';
import { index as bookings } from '@/routes/host/bookings';
import { create } from '@/routes/host/properties';

export default function HostLayout({ children }: { children: ReactNode }) {
    return (
        <SectionLayout
            title="Espace hôte"
            links={[
                { label: 'Mes logements', href: dashboard().url, exact: true },
                { label: 'Réservations', href: bookings().url },
                { label: 'Nouveau logement', href: create().url },
            ]}
        >
            {children}
        </SectionLayout>
    );
}
