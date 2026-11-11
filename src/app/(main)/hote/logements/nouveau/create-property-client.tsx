'use client';

import type { FormEvent } from 'react';
import { useState } from 'react';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { PropertyDetailsFields } from '@/components/host/property-fields';
import { useActionFeedback } from '@/components/use-action-feedback';
import { createPropertyAction } from '@/lib/actions/host';
import type { FieldErrors } from '@/lib/actions/types';
import type { Option } from '@/types';

export function CreatePropertyClient({ types }: { types: Option[] }) {
    const { applyResult } = useActionFeedback();
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<FieldErrors>({});

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setLoading(true);
        setErrors({});
        const fd = new FormData(event.currentTarget);

        try {
            const res = await createPropertyAction({
                title: String(fd.get('title') ?? ''),
                property_type_id: Number(fd.get('property_type_id') ?? 0),
                description: String(fd.get('description') ?? ''),
            });
            applyResult(res, { setFieldErrors: setErrors });
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="mx-auto flex max-w-2xl flex-col gap-6">
            <div>
                <h1 className="text-2xl font-semibold">Nouveau logement</h1>
                <p className="mt-1 text-zinc-600 dark:text-zinc-400">
                    Commencez par l’essentiel : votre brouillon est enregistré,
                    vous compléterez le reste ensuite.
                </p>
            </div>
            <Card className="p-6">
                <form
                    onSubmit={(event) => void handleSubmit(event)}
                    className="flex flex-col gap-6"
                >
                    <PropertyDetailsFields errors={errors} types={types} />
                    <Button
                        type="submit"
                        loading={loading}
                        className="self-end"
                    >
                        Créer le brouillon
                    </Button>
                </form>
            </Card>
        </div>
    );
}

