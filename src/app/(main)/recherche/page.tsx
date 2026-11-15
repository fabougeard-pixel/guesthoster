import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function RecherchePage({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const sp = await searchParams;
    const params = new URLSearchParams();

    for (const [key, value] of Object.entries(sp)) {
        if (Array.isArray(value)) {
            for (const v of value) {
                if (v) params.append(key, v);
            }
        } else if (value) {
            params.set(key, value);
        }
    }

    const query = params.toString();
    redirect(query ? `/logements?${query}` : '/logements');
}
