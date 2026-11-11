'use client';

import Link from 'next/link';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { Button, buttonClasses } from '@/components/button';
import { Card } from '@/components/card';
import { Alert } from '@/components/form';
import { PhotoManager } from '@/components/host/photo-manager';
import {
    AmenitiesFields,
    CapacityFields,
    LocationFields,
    PricingFields,
    PropertyDetailsFields,
} from '@/components/host/property-fields';
import { Modal } from '@/components/modal';
import { PropertyStatusBadge } from '@/components/status-badge';
import { useActionFeedback } from '@/components/use-action-feedback';
import {
    archivePropertyAction,
    deletePropertyAction,
    restorePropertyAction,
    submitPropertyAction,
    updatePropertyStepAction,
    withdrawPropertyAction,
} from '@/lib/actions/host';
import type { FieldErrors } from '@/lib/actions/types';
import type { PropertyFormStep } from '@/lib/domain/enums';
import { cn } from '@/lib/utils';
import type { HostFormOptions, HostProperty, Option } from '@/types';

function StatusActions({ property }: { property: HostProperty }) {
    const { applyResult } = useActionFeedback();
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [busy, setBusy] = useState(false);
    const canSubmit = Object.keys(property.missing).length === 0;

    async function runAction(action: () => ReturnType<typeof submitPropertyAction>) {
        setBusy(true);
        try {
            const res = await action();
            applyResult(res);
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="flex flex-wrap gap-2">
            <Link
                href={`/logements/${property.slug}`}
                className={buttonClasses({ variant: 'ghost', size: 'sm' })}
            >
                Aperçu
            </Link>
            <Link
                href={`/hote/logements/${property.slug}/calendrier`}
                className={buttonClasses({ variant: 'ghost', size: 'sm' })}
            >
                Calendrier
            </Link>
            {(property.status === 'draft' ||
                property.status === 'rejected') && (
                <Button
                    size="sm"
                    disabled={!canSubmit || busy}
                    title={
                        canSubmit ? undefined : 'Complétez les étapes signalées'
                    }
                    onClick={() =>
                        void runAction(() => submitPropertyAction(property.slug))
                    }
                >
                    Envoyer en validation
                </Button>
            )}
            {property.status === 'pending' && (
                <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() =>
                        void runAction(() =>
                            withdrawPropertyAction(property.slug),
                        )
                    }
                >
                    Retirer de la validation
                </Button>
            )}
            {['draft', 'rejected', 'published'].includes(property.status) && (
                <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() =>
                        void runAction(() =>
                            archivePropertyAction(property.slug),
                        )
                    }
                >
                    Archiver
                </Button>
            )}
            {property.status === 'archived' && (
                <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() =>
                        void runAction(() =>
                            restorePropertyAction(property.slug),
                        )
                    }
                >
                    Restaurer
                </Button>
            )}
            <Button
                size="sm"
                variant="ghost"
                className="text-red-600 dark:text-red-400"
                onClick={() => setConfirmDelete(true)}
            >
                Supprimer
            </Button>

            <Modal
                open={confirmDelete}
                onClose={() => setConfirmDelete(false)}
                title="Supprimer ce logement ?"
            >
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Le logement et ses photos seront définitivement supprimés.
                    Un logement déjà réservé ne peut pas être supprimé :
                    archivez-le pour le retirer des recherches.
                </p>
                <div className="mt-6 flex justify-end gap-2">
                    <Button
                        variant="ghost"
                        onClick={() => setConfirmDelete(false)}
                    >
                        Annuler
                    </Button>
                    <Button
                        variant="danger"
                        loading={busy}
                        onClick={() =>
                            void runAction(() =>
                                deletePropertyAction(property.slug),
                            )
                        }
                    >
                        Supprimer définitivement
                    </Button>
                </div>
            </Modal>
        </div>
    );
}

