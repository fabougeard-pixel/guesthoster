import type { Auth } from '@/types/auth';
import type { FlashData } from '@/types/flash';

declare module 'react' {
    interface InputHTMLAttributes<T> {
        passwordrules?: string;
    }
}

declare module '@inertiajs/core' {
    export interface InertiaConfig {
        flashDataType: FlashData;
        sharedPageProps: {
            name: string;
            locale: string;
            auth: Auth;
            unreadMessages: number;
            unreadNotifications: number;
            favoriteIds: number[];
            [key: string]: unknown;
        };
    }
}
