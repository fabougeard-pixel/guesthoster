import type { ReactNode } from 'react';
import { SectionLayout } from '@/components/section-nav';
import { dashboard } from '@/routes/admin';
import { index as amenities } from '@/routes/admin/amenities';
import { index as propertyTypes } from '@/routes/admin/property-types';
import { index as bookings } from '@/routes/admin/bookings';
import { index as cities } from '@/routes/admin/cities';
import { index as countries } from '@/routes/admin/countries';
import { index as properties } from '@/routes/admin/properties';
import { index as users } from '@/routes/admin/users';

export default function AdminLayout({ children }: { children: ReactNode }) {
    return (
        <SectionLayout
            title="Administration"
            links={[
                {
                    label: 'Tableau de bord',
                    href: dashboard().url,
                    exact: true,
                },
                { label: 'Logements', href: properties().url },
                { label: 'Réservations', href: bookings().url },
                { label: 'Utilisateurs', href: users().url },
                { label: 'Pays', href: countries().url },
                { label: 'Villes', href: cities().url },
                { label: 'Équipements', href: amenities().url },
                { label: 'Types de logement', href: propertyTypes().url },
            ]}
        >
            {children}
        </SectionLayout>
    );
}
