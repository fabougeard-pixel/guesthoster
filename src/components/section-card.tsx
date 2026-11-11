import type { ReactNode } from 'react';
import { Card } from '@/components/card';
import { cn } from '@/lib/utils';

export function SectionCard({
    title,
    description,
    children,
    className,
}: {
    title: string;
    description?: string;
    children: ReactNode;
    className?: string;
}) {
    return (
        <Card className={cn('p-6', className)}>
            <h2 className="text-lg font-semibold">{title}</h2>
            {description && (
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    {description}
                </p>
            )}
            <div className="mt-6">{children}</div>
        </Card>
    );
}

