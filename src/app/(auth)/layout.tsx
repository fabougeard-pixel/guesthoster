import type { ReactNode } from 'react';
import { AuthLayout } from '@/components/layouts/auth-layout';

export default function AuthGroupLayout({ children }: { children: ReactNode }) {
    return <AuthLayout>{children}</AuthLayout>;
}

