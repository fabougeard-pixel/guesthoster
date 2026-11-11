import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ErrorView } from '@/components/error-view';
import { requireVerifiedUser } from '@/lib/auth/session';
import {
    PROPERTY_FORM_STEP_LABELS,
    PROPERTY_FORM_STEP_OPTIONS,
    PROPERTY_FORM_STEPS,
    type PropertyFormStep,
} from '@/lib/domain/enums';
import {
    getHostFormOptions,
    getHostPropertyForEdit,
} from '@/lib/domain/properties';
import { EditPropertyClient } from './edit-property-client';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string; step: string }>;
}): Promise<Metadata> {
    const { step } = await params;
    const label =
        PROPERTY_FORM_STEP_LABELS[step as PropertyFormStep] ?? 'Modifier';
    return { title: label };
}

export default async function EditPropertyStepPage({
    params,
}: {
    params: Promise<{ slug: string; step: string }>;
}) {
    const user = await requireVerifiedUser();
    const { slug, step } = await params;

    if (!PROPERTY_FORM_STEPS.includes(step as PropertyFormStep)) {
        notFound();
    }

    const [property, options] = await Promise.all([
        getHostPropertyForEdit(slug),
        getHostFormOptions(),
    ]);

    if (!property) {
        notFound();
    }

    if (property.userId !== user.id && user.role !== 'admin') {
        return <ErrorView status={403} />;
    }

    return (
        <EditPropertyClient
            property={property}
            step={step as PropertyFormStep}
            steps={PROPERTY_FORM_STEP_OPTIONS}
            options={options}
        />
    );
}

