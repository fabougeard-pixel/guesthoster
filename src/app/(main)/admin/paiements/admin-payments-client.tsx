'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Field, Input, Textarea } from '@/components/form';
import { updatePlatformPaymentSettingsAction } from '@/lib/actions/admin-settings';
import type { PlatformPaymentSettings } from '@/lib/domain/platform-settings';
import { cn } from '@/lib/utils';

function Toggle({
    checked,
    onChange,
    label,
}: {
    checked: boolean;
    onChange: (value: boolean) => void;
    label: string;
}) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            onClick={() => onChange(!checked)}
            className={cn(
                'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
                checked ? 'bg-primary-600' : 'bg-zinc-300 dark:bg-zinc-700',
            )}
        >
            <span
                aria-hidden="true"
                className={cn(
                    'pointer-events-none inline-block size-5 rounded-full bg-white shadow transition',
                    checked ? 'translate-x-5' : 'translate-x-0',
                )}
            />
        </button>
    );
}

export function AdminPaymentsClient({
    initialSettings,
    stripeConfigured,
}: {
    initialSettings: PlatformPaymentSettings;
    stripeConfigured: boolean;
}) {
    const router = useRouter();
    const [settings, setSettings] = useState(initialSettings);
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState<{
        type: 'success' | 'error';
        text: string;
    } | null>(null);

    function patch(values: Partial<PlatformPaymentSettings>) {
        setSettings((prev) => ({ ...prev, ...values }));
    }

    async function handleSubmit(event: React.FormEvent) {
        event.preventDefault();
        setSaving(true);
        setStatus(null);
        try {
            const res = await updatePlatformPaymentSettingsAction(settings);
            if (!res.ok) {
                setStatus({
                    type: 'error',
                    text: res.error ?? 'Erreur lors de l’enregistrement.',
                });
            } else {
                if (res.data) {
                    setSettings(res.data);
                }
                setStatus({
                    type: 'success',
                    text: 'Moyens de paiement enregistrés. Le checkout est mis à jour.',
                });
                router.refresh();
            }
        } catch {
            setStatus({ type: 'error', text: 'Erreur lors de l’enregistrement.' });
        } finally {
            setSaving(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-6 pb-12">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 pb-5 dark:border-zinc-800">
                <div>
                    <h1 className="text-2xl font-bold">Moyens de paiement</h1>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        Activez les modes de règlement proposés aux clients au checkout.
                    </p>
                </div>
                <Button type="submit" disabled={saving}>
                    {saving ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
            </div>

            {status && (
                <div
                    role="alert"
                    className={cn(
                        'rounded-2xl border p-4 text-sm font-medium',
                        status.type === 'success'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                            : 'border-red-200 bg-red-50 text-red-800',
                    )}
                >
                    {status.text}
                </div>
            )}

            <Card className="flex items-center justify-between gap-4 p-5">
                <div>
                    <h2 className="font-semibold">Carte bancaire (Stripe)</h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Visa, Mastercard, CB, Apple Pay.{' '}
                        {stripeConfigured
                            ? 'Clés Stripe détectées sur le serveur.'
                            : 'Attention : clé STRIPE_SECRET absente du fichier .env.'}
                    </p>
                </div>
                <Toggle
                    label="Activer la carte bancaire"
                    checked={settings.enableCard}
                    onChange={(value) => patch({ enableCard: value })}
                />
            </Card>

            <Card className="flex items-center justify-between gap-4 p-5">
                <div>
                    <h2 className="font-semibold">PayPal</h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Compte PayPal ou paiement en plusieurs fois.
                    </p>
                </div>
                <Toggle
                    label="Activer PayPal"
                    checked={settings.enablePaypal}
                    onChange={(value) => patch({ enablePaypal: value })}
                />
            </Card>

            <Card className="flex flex-col gap-5 p-5">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <h2 className="font-semibold">Virement bancaire SEPA</h2>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            Les coordonnées ci-dessous sont communiquées au client.
                        </p>
                    </div>
                    <Toggle
                        label="Activer le virement bancaire"
                        checked={settings.enableBankTransfer}
                        onChange={(value) => patch({ enableBankTransfer: value })}
                    />
                </div>

                {settings.enableBankTransfer && (
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Titulaire du compte" htmlFor="bank_holder">
                            <Input
                                id="bank_holder"
                                value={settings.bankAccountHolder}
                                onChange={(e) => patch({ bankAccountHolder: e.target.value })}
                            />
                        </Field>
                        <Field label="Banque" htmlFor="bank_name">
                            <Input
                                id="bank_name"
                                value={settings.bankName}
                                onChange={(e) => patch({ bankName: e.target.value })}
                            />
                        </Field>
                        <Field label="IBAN" htmlFor="bank_iban">
                            <Input
                                id="bank_iban"
                                value={settings.bankIban}
                                onChange={(e) => patch({ bankIban: e.target.value })}
                            />
                        </Field>
                        <Field label="BIC / SWIFT" htmlFor="bank_bic">
                            <Input
                                id="bank_bic"
                                value={settings.bankBic}
                                onChange={(e) => patch({ bankBic: e.target.value })}
                            />
                        </Field>
                        <div className="sm:col-span-2">
                            <Field label="Instructions au client" htmlFor="bank_instructions">
                                <Textarea
                                    id="bank_instructions"
                                    rows={3}
                                    value={settings.bankInstructions}
                                    onChange={(e) => patch({ bankInstructions: e.target.value })}
                                />
                            </Field>
                        </div>
                    </div>
                )}
            </Card>
        </form>
    );
}
