function num(key: string, fallback: number): number {
    const raw = process.env[key];
    if (!raw) {
        return fallback;
    }

    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : fallback;
}

export const env = {
    get appName(): string {
        return (
            process.env.NEXT_PUBLIC_APP_NAME?.trim() ||
            process.env.APP_NAME?.trim() ||
            'GuestHoster'
        );
    },
    get appUrl(): string {
        const raw =
            process.env.NEXT_PUBLIC_APP_URL?.trim() ||
            process.env.APP_URL?.trim() ||
            (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
        return raw.replace(/\/+$/, '');
    },
    get isProduction(): boolean {
        return (
            process.env.VERCEL_ENV === 'production' ||
            process.env.APP_ENV === 'production' ||
            process.env.NODE_ENV === 'production'
        );
    },
    get authSecret(): string {
        return (
            process.env.AUTH_SECRET?.trim() ||
            process.env.APP_KEY?.trim() ||
            'dev-insecure-fallback-secret-change-in-production'
        );
    },
    get cronSecret(): string | null {
        return process.env.CRON_SECRET?.trim() || null;
    },
    get resendApiKey(): string | null {
        return process.env.RESEND_API_KEY?.trim() || null;
    },
    get mailFrom(): string {
        const address = process.env.MAIL_FROM_ADDRESS?.trim() || 'hello@guesthoster.com';
        const name = process.env.MAIL_FROM_NAME?.trim() || 'Guest Hoster';
        return `${name} <${address}>`;
    },
    get stripeSecret(): string | null {
        return (
            process.env.STRIPE_SECRET_KEY?.trim() ||
            process.env.STRIPE_SECRET?.trim() ||
            null
        );
    },
    get stripeWebhookSecret(): string | null {
        return process.env.STRIPE_WEBHOOK_SECRET?.trim() || null;
    },
    get stripeCurrency(): string {
        return (process.env.STRIPE_CURRENCY?.trim() || 'eur').toLowerCase();
    },
    get cloudinaryCloudName(): string | null {
        return process.env.CLOUDINARY_CLOUD_NAME?.trim() || null;
    },
    get cloudinaryApiKey(): string | null {
        return process.env.CLOUDINARY_API_KEY?.trim() || null;
    },
    get cloudinaryApiSecret(): string | null {
        return process.env.CLOUDINARY_API_SECRET?.trim() || null;
    },
    get cloudinaryFolder(): string {
        return (process.env.CLOUDINARY_FOLDER?.trim() || 'guesthoster').replace(/^\/+|\/+$/g, '');
    },
    booking: {
        get serviceFeeRate(): number {
            return num('BOOKING_SERVICE_FEE_RATE', 0.1);
        },
        get hostResponseHours(): number {
            return num('BOOKING_HOST_RESPONSE_HOURS', 48);
        },
        get instantPaymentMinutes(): number {
            return num('BOOKING_INSTANT_PAYMENT_MINUTES', 60);
        },
        get approvedPaymentHours(): number {
            return num('BOOKING_APPROVED_PAYMENT_HOURS', 24);
        },
        get fullRefundDays(): number {
            return num('BOOKING_FULL_REFUND_DAYS', 7);
        },
        get lateRefundRate(): number {
            return num('BOOKING_LATE_REFUND_RATE', 0.5);
        },
        get reviewWindowDays(): number {
            return num('BOOKING_REVIEW_WINDOW_DAYS', 30);
        },
    },
};

