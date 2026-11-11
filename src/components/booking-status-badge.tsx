import type { BadgeTone } from '@/components/card';
import { Badge } from '@/components/card';
import type { BookingStatus } from '@/types';

const tones: Record<BookingStatus, BadgeTone> = {
    pending: 'warning',
    awaiting_payment: 'secondary',
    confirmed: 'success',
    declined: 'danger',
    cancelled: 'danger',
    expired: 'neutral',
    completed: 'neutral',
};

export function BookingStatusBadge({
    status,
    label,
}: {
    status: BookingStatus;
    label: string;
}) {
    return <Badge tone={tones[status]}>{label}</Badge>;
}

