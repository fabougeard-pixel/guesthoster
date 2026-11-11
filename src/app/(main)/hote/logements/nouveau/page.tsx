import type { Metadata } from 'next';
import { ErrorView } from '@/components/error-view';
import { isHostOrAdmin, requireVerifiedUser } from '@/lib/auth/session';
import {
    getHostFormOptions,
    getHostPropertyForEdit,
} from '@/lib/domain/properties';
import { firstParam } from '@/lib/search-params';
import { CreatePropertyClient } from './create-property-client';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Nouveau logement',
};

export default async function CreatePropertyPage({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const user = await requireVerifiedUser();
    if (!isHostOrAdmin(user)) {
        return <ErrorView status={403} />;
    }

    const sp = await searchParams;
    const draftSlug = firstParam(sp.draft).trim();

    const [options, draftRow] = await Promise.all([
        getHostFormOptions(),
        draftSlug ? getHostPropertyForEdit(draftSlug) : Promise.resolve(null),
    ]);

    const initialDraft =
        draftRow && (draftRow.userId === user.id || user.role === 'admin')
            ? draftRow
            : null;

    return (
        <CreatePropertyClient
            options={options}
            initialDraft={initialDraft}
        />
    );
}
