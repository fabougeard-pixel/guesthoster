import crypto from 'node:crypto';
import type { Prisma } from '@prisma/client';
import {
    AMENITY_CATEGORIES,
    AMENITY_CATEGORY_LABELS,
    type AmenityCategory,
    BLOCKING_BOOKING_STATUSES,
    BOOKING_MODE_LABELS,
    BOOKING_MODE_OPTIONS,
    type BookingMode,
    PROPERTY_STATUS_LABELS,
    type PropertyStatus,
    RENTAL_DURATION_OPTIONS,
    RENTAL_DURATIONS,
    type RentalDuration,
    type UserRole,
} from '@/lib/domain/enums';
import { addDays, diffInDays, isValidIsoDate, parseDate, todayIso, toIsoDate } from '@/lib/format';
import { prisma } from '@/lib/prisma';
import {
    cloudinaryDeliveryUrls,
    destroyCloudinaryAsset,
    isCloudinaryConfigured,
} from '@/lib/services/cloudinary';
import { slugify } from '@/lib/utils';
import type {
    AdminOwnerOption,
    DateRange,
    HostFormOptions,
    HostProperty,
    Paginated,
    PropertyCard,
    PropertyDetail,
    Review,
    SearchFilters,
} from '@/types';

export const MIN_PHOTOS = 3;
export const MAX_PHOTOS = 20;

export class DomainError extends Error {
    constructor(
        message: string,
        public readonly status: number = 422,
    ) {
        super(message);
        this.name = 'DomainError';
    }
}

export function resolveImageUrl(
    path: string | null | undefined,
    cloudinaryPublicId?: string | null,
): string | null {
    if (path && path.startsWith('http')) {
        return path;
    }

    if (cloudinaryPublicId && isCloudinaryConfigured()) {
        return cloudinaryDeliveryUrls(cloudinaryPublicId).url;
    }

    return path ? `/storage/${path.replace(/^\/+/, '')}` : null;
}

export function resolveThumbnailUrl(
    thumbnailPath: string | null | undefined,
    path: string | null | undefined,
    cloudinaryPublicId?: string | null,
): string | null {
    if (thumbnailPath && thumbnailPath.startsWith('http')) {
        return thumbnailPath;
    }

    if (cloudinaryPublicId && isCloudinaryConfigured()) {
        return cloudinaryDeliveryUrls(cloudinaryPublicId).thumbnail_url;
    }

    return resolveImageUrl(thumbnailPath ?? path, cloudinaryPublicId);
}

export async function deletePropertyImageFiles(image: {
    cloudinaryPublicId: string | null;
}): Promise<void> {
    if (image.cloudinaryPublicId) {
        await destroyCloudinaryAsset(image.cloudinaryPublicId);
    }
}

export function generatePropertySlug(title: string): string {
    const base = slugify(title.slice(0, 60)) || 'logement';
    const suffix = crypto.randomBytes(4).toString('hex').slice(0, 6);
    return `${base}-${suffix}`;
}

export function missingPropertyRequirements(input: {
    cityId: number | null;
    address: string | null;
    rentalDuration?: RentalDuration | string;
    pricePerNight: number;
    monthlyRent?: number;
    processedImagesCount: number;
}): Partial<Record<string, string>> {
    const missing: Partial<Record<string, string>> = {};

    if (input.cityId === null || !input.address?.trim()) {
        missing.location = 'Indiquez la ville et l’adresse du logement.';
    }

    const isLongTerm = input.rentalDuration === 'long_term';
    if (isLongTerm) {
        if ((input.monthlyRent ?? 0) <= 0) {
            missing.pricing = 'Fixez un loyer mensuel.';
        }
    } else if (input.pricePerNight <= 0) {
        missing.pricing = 'Fixez un prix par nuit.';
    }

    if (input.processedImagesCount < MIN_PHOTOS) {
        missing.photos = `Ajoutez au moins ${MIN_PHOTOS} photos.`;
    }

    return missing;
}

type PropertyCardRecord = Prisma.PropertyGetPayload<{
    include: {
        city: { include: { country: true } };
        propertyType: true;
        images: true;
    };
}>;

