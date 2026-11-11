import type { Review } from './catalog';
export type BookingStatus =
    | 'pending'
    | 'awaiting_payment'
    | 'confirmed'
    | 'declined'
    | 'cancelled'
    | 'expired'
    | 'completed';

export type Booking = {
    reference: string;
    status: BookingStatus;
    status_label: string;
    is_instant: boolean;
    check_in: string;
    check_out: string;
    nights: number;
    guests: number;
    price_per_night: number;
    lodging_total: number;
    cleaning_fee: number;
    service_fee: number;
    total_price: number;
    special_requests: string | null;
    cancellation_reason: string | null;
    expires_at: string | null;
    paid_at: string | null;
    refunded_amount: number;
    refund_if_cancelled: number;
    refund_policy: string;
    created_at: string | null;
    property: {
        slug: string;
        title: string;
        city: string | null;
        country: string | null;
        cover_url: string | null;
        address: string | null;
        check_in_time: string;
        check_out_time: string;
    };
    guest: { name: string };
    host: { name: string };
    viewer: 'guest' | 'host';
    review?: Review | null;
    review_deadline: string | null;
    can: {
        respond: boolean;
        cancel: boolean;
        pay: boolean;
        message: boolean;
        review: boolean;
        reply_review: boolean;
    };
};
