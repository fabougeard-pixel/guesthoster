import type { ReactNode } from 'react';
import { Card } from '@/components/card';

export function AuthCard({
    title,
    description,
    children,
    footer,
}: {
    title: string;
    description?: string;
    children: ReactNode;
    footer?: ReactNode;
}) {
    return (
        <div className="flex flex-col gap-6">
            <Card className="p-6 sm:p-8">
                <div className="mb-6 flex flex-col gap-1 text-center">
                    <h1 className="text-2xl font-semibold tracking-tight">
                        {title}
                    </h1>
                    {description && (
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                            {description}
                        </p>
                    )}
                </div>
                {children}
            </Card>
            {footer && (
                <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
                    {footer}
                </p>
            )}
        </div>
    );
}

export const textLinkClasses =
    'font-medium text-primary-700 underline-offset-4 hover:underline dark:text-primary-400';
