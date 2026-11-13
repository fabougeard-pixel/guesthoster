import type { Metadata } from 'next';
import { ErrorView } from '@/components/error-view';
import { PropertyWizard } from '@/components/host/property-wizard';
import { requireAdminAccess } from '@/lib/auth/session';
import {
    getAdminOwnerOptions,
    getHostFormOptions,
    getHostPropertyForEdit,
} from '@/lib/domain/properties';
import { firstParam } from '@/lib/search-params';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Ajouter un logement · Administration',
};

export default async function AdminCreatePropertyPage({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const admin = await requireAdminAccess('/admin/logements/nouveau');
    if (!admin) {
        return <ErrorView status={403} />;
    }

    const sp = await searchParams;
    const draftSlug = firstParam(sp.draft).trim();
    const rawOwnerId = Number(firstParam(sp.owner_id));
    const defaultOwnerId =
        Number.isFinite(rawOwnerId) && rawOwnerId > 0 ? rawOwnerId : null;

    const [options, owners, initialDraft] = await Promise.all([
        getHostFormOptions(),
        getAdminOwnerOptions(),
        draftSlug ? getHostPropertyForEdit(draftSlug) : Promise.resolve(null),
    ]);

    return (
        <PropertyWizard
            mode="admin"
            options={options}
            owners={owners}
            currentUserId={admin.id}
            initialDraft={initialDraft}
            defaultOwnerId={defaultOwnerId}
        />
    );
}