export function serializePropertyCard(property: PropertyCardRecord): PropertyCard {
    const cover = property.images[0];
    const rentalDuration: RentalDuration =
        property.rentalDuration === 'long_term' ? 'long_term' : 'short_term';

    return {
        id: property.id,
        slug: property.slug,
        title: property.title,
        type: property.propertyType.name,
        rental_duration: rentalDuration,
        city: property.city?.name ?? '',
        country: property.city?.country.name ?? '',
        cover_url: cover
            ? resolveThumbnailUrl(
                  cover.thumbnailPath,
                  cover.path,
                  cover.cloudinaryPublicId,
              )
            : null,
        price_per_night: property.pricePerNight,
        monthly_rent: property.monthlyRent,
        monthly_charges: property.monthlyCharges,
        charges_included: property.chargesIncluded,
        security_deposit: property.securityDeposit,
        advance_rent_months: property.advanceRentMonths,
        cleaning_fee: property.cleaningFee,
        visit_fee: property.visitFee ?? 0,
        max_guests: property.maxGuests,
        bedrooms: property.bedrooms,
        beds: property.beds,
        bathrooms: property.bathrooms,
        is_instant: property.bookingMode === 'instant',
        rating_average:
            property.ratingAverage !== null
                ? Number(property.ratingAverage)
                : null,
        reviews_count: property.reviewsCount,
    };
}

function toStringArray(
    value: string | string[] | undefined,
): string[] {
    if (Array.isArray(value)) {
        return [...new Set(value.map((v) => v.trim()).filter(Boolean))];
    }
    if (typeof value === 'string' && value.trim()) {
        return [value.trim()];
    }
    return [];
}

function toOptionalPositiveInt(
    value: string | string[] | undefined,
    min: number,
    max: number,
): number | null {
    const raw = Array.isArray(value) ? value[0] : value;
    if (!raw || !/^\d+$/.test(raw.trim())) {
        return null;
    }

    const parsed = Number.parseInt(raw.trim(), 10);
    if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
        return null;
    }

    return parsed;
}

export function parseSearchFilters(
    raw: Record<string, string | string[] | undefined>,
): SearchFilters {
    const destinationRaw = Array.isArray(raw.destination)
        ? raw.destination[0]
        : raw.destination;
    const destination = destinationRaw?.trim()
        ? destinationRaw.trim().slice(0, 100)
        : null;

    const rawCheckIn = Array.isArray(raw.check_in) ? raw.check_in[0] : raw.check_in;
    const rawCheckOut = Array.isArray(raw.check_out)
        ? raw.check_out[0]
        : raw.check_out;

    const today = todayIso();
    const datesValid =
        isValidIsoDate(rawCheckIn) &&
        isValidIsoDate(rawCheckOut) &&
        rawCheckIn >= today &&
        rawCheckOut > rawCheckIn;

    const sortRaw = Array.isArray(raw.sort) ? raw.sort[0] : raw.sort;
    const validSorts = ['newest', 'price_asc', 'price_desc', 'top_rated'];
    const sort = sortRaw && validSorts.includes(sortRaw) ? sortRaw : 'newest';

    const instantRaw = Array.isArray(raw.instant) ? raw.instant[0] : raw.instant;
    const instant =
        instantRaw === '1' || instantRaw === 'true' || instantRaw === 'on';

    const durationRaw = Array.isArray(raw.rental_duration)
        ? raw.rental_duration[0]
        : raw.rental_duration;
    const rental_duration =
        durationRaw && (RENTAL_DURATIONS as readonly string[]).includes(durationRaw)
            ? (durationRaw as RentalDuration)
            : null;

    return {
        destination,
        rental_duration,
        check_in: datesValid ? rawCheckIn : null,
        check_out: datesValid ? rawCheckOut : null,
        guests: toOptionalPositiveInt(raw.guests, 1, 30),
        price_min: toOptionalPositiveInt(raw.price_min, 0, 100_000),
        price_max: toOptionalPositiveInt(raw.price_max, 0, 100_000),
        types: toStringArray(raw['types[]'] ?? raw.types),
        amenities: toStringArray(raw['amenities[]'] ?? raw.amenities),
        instant,
        sort,
    };
}

