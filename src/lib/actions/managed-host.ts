'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { getFreshSessionUser, isAdmin } from '@/lib/auth/session';
import type { ActionResult } from '@/lib/actions/types';

export async function switchManagedHostAction(hostId: number): Promise<ActionResult> {
    const user = await getFreshSessionUser();
    if (!user || !isAdmin(user)) {
        return { ok: false, error: 'Accès administrateur requis.' };
    }

    const cookieStore = await cookies();
    cookieStore.set('gh_managed_host_id', String(hostId), {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 jours
    });

    revalidatePath('/hote', 'layout');
    revalidatePath('/hote');
    revalidatePath('/hote/reservations');
    revalidatePath('/hote/messages');

    return {
        ok: true,
        toast: {
            type: 'success',
            message: 'Espace géré mis à jour.',
        },
    };
}
