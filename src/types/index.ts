import type {
    BookingStatus,
    PropertyStatus,
    UserRole,
} from '@/lib/domain/enums';

export type { BookingStatus, PropertyStatus, UserRole };

export type Option = { value: string; label: string };
export type CountedOption = Option & { count: number };
export type DateRange = { start: string; end: string };

export type User = {
    id: number;
    name: string;
    email: string;
    role: UserRole;
    email_verified_at: string | null;
    created_at: string;
    updated_at: string;
};

export type Auth = {
    user: User | null;
};

export type ToastType = 'success' | 'error' | 'info';

export type Toast = {
    type: ToastType;
    message: string;
};

export type PropertyCard = {
    id: number;
    slug: string;
    title: string;
    type: string;
    city: string;
    country: string;
    cover_url: string | null;
    price_per_night: number;
    max_guests: number;
    bedrooms: number;
    is_instant: boolean;
    rating_average: number | null;
    reviews_count: number;
};

export type Review = {
    id: number;
    rating: number;
    comment: string;
    author: string;
    created_at: string | null;
    host_reply: string | null;
    replied_at: string | null;
};

export type PropertyDetail = {
    id: number;
    slug: string;
    title: string;
    description: string;
    type: string;
    status: string;
    status_label: string;
    is_instant: boolean;
    booking_mode_label: string;
    rating_average: number | null;
    reviews_count: number;
    city: string;
    country: string;
    location: { lat: number; lng: number } | null;
    max_guests: number;
    bedrooms: number;
    beds: number;
    bathrooms: number;
    price_per_night: number;
    cleaning_fee: number;
    min_nights: number;
    max_nights: number | null;
    check_in_time: string;
    check_out_time: string;
    images: { id: number; url: string; alt: string }[];
    amenities: {
        category: string;
        items: { slug: string; name: string }[];
    }[];
    host: { name: string; member_since: number | null };
};

export type SearchFilters = {
    destination: string | null;
    check_in: string | null;
    check_out: string | null;
    guests: number | null;
    price_min: number | null;
    price_max: number | null;
    types: string[];
    amenities: string[];
    instant: boolean;
    sort: string;
};

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

export type HostPropertySummary = {
    id: number;
    slug: string;
    title: string;
    city: string | null;
    cover_url: string | null;
    status: PropertyStatus;
    status_label: string;
    price_per_night: number;
    upcoming_bookings: number;
    updated_at: string | null;
};

export type HostProperty = {
    id: number;
    slug: string;
    title: string;
    property_type_id: number;
    description: string;
    status: PropertyStatus;
    status_label: string;
    rejection_reason: string | null;
    city_id: number | null;
    address: string | null;
    postal_code: string | null;
    max_guests: number;
    bedrooms: number;
    beds: number;
    bathrooms: number;
    amenities: number[];
    price_per_night: number;
    cleaning_fee: number;
    min_nights: number;
    max_nights: number | null;
    check_in_time: string;
    check_out_time: string;
    booking_mode: string;
    images: { id: number; url: string | null; is_processed: boolean }[];
    missing: Partial<Record<string, string>>;
};

export type HostFormOptions = {
    types: Option[];
    bookingModes: Option[];
    countries: { name: string; cities: { id: number; name: string }[] }[];
    amenities: { category: string; items: { id: number; name: string }[] }[];
    minPhotos: number;
    maxPhotos: number;
    cloudinaryDirectUpload: boolean;
};

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

export type AppNotification = {
    id: string;
    title: string;
    body: string;
    read: boolean;
    created_at: string | null;
};