export function buildPaginated<T>(
    data: T[],
    total: number,
    page: number,
    perPage: number,
    basePath: string,
    extraParams?: Record<string, string | number | boolean | string[] | null | undefined>,
): Paginated<T> {
    const lastPage = Math.max(1, Math.ceil(total / perPage));
    const currentPage = Math.min(Math.max(1, page), lastPage);
    const offset = (currentPage - 1) * perPage;

    const pageUrl = (targetPage: number): string => {
        const sp = new URLSearchParams();
        if (extraParams) {
            for (const [key, val] of Object.entries(extraParams)) {
                if (val === null || val === undefined || val === '' || val === false) {
                    continue;
                }
                if (Array.isArray(val)) {
                    for (const item of val) {
                        if (item) {
                            sp.append(key, item);
                        }
                    }
                } else {
                    sp.set(key, val === true ? '1' : String(val));
                }
            }
        }
        if (targetPage > 1) {
            sp.set('page', String(targetPage));
        }
        const qs = sp.toString();
        return qs ? `${basePath}?${qs}` : basePath;
    };

    return {
        data,
        current_page: currentPage,
        last_page: lastPage,
        from: total > 0 ? offset + 1 : null,
        to: total > 0 ? offset + data.length : null,
        total,
        prev_page_url: currentPage > 1 ? pageUrl(currentPage - 1) : null,
        next_page_url: currentPage < lastPage ? pageUrl(currentPage + 1) : null,
    };
}

function buildPropertyOrderBy(
    sort: string,
    rentalDuration?: RentalDuration | null,
): Prisma.PropertyOrderByWithRelationInput[] {
    const priceColumn = rentalDuration === 'long_term' ? 'monthlyRent' : 'pricePerNight';
    switch (sort) {
        case 'price_asc':
            return [{ [priceColumn]: 'asc' }, { id: 'desc' }];
        case 'price_desc':
            return [{ [priceColumn]: 'desc' }, { id: 'desc' }];
        case 'top_rated':
            return [
                { ratingAverage: { sort: 'desc', nulls: 'last' } },
                { reviewsCount: 'desc' },
                { id: 'desc' },
            ];
        default:
            return [{ publishedAt: 'desc' }, { id: 'desc' }];
    }
}

