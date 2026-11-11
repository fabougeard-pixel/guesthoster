import { createInertiaApp } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import AuthLayout from '@/layouts/auth-layout';
import HostLayout from '@/layouts/host-layout';
import PublicLayout from '@/layouts/public-layout';
import SettingsLayout from '@/layouts/settings-layout';
import { configureEcho } from '@laravel/echo-react';
import { realtimeEnabled } from '@/lib/realtime';

if (realtimeEnabled) {
    configureEcho({
        broadcaster: 'reverb',
    });
}

const appName = import.meta.env.VITE_APP_NAME || 'GuestHoster';

void createInertiaApp({
    title: (title) => (title ? `${title} · ${appName}` : appName),
    layout: (name) => {
        if (name.startsWith('auth/')) {
            return AuthLayout;
        }

        if (name.startsWith('admin/')) {
            return [PublicLayout, AdminLayout];
        }

        if (name.startsWith('host/')) {
            return [PublicLayout, HostLayout];
        }

        if (name.startsWith('settings/')) {
            return [PublicLayout, SettingsLayout];
        }

        return PublicLayout;
    },
    progress: {
        color: '#F35B04',
    },
});
