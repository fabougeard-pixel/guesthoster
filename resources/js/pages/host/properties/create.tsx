import { Form, Head } from '@inertiajs/react';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { PropertyDetailsFields } from '@/components/host/property-fields';
import { store } from '@/routes/host/properties';
import type { Option } from '@/types';

export default function CreateProperty({ types }: { types: Option[] }) {
    return (
        <>
            <Head title="Nouveau logement" />
            <div className="mx-auto flex max-w-2xl flex-col gap-6">
                <div>
                    <h1 className="text-2xl font-semibold">Nouveau logement</h1>
                    <p className="mt-1 text-zinc-600 dark:text-zinc-400">
                        Commencez par l’essentiel : votre brouillon est
                        enregistré, vous compléterez le reste ensuite.
                    </p>
                </div>
                <Card className="p-6">
                    <Form {...store.form()} className="flex flex-col gap-6">
                        {({ errors, processing }) => (
                            <>
                                <PropertyDetailsFields
                                    errors={errors}
                                    types={types}
                                />
                                <Button
                                    type="submit"
                                    loading={processing}
                                    className="self-end"
                                >
                                    Créer le brouillon
                                </Button>
                            </>
                        )}
                    </Form>
                </Card>
            </div>
        </>
    );
}