export function EditPropertyClient({
    property,
    step,
    steps,
    options,
}: {
    property: HostProperty;
    step: PropertyFormStep;
    steps: Option[];
    options: HostFormOptions;
}) {
    const { applyResult } = useActionFeedback();
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<FieldErrors>({});

    const currentStep = steps.find((item) => item.value === step) ?? steps[0]!;

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setLoading(true);
        setErrors({});
        const fd = new FormData(event.currentTarget);

        const values: Record<string, unknown> =
            step === 'amenities'
                ? {
                      amenities: fd
                          .getAll('amenities[]')
                          .map((val) => Number(val)),
                  }
                : Object.fromEntries(fd.entries());

        try {
            const res = await updatePropertyStepAction({
                slug: property.slug,
                step,
                values,
            });
            applyResult(res, { setFieldErrors: setErrors });
        } finally {
            setLoading(false);
        }
    }

    return (
        <>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        <h1 className="text-2xl font-semibold">
                            {property.title}
                        </h1>
                        <PropertyStatusBadge
                            status={property.status}
                            label={property.status_label}
                        />
                    </div>
                </div>
                <StatusActions property={property} />
            </div>

            <div className="mt-6 flex flex-col gap-3">
                {property.status === 'rejected' &&
                    property.rejection_reason && (
                        <Alert tone="warning">
                            <strong>Refusé par la modération :</strong>{' '}
                            {property.rejection_reason} Corrigez puis renvoyez
                            votre logement en validation.
                        </Alert>
                    )}
                {property.status === 'pending' && (
                    <Alert tone="info">
                        Votre logement est en cours de validation. Vous pouvez
                        encore le modifier.
                    </Alert>
                )}
            </div>

            <div className="mt-8 flex flex-col gap-8 lg:flex-row">
                <nav aria-label="Étapes" className="lg:w-60">
                    <ol className="flex gap-1 overflow-x-auto lg:flex-col">
                        {steps.map((item, index) => {
                            const isActive = item.value === currentStep.value;
                            const missing = property.missing[item.value];

                            return (
                                <li key={item.value} className="shrink-0">
                                    <Link
                                        href={`/hote/logements/${property.slug}/modifier/${item.value}`}
                                        aria-current={
                                            isActive ? 'step' : undefined
                                        }
                                        className={cn(
                                            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                                            isActive
                                                ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100'
                                                : 'text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-900',
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                'flex size-6 items-center justify-center rounded-full text-xs',
                                                missing
                                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
                                            )}
                                            aria-hidden="true"
                                        >
                                            {missing ? index + 1 : '✓'}
                                        </span>
                                        {item.label}
                                        {missing && (
                                            <span className="sr-only">
                                                {' '}
                                                (à compléter)
                                            </span>
                                        )}
                                    </Link>
                                </li>
                            );
                        })}
                    </ol>
                </nav>

                <Card className="flex-1 p-6">
                    <h2 className="text-lg font-semibold">
                        {currentStep.label}
                    </h2>
                    {property.missing[currentStep.value] && (
                        <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
                            {property.missing[currentStep.value]}
                        </p>
                    )}

                    <div className="mt-6">
                        {currentStep.value === 'photos' ? (
                            <PhotoManager
                                property={property}
                                minPhotos={options.minPhotos}
                                maxPhotos={options.maxPhotos}
                                cloudinaryDirectUpload={
                                    options.cloudinaryDirectUpload
                                }
                            />
                        ) : (
                            <form
                                key={currentStep.value}
                                onSubmit={(event) => void handleSubmit(event)}
                                className="flex flex-col gap-6"
                            >
                                {currentStep.value === 'details' && (
                                    <PropertyDetailsFields
                                        errors={errors}
                                        types={options.types}
                                        property={property}
                                    />
                                )}
                                {currentStep.value === 'location' && (
                                    <LocationFields
                                        errors={errors}
                                        property={property}
                                        countries={options.countries}
                                    />
                                )}
                                {currentStep.value === 'capacity' && (
                                    <CapacityFields
                                        errors={errors}
                                        property={property}
                                    />
                                )}
                                {currentStep.value === 'amenities' && (
                                    <AmenitiesFields
                                        errors={errors}
                                        property={property}
                                        amenities={options.amenities}
                                    />
                                )}
                                {currentStep.value === 'pricing' && (
                                    <PricingFields
                                        errors={errors}
                                        property={property}
                                        bookingModes={options.bookingModes}
                                    />
                                )}
                                <Button
                                    type="submit"
                                    loading={loading}
                                    className="self-end"
                                >
                                    Enregistrer et continuer
                                </Button>
                            </form>
                        )}
                    </div>
                </Card>
            </div>
        </>
    );
}