export async function searchPublishedProperties(
    filters: SearchFilters,
    page: number,
    perPage = 12,
): Promise<{
    properties: Paginated<PropertyCard>;
    total: number;
}> {
    const andClauses: Prisma.PropertyWhereInput[] = [
        { status: 'published' },
        { owner: { is: { suspendedAt: null } } },
    ];

    if (filters.destination) {
        andClauses.push({
            OR: [
                {
                    city: {
                        is: {
                            name: {
                                contains: filters.destination,
                                mode: 'insensitive',
                            },
                        },
                    },
                },
                {
                    city: {
                        is: {
                            country: {
                                is: {
                                    name: {
                                        contains: filters.destination,
                                        mode: 'insensitive',
                                    },
                                },
                            },
                        },
                    },
                },
            ],
        });
    }

    if (filters.rental_duration) {
        andClauses.push({ rentalDuration: filters.rental_duration });
    }

    if (filters.guests !== null) {
        andClauses.push({ maxGuests: { gte: filters.guests } });
    }

    if (filters.price_min !== null) {
        const minCents = filters.price_min * 100;
        if (filters.rental_duration === 'long_term') {
            andClauses.push({ monthlyRent: { gte: minCents } });
        } else if (filters.rental_duration === 'short_term') {
            andClauses.push({ pricePerNight: { gte: minCents } });
        } else {
            andClauses.push({
                OR: [
                    { rentalDuration: 'short_term', pricePerNight: { gte: minCents } },
                    { rentalDuration: 'long_term', monthlyRent: { gte: minCents } },
                ],
            });
        }
    }

    if (filters.price_max !== null) {
        const maxCents = filters.price_max * 100;
        if (filters.rental_duration === 'long_term') {
            andClauses.push({ monthlyRent: { lte: maxCents } });
        } else if (filters.rental_duration === 'short_term') {
            andClauses.push({ pricePerNight: { lte: maxCents } });
        } else {
            andClauses.push({
                OR: [
                    { rentalDuration: 'short_term', pricePerNight: { lte: maxCents } },
                    { rentalDuration: 'long_term', monthlyRent: { lte: maxCents } },
                ],
            });
        }
    }

    if (filters.instant) {
        andClauses.push({ bookingMode: 'instant' });
    }

    if (filters.types.length > 0) {
        andClauses.push({
            propertyType: {
                is: {
                    slug: { in: filters.types },
                    isActive: true,
                },
            },
        });
    }

    for (const amenitySlug of filters.amenities) {
        andClauses.push({
            amenities: {
                some: {
                    amenity: { is: { slug: amenitySlug } },
                },
            },
        });
    }

    if (filters.check_in && filters.check_out) {
        const nights = diffInDays(filters.check_in, filters.check_out);
        const startDate = parseDate(filters.check_in);
        const endDate = parseDate(filters.check_out);

        andClauses.push({
            OR: [
                { rentalDuration: 'long_term' },
                {
                    AND: [
                        { minNights: { lte: nights } },
                        { OR: [{ maxNights: null }, { maxNights: { gte: nights } }] },
                    ],
                },
            ],
        });
        andClauses.push({
            bookings: {
                none: {
                    status: { in: BLOCKING_BOOKING_STATUSES },
                    checkIn: { lt: endDate },
                    checkOut: { gt: startDate },
                },
            },
        });
        andClauses.push({
            blockedPeriods: {
                none: {
                    startsOn: { lt: endDate },
                    endsOn: { gt: startDate },
                },
            },
        });
    }

    const where: Prisma.PropertyWhereInput = { AND: andClauses };
    const safePage = Math.max(1, page);

    const [total, rows] = await Promise.all([
        prisma.property.count({ where }),
        prisma.property.findMany({
            where,
            include: {
                city: { include: { country: true } },
                propertyType: true,
                images: {
                    where: { processedAt: { not: null } },
                    orderBy: { position: 'asc' },
                    take: 1,
                },
            },
            orderBy: buildPropertyOrderBy(filters.sort, filters.rental_duration),
            skip: (safePage - 1) * perPage,
            take: perPage,
        }),
    ]);

    const cards = rows.map(serializePropertyCard);
    const paginated = buildPaginated(cards, total, safePage, perPage, '/logements', {
        destination: filters.destination,
        rental_duration: filters.rental_duration,
        check_in: filters.check_in,
        check_out: filters.check_out,
        guests: filters.guests,
        price_min: filters.price_min,
        price_max: filters.price_max,
        'types[]': filters.types,
        'amenities[]': filters.amenities,
        instant: filters.instant,
        sort: filters.sort !== 'newest' ? filters.sort : null,
    });

    return { properties: paginated, total };
}

export async function isPropertyAvailableBetween(
    propertyId: number,
    checkInIso: string,
    checkOutIso: string,
    excludeBookingId?: number,
): Promise<boolean> {
    const start = parseDate(checkInIso);
    const end = parseDate(checkOutIso);

    const [overlappingBooking, overlappingBlock] = await Promise.all([
        prisma.booking.findFirst({
            where: {
                propertyId,
                ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
                status: { in: BLOCKING_BOOKING_STATUSES },
                checkIn: { lt: end },
                checkOut: { gt: start },
            },
            select: { id: true },
        }),
        prisma.blockedPeriod.findFirst({
            where: {
                propertyId,
                startsOn: { lt: end },
                endsOn: { gt: start },
            },
            select: { id: true },
        }),
    ]);

    return !overlappingBooking && !overlappingBlock;
}

