import { Link } from '@inertiajs/react';
import type { RouteDefinition } from '@/wayfinder';
import { Button, buttonClasses } from '@/components/button';

/**
 * Boutons « Modifier » et « Supprimer » (avec confirmation) d’une ligne de référentiel.
 */
export function RecordActions({
    onEdit,
    destroy,
    label,
    canDelete,
}: {
    onEdit: () => void;
    destroy: RouteDefinition<'delete'>;
    label: string;
    canDelete: boolean;
}) {
    return (
        <div className="flex justify-end gap-1">
            <Button variant="ghost" size="sm" onClick={onEdit}>
                Modifier
            </Button>
            {canDelete && (
                <Link
                    href={destroy}
                    as="button"
                    preserveScroll
                    onBefore={() => confirm(`Supprimer « ${label} » ?`)}
                    className={buttonClasses({
                        variant: 'ghost',
                        size: 'sm',
                        className: 'text-red-600 dark:text-red-400',
                    })}
                >
                    Supprimer
                </Link>
            )}
        </div>
    );
}
