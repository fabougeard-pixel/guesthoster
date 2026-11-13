import type {
    BookingStatus,
    PropertyStatus,
    RentalDuration,
    UserRole,
} from '@/lib/domain/enums';

export type { BookingStatus, PropertyStatus, RentalDuration, UserRole };

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
    rental_duration: RentalDuration;
    city: string;
    country: string;
    cover_url: string | null;
    price_per_night: number;
    monthly_rent: number;
    monthly_charges: number;
    charges_included: boolean;
    security_deposit: number;
    advance_rent_months: number;
    cleaning_fee: number;
    max_guests: number;
    bedrooms: number;
    beds: number;
    bathrooms: number;
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
    rental_duration: RentalDuration;
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
    monthly_rent: number;
    security_deposit: number;
    monthly_charges: number;
    charges_included: boolean;
    advance_rent_months: number;
    check_in_time: string;
    check_out_time: string;
    cancellation_days: number;
    managed_by_admin: boolean;
    images: { id: number; url: string; alt: string }[];
    amenities: {
        category: string;
        items: { slug: string; name: string }[];
    }[];
    host: { id?: number; name: string; member_since: number | null };
};

export type SearchFilters = {
    destination: string | null;
    rental_duration: RentalDuration | null;
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
    rental_duration: RentalDuration;
    check_in: string;
    check_out: string;
    nights: number;
    guests: number;
    price_per_night: number;
    lodging_total: number;
    cleaning_fee: number;
    service_fee: number;
    monthly_rent: number;
    security_deposit: number;
    monthly_charges: number;
    charges_included: boolean;
    advance_rent_months: number;
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
    rental_duration: RentalDuration;
    city: string | null;
    cover_url: string | null;
    status: PropertyStatus;
    status_label: string;
    price_per_night: number;
    monthly_rent: number;
    upcoming_bookings: number;
    updated_at: string | null;
};

export type HostProperty = {
    id: number;
    slug: string;
    title: string;
    property_type_id: number;
    rental_duration: RentalDuration;
    description: string;
    status: PropertyStatus;
    status_label: string;
    rejection_reason: string | null;
    city_id: number | null;
    address: string | null;
    postal_code: string | null;
    latitude: number | null;
    longitude: number | null;
    user_id?: number;
    max_guests: number;
    bedrooms: number;
    beds: number;
    bathrooms: number;
    amenities: number[];
    price_per_night: number;
    cleaning_fee: number;
    min_nights: number;
    max_nights: number | null;
    monthly_rent: number;
    security_deposit: number;
    monthly_charges: number;
    charges_included: boolean;
    advance_rent_months: number;
    check_in_time: string;
    check_out_time: string;
    cancellation_days: number;
    managed_by_admin: boolean;
    booking_mode: string;
    images: { id: number; url: string | null; is_processed: boolean }[];
    missing: Partial<Record<string, string>>;
};

export type HostFormOptions = {
    types: Option[];
    rentalDurations: Option[];
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

export type AdminOwnerOption = {
    id: number;
    name: string;
    email: string;
    role: UserRole;
};

export type AdminProperty = {
    id: number;
    slug: string;
    title: string;
    type: string;
    rental_duration: RentalDuration;
    booking_mode: string;
    cover_url: string | null;
    city: string | null;
    price_per_night: number;
    monthly_rent: number;
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

export type InquiryMessage = {
    id: number;
    inquiry_id: number;
    sender_id: number;
    sender_role: 'guest' | 'host' | 'admin';
    sender_name: string;
    body: string;
    read_at: string | null;
    created_at: string | null;
};

export type PropertyInquiryDetail = {
    id: number;
    reference: string;
    property_id: number;
    property_title: string;
    property_slug: string;
    guest_id: number;
    guest_name: string;
    guest_email?: string;
    host_id: number;
    host_name: string;
    host_email?: string;
    is_managed_by_admin: boolean;
    status: 'open' | 'closed';
    closed_at: string | null;
    recap_sent_at: string | null;
    created_at: string | null;
    messages: InquiryMessage[];
};


