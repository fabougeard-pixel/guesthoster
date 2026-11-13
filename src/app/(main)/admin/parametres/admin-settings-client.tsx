'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Field, Input, Label } from '@/components/form';
import { updatePlatformRentalSettingsAction } from '@/lib/actions/admin-settings';
import type { PlatformRentalSettings } from '@/lib/domain/platform-settings';
import { formatLeaseDuration } from '@/lib/domain/platform-settings';

export function AdminSettingsClient({
    initialSettings,
}: {
    initialSettings: PlatformRentalSettings;
}) {
    const router = useRouter();
    const [settings, setSettings] = useState<PlatformRentalSettings>(initialSettings);
    const [isSaving, setIsSaving] = useState(false);
    const [statusMessage, setStatusMessage] = useState<{
        type: 'success' | 'error';
        text: string;
    } | null>(null);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setIsSaving(true);
        setStatusMessage(null);

        try {
            const res = await updatePlatformRentalSettingsAction(settings);
            if (!res.ok) {
                setStatusMessage({
                    type: 'error',
                    text: res.error ?? 'Une erreur est survenue lors de l’enregistrement.',
                });
            } else if (res.data) {
                setSettings(res.data);
                setStatusMessage({
                    type: 'success',
                    text: 'Paramètres enregistrés avec succès. Les modifications s’appliquent immédiatement sur la plateforme.',
                });
                router.refresh();
            }
        } catch (err) {
            setStatusMessage({
                type: 'error',
                text:
                    err instanceof Error
                        ? err.message
                        : 'Erreur inattendue lors de la sauvegarde.',
            });
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-8 pb-12">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 pb-5 dark:border-zinc-800">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-3xl">
                        Paramètres de location
                    </h1>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        Configurez le fonctionnement global et les règles des locations saisonnières et standard.
                    </p>
                </div>
                <Button
                    type="submit"
                    disabled={isSaving}
                    className="shadow-md"
                >
                    {isSaving ? 'Enregistrement...' : 'Enregistrer les modifications'}
                </Button>
            </div>

            {statusMessage && (
                <div
                    role="alert"
                    className={`rounded-2xl border p-4 text-sm font-medium ${
                        statusMessage.type === 'success'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300'
                    }`}
                >
                    {statusMessage.text}
                </div>
            )}

            {/* SECTION 1 : LOCATIONS STANDARD (BAIL D'HABITATION) */}
            <Card className="flex flex-col gap-6 p-6 sm:p-8">
                <div className="flex items-start justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800">
                    <div>
                        <span className="inline-flex items-center rounded-md bg-secondary-100 px-2 py-0.5 text-xs font-bold text-secondary-900 dark:bg-secondary-950/60 dark:text-secondary-300">
                            Locations standard
                        </span>
                        <h2 className="mt-2 text-lg font-bold text-zinc-900 dark:text-zinc-100">
                            Configuration des baux & rendez-vous de visite
                        </h2>
                        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                            Gérez le mode de calcul du forfait de visite, le libellé d’action sur le widget et les durées de bail.
                        </p>
                    </div>
                </div>

                <div className="flex flex-col gap-6">
                    {/* Mode de fixation du montant de visite */}
                    <div className="flex flex-col gap-3">
                        <Label className="text-sm font-semibold">
                            Tarification des rendez-vous de visite
                        </Label>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            Choisissez si le montant pour réserver un créneau de visite est fixé globalement ou défini bien par bien.
                        </p>

                        <div className="grid gap-3 sm:grid-cols-2">
                            <label
                                className={`flex cursor-pointer flex-col gap-1.5 rounded-2xl border p-4 transition ${
                                    settings.longTermVisitFeeMode === 'individual'
                                        ? 'border-primary-500 bg-primary-50/50 ring-2 ring-primary-500/20 dark:border-primary-500 dark:bg-primary-950/20'
                                        : 'border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700'
                                }`}
                            >
                                <div className="flex items-center gap-2.5">
                                    <input
                                        type="radio"
                                        name="longTermVisitFeeMode"
                                        value="individual"
                                        checked={settings.longTermVisitFeeMode === 'individual'}
                                        onChange={() =>
                                            setSettings((prev) => ({
                                                ...prev,
                                                longTermVisitFeeMode: 'individual',
                                            }))
                                        }
                                        className="accent-primary-600 size-4"
                                    />
                                    <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                                        Individuel par bien
                                    </span>
                                </div>
                                <p className="pl-6.5 text-xs text-zinc-500 dark:text-zinc-400">
                                    Chaque propriétaire ou administrateur renseigne le forfait spécifique lors de la création ou modification du bien.
                                </p>
                            </label>

                            <label
                                className={`flex cursor-pointer flex-col gap-1.5 rounded-2xl border p-4 transition ${
                                    settings.longTermVisitFeeMode === 'global'
                                        ? 'border-primary-500 bg-primary-50/50 ring-2 ring-primary-500/20 dark:border-primary-500 dark:bg-primary-950/20'
                                        : 'border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700'
                                }`}
                            >
                                <div className="flex items-center gap-2.5">
                                    <input
                                        type="radio"
                                        name="longTermVisitFeeMode"
                                        value="global"
                                        checked={settings.longTermVisitFeeMode === 'global'}
                                        onChange={() =>
                                            setSettings((prev) => ({
                                                ...prev,
                                                longTermVisitFeeMode: 'global',
                                            }))
                                        }
                                        className="accent-primary-600 size-4"
                                    />
                                    <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                                        Forfait global plateforme
                                    </span>
                                </div>
                                <p className="pl-6.5 text-xs text-zinc-500 dark:text-zinc-400">
                                    Un montant forfaitaire uniforme s’applique automatiquement à l’ensemble des biens en location standard.
                                </p>
                            </label>
                        </div>
                    </div>

                    {/* Paramètres détaillés du forfait global & du bouton */}
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field
                            label="Montant du forfait global (€)"
                            htmlFor="longTermGlobalVisitFee"
                            hint={
                                settings.longTermVisitFeeMode === 'global'
                                    ? 'Actuellement actif et appliqué à toutes les réservations de visite.'
                                    : 'Utilisé uniquement lorsque le mode global est sélectionné.'
                            }
                        >
                            <div className="relative mt-1">
                                <Input
                                    id="longTermGlobalVisitFee"
                                    type="number"
                                    min={0}
                                    max={1000}
                                    step={1}
                                    value={settings.longTermGlobalVisitFee}
                                    onChange={(e) =>
                                        setSettings((prev) => ({
                                            ...prev,
                                            longTermGlobalVisitFee: Math.max(
                                                0,
                                                Number(e.target.value) || 0,
                                            ),
                                        }))
                                    }
                                    className="pr-8"
                                />
                                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm font-bold text-zinc-400">
                                    €
                                </span>
                            </div>
                        </Field>

                        <Field
                            label="Texte du bouton sur le widget"
                            htmlFor="longTermWidgetButtonLabel"
                            hint="Libellé affiché sur la fiche logement pour déclencher la prise de rendez-vous."
                        >
                            <Input
                                id="longTermWidgetButtonLabel"
                                type="text"
                                required
                                value={settings.longTermWidgetButtonLabel}
                                onChange={(e) =>
                                    setSettings((prev) => ({
                                        ...prev,
                                        longTermWidgetButtonLabel: e.target.value,
                                    }))
                                }
                                placeholder="Prendre rendez-vous"
                                className="mt-1"
                            />
                        </Field>
                    </div>

                    {/* Durée minimale du bail par défaut */}
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field
                            label="Durée minimale de bail par défaut (mois)"
                            htmlFor="longTermDefaultMinLeaseMonths"
                            hint={`Équivalent actuel : ${formatLeaseDuration(settings.longTermDefaultMinLeaseMonths)}`}
                        >
                            <Input
                                id="longTermDefaultMinLeaseMonths"
                                type="number"
                                min={1}
                                max={120}
                                step={1}
                                value={settings.longTermDefaultMinLeaseMonths}
                                onChange={(e) =>
                                    setSettings((prev) => ({
                                        ...prev,
                                        longTermDefaultMinLeaseMonths: Math.max(
                                            1,
                                            Number(e.target.value) || 12,
                                        ),
                                    }))
                                }
                                className="mt-1"
                            />
                        </Field>
                    </div>

                    {/* Options d'affichage du widget */}
                    <div className="rounded-2xl border border-zinc-100 bg-zinc-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-850/50">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                            Affichage financier sur le widget
                        </h4>
                        <div className="mt-3 flex flex-col gap-2.5">
                            <label className="flex items-center gap-2.5 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                                <input
                                    type="checkbox"
                                    checked={settings.longTermShowDepositOnWidget}
                                    onChange={(e) =>
                                        setSettings((prev) => ({
                                            ...prev,
                                            longTermShowDepositOnWidget: e.target.checked,
                                        }))
                                    }
                                    className="accent-primary-600 size-4 rounded"
                                />
                                <span>Afficher la caution requise sur le widget</span>
                            </label>
                            <label className="flex items-center gap-2.5 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                                <input
                                    type="checkbox"
                                    checked={settings.longTermShowChargesOnWidget}
                                    onChange={(e) =>
                                        setSettings((prev) => ({
                                            ...prev,
                                            longTermShowChargesOnWidget: e.target.checked,
                                        }))
                                    }
                                    className="accent-primary-600 size-4 rounded"
                                />
                                <span>Afficher le détail des charges (comprises ou en sus)</span>
                            </label>
                        </div>
                    </div>
                </div>
            </Card>

            {/* SECTION 2 : LOCATIONS SAISONNIÈRES (COURTE DURÉE) */}
            <Card className="flex flex-col gap-6 p-6 sm:p-8">
                <div className="flex items-start justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800">
                    <div>
                        <span className="inline-flex items-center rounded-md bg-primary-100 px-2 py-0.5 text-xs font-bold text-primary-900 dark:bg-primary-950/60 dark:text-primary-300">
                            Locations saisonnières
                        </span>
                        <h2 className="mt-2 text-lg font-bold text-zinc-900 dark:text-zinc-100">
                            Frais de service & conditions d’annulation
                        </h2>
                        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                            Règles appliquées aux séjours touristiques et vacances à la nuitée.
                        </p>
                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                        label="Taux de frais de service plateforme (%)"
                        htmlFor="shortTermServiceFeeRate"
                        hint="Pourcentage ajouté au sous-total des nuitées lors de la réservation."
                    >
                        <div className="relative mt-1">
                            <Input
                                id="shortTermServiceFeeRate"
                                type="number"
                                min={0}
                                max={50}
                                step={0.5}
                                value={settings.shortTermServiceFeeRate}
                                onChange={(e) =>
                                    setSettings((prev) => ({
                                        ...prev,
                                        shortTermServiceFeeRate: Math.max(
                                            0,
                                            Number(e.target.value) || 0,
                                        ),
                                    }))
                                }
                                className="pr-8"
                            />
                            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm font-bold text-zinc-400">
                                %
                            </span>
                        </div>
                    </Field>

                    <Field
                        label="Délai d’annulation gratuite par défaut (jours)"
                        htmlFor="shortTermDefaultCancellationDays"
                        hint="Délai appliqué par défaut avant la date d’arrivée si non personnalisé."
                    >
                        <Input
                            id="shortTermDefaultCancellationDays"
                            type="number"
                            min={0}
                            max={90}
                            step={1}
                            value={settings.shortTermDefaultCancellationDays}
                            onChange={(e) =>
                                setSettings((prev) => ({
                                    ...prev,
                                    shortTermDefaultCancellationDays: Math.max(
                                        0,
                                        Number(e.target.value) || 0,
                                    ),
                                }))
                            }
                            className="mt-1"
                        />
                    </Field>
                </div>
            </Card>

            <div className="flex justify-end gap-3">
                <Button
                    type="submit"
                    size="lg"
                    disabled={isSaving}
                    className="shadow-md"
                >
                    {isSaving ? 'Enregistrement en cours...' : 'Enregistrer les paramètres'}
                </Button>
            </div>
        </form>
    );
}