export async function getUnavailableRanges(
    propertyId: number,
): Promise<DateRange[]> {
    const todayDate = parseDate(todayIso());

    const [bookings, blocks] = await Promise.all([
        prisma.booking.findMany({
            where: {
                propertyId,
                status: { in: BLOCKING_BOOKING_STATUSES },
                checkOut: { gt: todayDate },
            },
            select: { checkIn: true, checkOut: true },
        }),
        prisma.blockedPeriod.findMany({
            where: {
                propertyId,
                endsOn: { gt: todayDate },
            },
            select: { startsOn: true, endsOn: true },
        }),
    ]);

    return [
        ...bookings.map((b) => ({
            start: toIsoDate(b.checkIn),
            end: toIsoDate(b.checkOut),
        })),
        ...blocks.map((p) => ({
            start: toIsoDate(p.startsOn),
            end: toIsoDate(p.endsOn),
        })),
    ].sort((a, b) => a.start.localeCompare(b.start));
}

export async function getPropertyDetailForViewer(
    slug: string,
    viewer: { id: number; role: string } | null,
): Promise<{
    property: PropertyDetail;
    unavailableRanges: DateRange[];
    reviews: Review[];
    seoDescription: string;
    coverImage: string | null;
    recordId: number;
    ownerId: number;
    isListed: boolean;
} | null> {
    const row = await prisma.property.findUnique({
        where: { slug },
        include: {
            owner: {
                select: {
                    id: true,
                    name: true,
                    hostType: true,
                    createdAt: true,
                    suspendedAt: true,
                },
            },
            city: { include: { country: true } },
            propertyType: true,
            images: {
                where: { processedAt: { not: null } },
                orderBy: { position: 'asc' },
            },
            amenities: {
                include: { amenity: true },
            },
        },
    });

    if (!row) {
        return null;
    }

    const isListed = row.status === 'published' && row.owner.suspendedAt === null;
    const canView =
        isListed ||
        (viewer !== null && (viewer.role === 'admin' || viewer.id === row.userId));

    if (!canView) {
        return null;
    }

    const [unavailableRanges, reviewRows, hostReviewRows] = await Promise.all([
        getUnavailableRanges(row.id),
        prisma.review.findMany({
            where: { propertyId: row.id },
            include: { author: { select: { name: true } } },
            orderBy: { createdAt: 'desc' },
            take: 6,
        }),
        prisma.review.findMany({
            where: { property: { userId: row.owner.id } },
            include: { author: { select: { name: true } } },
            orderBy: { createdAt: 'desc' },
            take: 12,
        }),
    ]);

    const hostRatings = hostReviewRows.map((r) => r.rating);
    const hostRatingAverage =
        hostRatings.length > 0
            ? Number(
                  (
                      hostRatings.reduce((sum, r) => sum + r, 0) /
                      hostRatings.length
                  ).toFixed(1),
              )
            : 5.0;
    const hostReviewsCount = hostReviewRows.length;

    const hostReviews: Review[] = hostReviewRows.map((review) => {
        const first =
            review.author.name.trim().split(/\s+/)[0] || review.author.name;
        return {
            id: review.id,
            rating: review.rating,
            comment: review.comment,
            author: first,
            created_at: review.createdAt ? review.createdAt.toISOString() : null,
            host_reply: review.hostReply,
            replied_at: review.repliedAt ? review.repliedAt.toISOString() : null,
        };
    });

    const groupedAmenities = AMENITY_CATEGORIES.map((category) => {
        const items = row.amenities
            .map((a) => a.amenity)
            .filter((a) => a.category === category)
            .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
            .map((a) => ({ slug: a.slug, name: a.name }));

        return {
            category: AMENITY_CATEGORY_LABELS[category as AmenityCategory] ?? category,
            items,
        };
    }).filter((group) => group.items.length > 0);

    const images = row.images
        .map((img) => {
            const url = resolveImageUrl(img.path, img.cloudinaryPublicId);
            return url
                ? {
                      id: img.id,
                      url,
                      alt: img.alt ?? row.title,
                  }
                : null;
        })
        .filter((img): img is { id: number; url: string; alt: string } => img !== null);

    const status = row.status as PropertyStatus;
    const bookingMode = row.bookingMode as BookingMode;
    const rentalDuration: RentalDuration =
        row.rentalDuration === 'long_term' ? 'long_term' : 'short_term';

    const property: PropertyDetail = {
        id: row.id,
        slug: row.slug,
        title: row.title,
        description: row.description,
        type: row.propertyType.name,
        rental_duration: rentalDuration,
        status,
        status_label: PROPERTY_STATUS_LABELS[status] ?? status,
        is_instant: bookingMode === 'instant',
        booking_mode_label: BOOKING_MODE_LABELS[bookingMode] ?? bookingMode,
        rating_average:
            row.ratingAverage !== null ? Number(row.ratingAverage) : null,
        reviews_count: row.reviewsCount,
        city: row.city?.name ?? '',
        country: row.city?.country.name ?? '',
        location:
            row.latitude !== null && row.longitude !== null
                ? { lat: Number(row.latitude), lng: Number(row.longitude) }
                : null,
        max_guests: row.maxGuests,
        bedrooms: row.bedrooms,
        beds: row.beds,
        bathrooms: row.bathrooms,
        price_per_night: row.pricePerNight,
        cleaning_fee: row.cleaningFee,
        visit_fee: row.visitFee ?? 0,
        min_nights: row.minNights,
        max_nights: row.maxNights,
        monthly_rent: row.monthlyRent,
        security_deposit: row.securityDeposit,
        monthly_charges: row.monthlyCharges,
        charges_included: row.chargesIncluded,
        advance_rent_months: row.advanceRentMonths,
        check_in_time: row.checkInTime.slice(0, 5),
        check_out_time: row.checkOutTime.slice(0, 5),
        cancellation_days: row.cancellationDays ?? 7,
        managed_by_admin: row.managedByAdmin ?? false,
        images,
        amenities: groupedAmenities,
        host: {
            id: row.owner.id,
            name: row.owner.name,
            host_type: row.owner.hostType ?? 'Hôte Standard',
            rating: hostRatingAverage,
            reviews_count: hostReviewsCount,
            reviews: hostReviews,
            member_since: row.owner.createdAt
                ? row.owner.createdAt.getUTCFullYear()
                : null,
            member_since_formatted: row.owner.createdAt
                ? new Intl.DateTimeFormat('fr-FR', {
                      month: 'long',
                      year: 'numeric',
                  }).format(row.owner.createdAt)
                : null,
        },
    };

    const reviews: Review[] = reviewRows.map((review) => {
        const first = review.author.name.trim().split(/\s+/)[0] || review.author.name;
        return {
            id: review.id,
            rating: review.rating,
            comment: review.comment,
            author: first,
            created_at: review.createdAt ? review.createdAt.toISOString() : null,
            host_reply: review.hostReply,
            replied_at: review.repliedAt ? review.repliedAt.toISOString() : null,
        };
    });

    const squished = row.description.replace(/\s+/g, ' ').trim();
    const seoDescription =
        squished.length > 155 ? `${squished.slice(0, 152)}...` : squished;

    return {
        property,
        unavailableRanges,
        reviews,
        seoDescription,
        coverImage: images[0]?.url ?? null,
        recordId: row.id,
        ownerId: row.userId,
        isListed,
    };
}

