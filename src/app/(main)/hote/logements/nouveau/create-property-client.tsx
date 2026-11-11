'use client';

import { PropertyWizard } from '@/components/host/property-wizard';
import type { HostFormOptions, HostProperty } from '@/types';

export function CreatePropertyClient({
    options,
    initialDraft = null,
}: {
    options: HostFormOptions;
    initialDraft?: HostProperty | null;
}) {
    return (
        <PropertyWizard
            mode="host"
            options={options}
            initialDraft={initialDraft}
        />
    );
}
