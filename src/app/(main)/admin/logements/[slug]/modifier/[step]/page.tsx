import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ErrorView } from '@/components/error-view';
import { EditPropertyClient } from '@/app/(main)/hote/logements/[slug]/modifier/[step]/edit-property-client';
import { requireAdminAccess } from '@/lib/auth/session';
import {
    PROPERTY_FORM_STEP_LABELS,
    PROPERTY_FORM_STEP_OPTIONS,
    PROPERTY_FORM_STEPS,
    type PropertyFormStep,
} from '@/lib/domain/enums';
import {
    getAdminOwnerOptions,
    getHostFormOptions,
    getHostPropertyForEdit,
} from '@/lib/domain/properties';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string; step: string }>;
}): Promise<Metadata> {
    const { step } = await params;
    const label =
        PROPERTY_FORM_STEP_LABELS[step as PropertyFormStep] ?? 'Modifier';
    return { title: `${label} · Administration` };
}

export default async function AdminEditPropertyStepPage({
    params,
}: {
    params: Promise<{ slug: string; step: string }>;
}) {
    const { slug, step } = await params;
    const admin = await requireAdminAccess(
        `/admin/logements/${slug}/modifier/${step}`,
    );
    if (!admin) {
        return <ErrorView status={403} />;
    }

    if (!PROPERTY_FORM_STEPS.includes(step as PropertyFormStep)) {
        notFound();
    }

    const [property, options, owners] = await Promise.all([
        getHostPropertyForEdit(slug),
        getHostFormOptions(),
        getAdminOwnerOptions(),
    ]);

    if (!property) {
        notFound();
    }

    return (
        <EditPropertyClient
            property={property}
            step={step as PropertyFormStep}
            steps={PROPERTY_FORM_STEP_OPTIONS}
            options={options}
            isAdminContext
            owners={owners}
        />
    );
}