export async function getHostFormOptions(): Promise<HostFormOptions> {
    const [types, countries, amenities] = await Promise.all([
        prisma.propertyType.findMany({
            where: { isActive: true },
            orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
            select: { id: true, name: true },
        }),
        prisma.country.findMany({
            where: { isActive: true },
            orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
            include: {
                cities: {
                    where: { isActive: true },
                    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
                    select: { id: true, name: true },
                },
            },
        }),
        prisma.amenity.findMany({
            orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
            select: { id: true, name: true, category: true },
        }),
    ]);

    return {
        types: types.map((t) => ({ value: String(t.id), label: t.name })),
        rentalDurations: RENTAL_DURATION_OPTIONS,
        bookingModes: BOOKING_MODE_OPTIONS,
        countries: countries
            .filter((c) => c.cities.length > 0)
            .map((c) => ({
                name: c.name,
                cities: c.cities,
            })),
        amenities: AMENITY_CATEGORIES.map((category) => ({
            category: AMENITY_CATEGORY_LABELS[category],
            items: amenities
                .filter((a) => a.category === category)
                .map((a) => ({ id: a.id, name: a.name })),
        })).filter((g) => g.items.length > 0),
        minPhotos: MIN_PHOTOS,
        maxPhotos: MAX_PHOTOS,
        cloudinaryDirectUpload: isCloudinaryConfigured(),
    };
}

