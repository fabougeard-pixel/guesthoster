'use client';

import { useState } from 'react';
import { Button } from '@/components/button';

export function RecordActions({
    onEdit,
    onDelete,
    label,
    canDelete,
}: {
    onEdit: () => void;
    onDelete: () => Promise<void>;
    label: string;
    canDelete: boolean;
}) {
    const [deleting, setDeleting] = useState(false);

    async function handleDelete() {
        if (!window.confirm(`Supprimer « ${label} » ?`)) {
            return;
        }
        setDeleting(true);
        try {
            await onDelete();
        } finally {
            setDeleting(false);
        }
    }

    return (
        <div className="flex justify-end gap-1">
            <Button variant="ghost" size="sm" onClick={onEdit}>
                Modifier
            </Button>
            {canDelete && (
                <Button
                    variant="ghost"
                    size="sm"
                    loading={deleting}
                    className="text-red-600 dark:text-red-400"
                    onClick={() => void handleDelete()}
                >
                    Supprimer
                </Button>
            )}
        </div>
    );
}

