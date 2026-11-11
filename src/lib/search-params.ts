export function firstParam(value: string | string[] | undefined): string {
    if (typeof value === 'string') {
        return value;
    }

    if (Array.isArray(value)) {
        return value[0] ?? '';
    }

    return '';
}

export function parsePageParam(value: string | string[] | undefined): number {
    const raw = firstParam(value).trim();

    if (/^\d+$/.test(raw)) {
        return Math.max(1, Number.parseInt(raw, 10));
    }

    return 1;
}