export function serializePropertyImages(
    images: {
        id: number;
        thumbnailPath: string | null;
        path: string | null;
        cloudinaryPublicId: string | null;
        processedAt: Date | null;
    }[],
): HostProperty['images'] {
    return images.map((img) => ({
        id: img.id,
        url: resolveThumbnailUrl(
            img.thumbnailPath,
            img.path,
            img.cloudinaryPublicId,
        ),
        is_processed: img.processedAt !== null,
    }));
}

export async function getHostPropertyForEdit(
    slug: string,
): Promise<(HostProperty & { userId: number }) | null> {
    const row = await prisma.property.findUnique({
        where: { slug },
        include: {
            amenities: { select: { amenityId: true } },
            images: { orderBy: { position: 'asc' } },
        },
    });

    if (!row) {
        return null;
    }

    const processedCount = row.images.filter((i) => i.processedAt !== null).length;
    const status = row.status as PropertyStatus;
    const rentalDuration: RentalDuration =
        row.rentalDuration === 'long_term' ? 'long_term' : 'short_term';

    return {
        id: row.id,
        userId: row.userId,
        user_id: row.userId,
        slug: row.slug,
        title: row.title,
        property_type_id: row.propertyTypeId,
        rental_duration: rentalDuration,
        description: row.description,
        status,
        status_label: PROPERTY_STATUS_LABELS[status] ?? status,
        rejection_reason: row.rejectionReason,
        city_id: row.cityId,
        address: row.address,
        postal_code: row.postalCode,
        latitude: row.latitude !== null ? Number(row.latitude) : null,
        longitude: row.longitude !== null ? Number(row.longitude) : null,
        max_guests: row.maxGuests,
        bedrooms: row.bedrooms,
        beds: row.beds,
        bathrooms: row.bathrooms,
        amenities: row.amenities.map((a) => a.amenityId),
        price_per_night: row.pricePerNight,
        cleaning_fee: row.cleaningFee,
        visit_fee: row.visitFee ?? 0,
        min_nights: row.minNights,
        max_nights: row.maxNights,
        monthly_rent: row.monthlyRent,
        security_deposit: row.securityDeposit,
        monthly_charges: row.monthlyCharges,
        charges_included: row.chargesIncluded,
        advance_rent_months: row.advanceRentMonths,
        check_in_time: row.checkInTime.slice(0, 5),
        check_out_time: row.checkOutTime.slice(0, 5),
        cancellation_days: row.cancellationDays ?? 7,
        managed_by_admin: row.managedByAdmin ?? false,
        booking_mode: row.bookingMode,
        images: serializePropertyImages(row.images),
        missing: missingPropertyRequirements({
            cityId: row.cityId,
            address: row.address,
            rentalDuration,
            pricePerNight: row.pricePerNight,
            monthlyRent: row.monthlyRent,
            processedImagesCount: processedCount,
        }),
    };
}

export async function getAdminOwnerOptions(): Promise<AdminOwnerOption[]> {
    const users = await prisma.user.findMany({
        where: { suspendedAt: null },
        orderBy: [{ name: 'asc' }],
        select: { id: true, name: true, email: true, role: true },
        take: 250,
    });

    const priority: Record<string, number> = { host: 0, admin: 1, client: 2 };
    return users
        .map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role as UserRole,
        }))
        .sort(
            (a, b) =>
                (priority[a.role] ?? 9) - (priority[b.role] ?? 9) ||
                a.name.localeCompare(b.name, 'fr'),
        );
}

export function reviewWindowDeadlineIso(checkOut: Date, days: number): string {
    return addDays(toIsoDate(checkOut), days);
}

