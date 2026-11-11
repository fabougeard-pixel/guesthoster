import type { Option } from './catalog';

export type PropertyStatus =
    | 'draft'
    | 'pending'
    | 'published'
    | 'rejected'
    | 'archived';

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
