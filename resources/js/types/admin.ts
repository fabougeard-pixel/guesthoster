import type { BookingStatus } from './booking';
import type { Option } from './catalog';
import type { PropertyStatus } from './host';
import type { UserRole } from './auth';

/** Paginateur Laravel sérialisé (`paginate()->through()`). */
export type Paginated<T> = {
    data: T[];
    current_page: number;
    last_page: number;
    from: number | null;
    to: number | null;
    total: number;
    prev_page_url: string | null;
    next_page_url: string | null;
};

export type CountedOption = Option & { count: number };

export type AdminProperty = {
    id: number;
    slug: string;
    title: string;
    type: string;
    booking_mode: string;
    cover_url: string | null;
    city: string | null;
    price_per_night: number;
    photos: number;
    status: PropertyStatus;
    status_label: string;
    rejection_reason: string | null;
    host: { name: string; email: string; suspended: boolean };
    submitted_at: string | null;
    published_at: string | null;
};

export type AdminUser = {
    id: number;
    name: string;
    email: string;
    role: UserRole;
    role_label: string;
    verified: boolean;
    suspended_at: string | null;
    created_at: string | null;
    properties: number;
    bookings: number;
    is_self: boolean;
};

export type AdminBooking = {
    reference: string;
    status: BookingStatus;
    status_label: string;
    mode_label: string;
    check_in: string;
    check_out: string;
    guests: number;
    total_price: number;
    service_fee: number;
    refunded_amount: number;
    paid: boolean;
    property: string;
    host: string;
    guest: { name: string; email: string };
    created_at: string | null;
};

export type AdminCountry = {
    id: number;
    name: string;
    code: string;
    flag_emoji: string | null;
    is_active: boolean;
    sort_order: number;
    cities: number;
};

export type AdminCity = {
    id: number;
    country_id: number;
    country: string;
    name: string;
    latitude: number | null;
    longitude: number | null;
    is_popular: boolean;
    is_active: boolean;
    sort_order: number;
    properties: number;
};

export type AdminPropertyType = {
    id: number;
    slug: string;
    name: string;
    is_active: boolean;
    sort_order: number;
    properties: number;
};

export type AdminAmenity = {
    id: number;
    slug: string;
    name: string;
    category: string;
    category_label: string;
    icon: string | null;
    sort_order: number;
    properties: number;
};
