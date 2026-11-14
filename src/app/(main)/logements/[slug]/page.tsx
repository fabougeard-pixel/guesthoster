import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import {
    getPlatformPaymentSettings,
    getPlatformRentalSettings,
    listEnabledPaymentMethods,
} from '@/lib/domain/platform-settings';
import { isStripeConfigured } from '@/lib/services/stripe';
import { getPropertyDetailForViewer } from '@/lib/domain/properties';
import { env } from '@/lib/env';
import { isValidIsoDate, todayIso } from '@/lib/format';
import { PropertyShowClient } from './property-show-client';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await params;
    const viewer = await getCurrentUser();
    const detail = await getPropertyDetailForViewer(slug, viewer);
    if (!detail) {
        return { title: 'Logement introuvable' };
    }

    const canonical = `${env.appUrl}/logements/${detail.property.slug}`;
    return {
        title: `${detail.property.title} · ${detail.property.city}`,
        description: detail.seoDescription,
        alternates: { canonical },
        openGraph: {
            type: 'website',
            title: detail.property.title,
            description: detail.seoDescription,
            url: canonical,
            ...(detail.coverImage
                ? { images: [{ url: detail.coverImage }] }
                : {}),
        },
    };
}

export default async function PropertyShowPage({
    params,
    searchParams,
}: {
    params: Promise<{ slug: string }>;
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const { slug } = await params;
    const [viewer, sp, rentalSettings, paymentSettings] = await Promise.all([
        getCurrentUser(),
        searchParams,
        getPlatformRentalSettings(),
        getPlatformPaymentSettings(),
    ]);
    const detail = await getPropertyDetailForViewer(slug, viewer);

    if (!detail) {
        notFound();
    }

    const rawCheckIn = Array.isArray(sp.check_in) ? sp.check_in[0] : sp.check_in;
    const rawCheckOut = Array.isArray(sp.check_out)
        ? sp.check_out[0]
        : sp.check_out;

    const validStay =
        isValidIsoDate(rawCheckIn) &&
        isValidIsoDate(rawCheckOut) &&
        rawCheckIn >= todayIso() &&
        rawCheckOut > rawCheckIn;

    const initialStay = validStay
        ? { checkIn: rawCheckIn, checkOut: rawCheckOut }
        : { checkIn: null, checkOut: null };

    const initialGuests =
        detail.property.max_guests > 0 ? detail.property.max_guests : 1;

    return (
        <PropertyShowClient
            property={detail.property}
            unavailableRanges={detail.unavailableRanges}
            serviceFeeRate={env.booking.serviceFeeRate}
            rentalSettings={rentalSettings}
            enabledMethods={listEnabledPaymentMethods(paymentSettings)}
            stripeConfigured={isStripeConfigured()}
            reviews={detail.reviews}
            initialStay={initialStay}
            initialGuests={initialGuests}
            isViewerAuthenticated={Boolean(viewer)}
        />
    );
}

