export type Option = { value: string; label: string };

export type DateRange = { start: string; end: string };

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
