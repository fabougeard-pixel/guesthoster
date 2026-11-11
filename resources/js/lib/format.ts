const euros = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
});

const eurosWithCents = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
});

/**
 * Formate un montant stocké en centimes ; les centimes ne s'affichent que s'ils existent.
 */
export function formatPrice(cents: number): string {
    return (cents % 100 === 0 ? euros : eurosWithCents).format(cents / 100);
}

/**
 * « 1 voyageur », « 3 voyageurs » (0 et 1 au singulier, règle française).
 */
export function plural(count: number, singular: string, pluralForm?: string) {
    return `${count} ${count > 1 ? (pluralForm ?? `${singular}s`) : singular}`;
}

/*
 * Dates calendaires manipulées en chaînes « AAAA-MM-JJ » et calculées en UTC,
 * pour éviter tout décalage de fuseau entre serveur, SSR et navigateur.
 */

export function parseDate(iso: string): Date {
    const [year, month, day] = iso.split('-').map(Number);

    return new Date(Date.UTC(year, month - 1, day));
}

export function toIsoDate(date: Date): string {
    return date.toISOString().slice(0, 10);
}

export function todayIso(): string {
    const now = new Date();

    return toIsoDate(
        new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())),
    );
}

export function addDays(iso: string, days: number): string {
    const date = parseDate(iso);
    date.setUTCDate(date.getUTCDate() + days);

    return toIsoDate(date);
}

export function diffInDays(from: string, to: string): number {
    return Math.round(
        (parseDate(to).getTime() - parseDate(from).getTime()) / 86_400_000,
    );
}

export function isValidIsoDate(value: unknown): value is string {
    return (
        typeof value === 'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test(value) &&
        toIsoDate(parseDate(value)) === value
    );
}

export function formatDate(
    iso: string,
    options: Intl.DateTimeFormatOptions = {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    },
): string {
    return new Intl.DateTimeFormat('fr-FR', {
        ...options,
        timeZone: 'UTC',
    }).format(parseDate(iso));
}

/**
 * Horodatage ISO 8601 (avec fuseau) affiché dans le fuseau du navigateur : « 8 novembre, 14:30 ».
 */
export function formatDateTime(iso: string): string {
    return new Intl.DateTimeFormat('fr-FR', {
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(iso));
}
