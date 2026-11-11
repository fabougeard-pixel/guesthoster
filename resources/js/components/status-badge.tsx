import type { BadgeTone } from '@/components/card';
import { Badge } from '@/components/card';
import type { PropertyStatus } from '@/types';

const tones: Record<PropertyStatus, BadgeTone> = {
    draft: 'neutral',
    pending: 'warning',
    published: 'success',
    rejected: 'danger',
    archived: 'neutral',
};

export function PropertyStatusBadge({
    status,
    label,
}: {
    status: PropertyStatus;
    label: string;
}) {
    return <Badge tone={tones[status]}>{label}</Badge>;
}
