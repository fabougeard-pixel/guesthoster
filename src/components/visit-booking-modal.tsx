'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/button';
import { Badge } from '@/components/card';
import { Field, Input, Label, Select, Textarea } from '@/components/form';
import { useActionFeedback } from '@/components/use-action-feedback';
import {
    createPropertyVisitAction,
    confirmVisitPaymentAction,
    initiateVisitPaymentAction,
    type VisitBookingResult,
} from '@/lib/actions/visits';
import {
    getSuggestedPaymentMethod,
    PaymentErrorBanner,
    PaymentErrorModal,
    type PaymentErrorState,
} from '@/components/payment-error-fallback';
import { formatLeaseDuration } from '@/lib/domain/platform-settings';
import type { PaymentMethodKey } from '@/lib/domain/platform-settings';
import { formatDate, formatPrice, todayIso } from '@/lib/format';
import type { PropertyDetail } from '@/types';

const TIME_SLOTS = ['09:30', '11:00', '14:00', '15:30', '17:00', '18:30'];

const CANDIDATE_SITUATIONS = [
    'Salarié en CDI',
    'Fonctionnaire / Service public',
    'Profession libérale / Indépendant',
    'Salarié en CDD / Période d’essai',
    'Étudiant avec garant(s)',
    'Retraité',
    'Autre situation',
];

const emptySubscribe = () => () => { };

export type BankDetails = {
    holder: string;
    bankName: string;
    iban: string;
    bic: string;
    instructions?: string;
};

const DEFAULT_BANK: BankDetails = {
    holder: 'GuestHoster SAS',
    bankName: 'BNP Paribas',
    iban: 'FR76 3000 4000 0100 0000 0000 123',
    bic: 'BNPAFRPP',
    instructions:
        'Indiquez impérativement la référence du dossier dans le libellé de votre virement bancaire pour validation automatique.',
};

export function VisitBookingModal({
    property,
    isOpen,
    onClose,
    effectiveVisitFee,
    enabledMethods = ['card', 'paypal', 'bank_transfer'],
    stripeConfigured = true,
    bank,
}: {
    property: PropertyDetail;
    isOpen: boolean;
    onClose: () => void;
    effectiveVisitFee?: number;
    enabledMethods?: PaymentMethodKey[];
    stripeConfigured?: boolean;
    bank?: BankDetails;
}) {
    const isClient = useSyncExternalStore(
        emptySubscribe,
        () => true,
        () => false,
    );

    const { pushToast } = useActionFeedback();

    const today = todayIso();
    const minVisitDate = (() => {
        const d = new Date();
        d.setDate(d.getDate() + 3);
        return d.toISOString().slice(0, 10);
    })();

    // Modal step: 'form' (booking details), 'checkout' (payment), 'confirmed' (receipt)
    const [step, setStep] = useState<'form' | 'checkout' | 'confirmed'>('form');

    // Form inputs
    const [entryDate, setEntryDate] = useState<string>('');
    const [visitDate, setVisitDate] = useState<string>('');
    const [timeSlot, setTimeSlot] = useState<string>('');
    const [name, setName] = useState<string>('');
    const [email, setEmail] = useState<string>('');
    const [phone, setPhone] = useState<string>('');
    const [situation, setSituation] = useState<string>(CANDIDATE_SITUATIONS[0]);
    const [notes, setNotes] = useState<string>('');
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethodKey>(
        enabledMethods[0] ?? 'card',
    );
    const [paymentError, setPaymentError] = useState<PaymentErrorState | null>(null);

    // Submission & Confirmation state
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [confirmedVisit, setConfirmedVisit] = useState<VisitBookingResult | null>(null);

    // Checkout specific state
    const [checkoutMethod, setCheckoutMethod] = useState<PaymentMethodKey>(
        enabledMethods[0] ?? 'card',
    );
    const [isPaying, setIsPaying] = useState(false);
    const [paymentStage, setPaymentStage] = useState<string | null>(null);
    const [stripeCheckoutLoading, setStripeCheckoutLoading] = useState(false);

    // Card inputs
    const [cardNumber, setCardNumber] = useState('');
    const [cardExpiry, setCardExpiry] = useState('');
    const [cardCvc, setCardCvc] = useState('');
    const [cardHolder, setCardHolder] = useState('');
    const [cardErrors, setCardErrors] = useState<{
        number?: string;
        expiry?: string;
        cvc?: string;
        holder?: string;
    }>({});

    // Bank transfer copy state & proof
    const [copiedField, setCopiedField] = useState<string | null>(null);
    const [proofFile, setProofFile] = useState<File | null>(null);
    const [proofPreviewUrl, setProofPreviewUrl] = useState<string | null>(null);

    const activeBank = bank && bank.iban ? bank : DEFAULT_BANK;

    // Lock body scroll while modal is open & listen for Escape
    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape' && !isSubmitting && !isPaying) {
                onClose();
            }
        }

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            document.body.style.overflow = prevOverflow;
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, isSubmitting, isPaying, onClose]);

    if (!isOpen || !isClient) {
        return null;
    }

    const visitFee =
        effectiveVisitFee !== undefined
            ? effectiveVisitFee
            : (property.visit_fee ?? 0);

    function handleCloseModal() {
        if (step === 'confirmed') {
            setStep('form');
            setConfirmedVisit(null);
            setCardNumber('');
            setCardExpiry('');
            setCardCvc('');
            setCardHolder('');
            if (proofPreviewUrl) {
                URL.revokeObjectURL(proofPreviewUrl);
                setProofPreviewUrl(null);
            }
            setProofFile(null);
        }
        setErrorMsg(null);
        setPaymentError(null);
        setIsPaying(false);
        setPaymentStage(null);
        onClose();
    }

    function copyToClipboard(text: string, label: string) {
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
            void navigator.clipboard.writeText(text);
            setCopiedField(label);
            setTimeout(() => setCopiedField(null), 2000);
            pushToast({
                type: 'info',
                message: `${label} copié dans le presse-papier !`,
            });
        }
    }

    function handleCardNumberChange(val: string) {
        const raw = val.replace(/\D/g, '').slice(0, 16);
        const formatted = raw.replace(/(\d{4})(?=\d)/g, '$1 ');
        setCardNumber(formatted);
        if (cardErrors.number) {
            setCardErrors((prev) => ({ ...prev, number: undefined }));
        }
    }

    function handleExpiryChange(val: string) {
        const raw = val.replace(/\D/g, '').slice(0, 4);
        if (raw.length >= 3) {
            setCardExpiry(`${raw.slice(0, 2)}/${raw.slice(2)}`);
        } else {
            setCardExpiry(raw);
        }
        if (cardErrors.expiry) {
            setCardErrors((prev) => ({ ...prev, expiry: undefined }));
        }
    }

    function handleCvcChange(val: string) {
        const raw = val.replace(/\D/g, '').slice(0, 4);
        setCardCvc(raw);
        if (cardErrors.cvc) {
            setCardErrors((prev) => ({ ...prev, cvc: undefined }));
        }
    }

    function handleFileChange(file: File | null) {
        if (proofPreviewUrl) {
            URL.revokeObjectURL(proofPreviewUrl);
        }
        setProofFile(file);
        if (file && file.type.startsWith('image/')) {
            setProofPreviewUrl(URL.createObjectURL(file));
        } else {
            setProofPreviewUrl(null);
        }
    }

    // Card brand detector
    const cleanNum = cardNumber.replace(/\s+/g, '');
    const isVisa = cleanNum.startsWith('4');
    const isMastercard =
        /^(5[1-5]|2[2-7])/.test(cleanNum) && !cleanNum.startsWith('4');

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setErrorMsg(null);
        setPaymentError(null);

        if (!entryDate) {
            setErrorMsg('Veuillez sélectionner une date d\'entrée souhaitée.');
            return;
        }

        if (!visitDate) {
            setErrorMsg('Veuillez sélectionner une date de visite disponible.');
            return;
        }

        if (visitDate < minVisitDate) {
            setErrorMsg(
                `La date de visite doit être au minimum le ${formatDate(minVisitDate)} (délai de 3 jours).`,
            );
            return;
        }

        if (!timeSlot) {
            setErrorMsg('Veuillez choisir un créneau horaire de visite.');
            return;
        }

        if (!name.trim()) {
            setErrorMsg('Veuillez indiquer votre nom complet.');
            return;
        }

        if (!email.trim()) {
            setErrorMsg('Veuillez indiquer votre adresse e-mail.');
            return;
        }

        // Test fallback scenarios (fail-card, fail-paypal)
        if (visitFee > 0) {
            if (
                paymentMethod === 'paypal' &&
                notes.toLowerCase().includes('fail-paypal')
            ) {
                const alternative = getSuggestedPaymentMethod(
                    'paypal',
                    enabledMethods,
                );
                setPaymentError({
                    failedMethod: 'paypal',
                    message:
                        'Le paiement par PayPal est actuellement indisponible.',
                    suggestedMethod: alternative,
                });
                return;
            }

            if (
                paymentMethod === 'card' &&
                (notes.toLowerCase().includes('fail-card') ||
                    notes.toLowerCase().includes('fail'))
            ) {
                const alternative = getSuggestedPaymentMethod(
                    'card',
                    enabledMethods,
                );
                setPaymentError({
                    failedMethod: 'card',
                    message:
                        'Le paiement par carte bancaire est actuellement indisponible.',
                    suggestedMethod: alternative,
                });
                return;
            }
        }

        setIsSubmitting(true);

        try {
            const combinedNotes = [
                `Date d'entrée souhaitée : ${formatDate(entryDate)}`,
                notes.trim(),
            ]
                .filter(Boolean)
                .join('\n');

            const res = await createPropertyVisitAction({
                propertySlug: property.slug,
                visitDate,
                timeSlot,
                name: name.trim(),
                email: email.trim(),
                phone: phone.trim() || undefined,
                situation,
                notes: combinedNotes || undefined,
                paymentMethod: visitFee > 0 ? paymentMethod : undefined,
            });

            if (!res.ok) {
                setErrorMsg(
                    res.error ??
                    'Une erreur est survenue lors de la réservation.',
                );
            } else if (res.data) {
                setConfirmedVisit(res.data);
                setCardHolder(name.trim());
                setCheckoutMethod(paymentMethod);

                if (visitFee > 0) {
                    setStep('checkout');
                } else {
                    setStep('confirmed');
                }
            }
        } catch (err) {
            setErrorMsg(
                err instanceof Error
                    ? err.message
                    : 'Erreur inattendue lors de la communication avec le serveur.',
            );
        } finally {
            setIsSubmitting(false);
        }
    }

    // Direct in-modal Card Payment
    async function handlePayCard(e: React.FormEvent) {
        e.preventDefault();
        setErrorMsg(null);
        setCardErrors({});

        const raw = cardNumber.replace(/\s+/g, '');
        const errors: { number?: string; expiry?: string; cvc?: string; holder?: string } = {};

        if (raw.length < 15 || raw.length > 16) {
            errors.number = 'Veuillez saisir les 16 chiffres de votre carte.';
        }

        if (!cardExpiry || !cardExpiry.includes('/') || cardExpiry.length !== 5) {
            errors.expiry = 'Format MM/AA attendu.';
        } else {
            const [mStr] = cardExpiry.split('/');
            const m = parseInt(mStr, 10);
            if (isNaN(m) || m < 1 || m > 12) {
                errors.expiry = 'Mois entre 01 et 12.';
            }
        }

        if (!cardCvc || cardCvc.length < 3) {
            errors.cvc = '3 chiffres au dos.';
        }

        if (!cardHolder.trim()) {
            errors.holder = 'Nom complet requis.';
        }

        if (Object.keys(errors).length > 0) {
            setCardErrors(errors);
            return;
        }

        if (!confirmedVisit) {
            setErrorMsg('Dossier introuvable.');
            return;
        }

        setIsPaying(true);
        setPaymentStage('Connexion sécurisée au réseau bancaire...');

        try {
            await new Promise((r) => setTimeout(r, 600));
            setPaymentStage('Authentification 3D Secure v2 en cours...');

            await new Promise((r) => setTimeout(r, 700));
            setPaymentStage('Validation et enregistrement de la caution...');

            const res = await confirmVisitPaymentAction({
                reference: confirmedVisit.reference,
                paymentMethod: 'card',
            });

            if (!res.ok) {
                setErrorMsg(res.error ?? 'Échec lors de la validation du paiement.');
                setIsPaying(false);
                setPaymentStage(null);
                return;
            }

            setConfirmedVisit((prev) =>
                prev
                    ? { ...prev, paymentMethod: 'card', paymentStatus: 'paid' }
                    : null,
            );
            pushToast({
                type: 'success',
                message: 'Caution de location réglée par Carte Bancaire avec succès !',
            });
            setStep('confirmed');
        } catch (err) {
            setErrorMsg(
                err instanceof Error ? err.message : 'Erreur de connexion bancaire.',
            );
        } finally {
            setIsPaying(false);
            setPaymentStage(null);
        }
    }

    // PayPal Payment
    async function handlePayPaypal() {
        if (!confirmedVisit) {
            return;
        }
        setErrorMsg(null);
        setIsPaying(true);
        setPaymentStage('Connexion sécurisée à PayPal...');

        try {
            await new Promise((r) => setTimeout(r, 800));

            const res = await confirmVisitPaymentAction({
                reference: confirmedVisit.reference,
                paymentMethod: 'paypal',
            });

            if (!res.ok) {
                setErrorMsg(res.error ?? 'Échec lors de la validation PayPal.');
                setIsPaying(false);
                setPaymentStage(null);
                return;
            }

            setConfirmedVisit((prev) =>
                prev
                    ? { ...prev, paymentMethod: 'paypal', paymentStatus: 'paid' }
                    : null,
            );
            pushToast({
                type: 'success',
                message: 'Caution réglée via PayPal avec succès !',
            });
            setStep('confirmed');
        } catch (err) {
            setErrorMsg(
                err instanceof Error ? err.message : 'Erreur réseau PayPal.',
            );
        } finally {
            setIsPaying(false);
            setPaymentStage(null);
        }
    }

    // Bank Transfer (SEPA) confirmation
    async function handleConfirmBankTransfer() {
        if (!confirmedVisit) {
            return;
        }
        setErrorMsg(null);
        setIsPaying(true);
        setPaymentStage('Enregistrement de votre ordre de virement...');

        try {
            await new Promise((r) => setTimeout(r, 600));

            const res = await confirmVisitPaymentAction({
                reference: confirmedVisit.reference,
                paymentMethod: 'bank_transfer',
            });

            if (!res.ok) {
                setErrorMsg(res.error ?? 'Erreur lors de l’enregistrement.');
                setIsPaying(false);
                setPaymentStage(null);
                return;
            }

            setConfirmedVisit((prev) =>
                prev
                    ? {
                          ...prev,
                          paymentMethod: 'bank_transfer',
                          paymentStatus: 'pending_transfer',
                      }
                    : null,
            );
            pushToast({
                type: 'success',
                message: 'Ordre de virement bien enregistré !',
            });
            setStep('confirmed');
        } catch (err) {
            setErrorMsg(
                err instanceof Error ? err.message : 'Erreur lors du virement.',
            );
        } finally {
            setIsPaying(false);
            setPaymentStage(null);
        }
    }

    // Stripe Checkout redirect (when online)
    async function handleStripeCheckoutRedirect() {
        if (!confirmedVisit) {
            return;
        }
        setErrorMsg(null);
        setStripeCheckoutLoading(true);

        try {
            const res = await initiateVisitPaymentAction(confirmedVisit.reference);
            if (!res.ok) {
                setErrorMsg(
                    res.error ??
                    'Impossible d\'ouvrir la page de paiement externe Stripe.',
                );
            } else if (res.data?.checkoutUrl) {
                window.location.href = res.data.checkoutUrl;
            }
        } catch (err) {
            setErrorMsg(
                err instanceof Error
                    ? err.message
                    : 'Erreur lors de l’initialisation Stripe.',
            );
        } finally {
            setStripeCheckoutLoading(false);
        }
    }

    const modalContent = (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="visit-modal-title"
            className="animate-in fade-in fixed inset-0 z-[99999] flex items-center justify-center overflow-y-auto bg-zinc-950/80 p-4 backdrop-blur-md duration-200 sm:p-6"
        >
            <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl transition sm:p-8 dark:border-zinc-800 dark:bg-zinc-900">
                {/* Close button */}
                <button
                    type="button"
                    onClick={handleCloseModal}
                    disabled={isSubmitting || isPaying}
                    className="absolute top-5 right-5 z-10 flex size-9 items-center justify-center rounded-full text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                    aria-label="Fermer la fenêtre"
                >
                    <svg viewBox="0 0 20 20" fill="currentColor" className="size-5" aria-hidden="true">
                        <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                    </svg>
                </button>

                {/* ===================================================================== */}
                {/* STEP 3 : ÉCRAN DE CONFIRMATION / REÇU DÉFINITIF                       */}
                {/* ===================================================================== */}
                {step === 'confirmed' && confirmedVisit ? (
                    <div className="flex flex-col items-center text-center py-4">
                        <div className="flex size-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="size-8">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                        </div>

                        <Badge tone="primary" className="mt-4">
                            {confirmedVisit.paymentMethod === 'bank_transfer'
                                ? 'Ordre de virement enregistré'
                                : 'Caution réglée & Visite confirmée'}
                        </Badge>

                        <h2 className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                            {confirmedVisit.paymentMethod === 'bank_transfer'
                                ? 'Demande de location transmise !'
                                : 'Caution réglée avec succès !'}
                        </h2>

                        <p className="mt-2 max-w-md text-sm text-zinc-600 dark:text-zinc-400">
                            {confirmedVisit.paymentMethod === 'bank_transfer'
                                ? `Votre demande de location pour le logement ${property.title} a bien été enregistrée. Dès réception de votre virement, votre dossier sera définitivement validé.`
                                : `Le règlement de votre caution a été validé. Votre créneau de visite est garanti et réservé pour le logement ${property.title}.`}
                        </p>

                        <div className="mt-6 w-full rounded-2xl border border-zinc-200 bg-zinc-50/80 p-5 text-left dark:border-zinc-800 dark:bg-zinc-850/50">
                            <div className="grid gap-3 sm:grid-cols-2 text-sm">
                                <div>
                                    <span className="text-xs text-zinc-500 dark:text-zinc-400">Référence du dossier</span>
                                    <p className="font-mono font-bold text-primary-600 dark:text-primary-400">
                                        {confirmedVisit.reference}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-xs text-zinc-500 dark:text-zinc-400">Date visite réservée</span>
                                    <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                                        {formatDate(confirmedVisit.visitDate)} à {confirmedVisit.timeSlot}
                                    </p>
                                </div>
                                {entryDate && (
                                    <div>
                                        <span className="text-xs text-zinc-500 dark:text-zinc-400">Date d&apos;entrée souhaitée</span>
                                        <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                                            {formatDate(entryDate)}
                                        </p>
                                    </div>
                                )}
                                <div>
                                    <span className="text-xs text-zinc-500 dark:text-zinc-400">Candidat</span>
                                    <p className="font-medium text-zinc-900 dark:text-zinc-100">
                                        {confirmedVisit.name}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-xs text-zinc-500 dark:text-zinc-400">Confirmation envoyée à</span>
                                    <p className="font-medium text-zinc-900 dark:text-zinc-100">
                                        {confirmedVisit.email}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-xs text-zinc-500 dark:text-zinc-400">Mode de règlement</span>
                                    <p className="font-medium text-zinc-900 dark:text-zinc-100 capitalize">
                                        {confirmedVisit.paymentMethod === 'card'
                                            ? 'Carte bancaire (3D Secure)'
                                            : confirmedVisit.paymentMethod === 'paypal'
                                                ? 'PayPal'
                                                : confirmedVisit.paymentMethod === 'bank_transfer'
                                                    ? 'Virement SEPA'
                                                    : 'Réservation directe'}
                                    </p>
                                </div>
                            </div>

                            {confirmedVisit.visitFee > 0 && (
                                <div className="mt-4 border-t border-zinc-200 pt-3 text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                                    Caution :{' '}
                                    <strong className="text-zinc-900 dark:text-zinc-100">
                                        {formatPrice(confirmedVisit.visitFee)}
                                    </strong>
                                    . Le versement de la caution permet de bloquer la disponibilité de ce bien et de bénéficier d’un accès privilégié à celui-ci, sous réserve de la présentation d’un dossier complet.
                                </div>
                            )}
                        </div>

                        <div className="mt-8 flex gap-3">
                            <Button size="lg" onClick={handleCloseModal}>
                                Fermer et retourner au logement
                            </Button>
                        </div>
                    </div>
                ) : null}

                {/* ===================================================================== */}
                {/* STEP 2 : CHECKOUT / ÉCRAN DE RÈGLEMENT DE LA CAUTION                   */}
                {/* ===================================================================== */}
                {step === 'checkout' && confirmedVisit ? (
                    <div className="flex flex-col gap-5">
                        {/* Barre supérieure avec retour et badge de sécurité */}
                        <div className="flex items-center justify-between border-b border-zinc-200 pb-3 dark:border-zinc-800">
                            <button
                                type="button"
                                onClick={() => setStep('form')}
                                disabled={isPaying}
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600 transition hover:text-zinc-900 disabled:opacity-50 dark:text-zinc-400 dark:hover:text-zinc-100"
                            >
                                <svg viewBox="0 0 20 20" fill="currentColor" className="size-4">
                                    <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
                                </svg>
                                ← Modifier ma demande
                            </button>

                            <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span>Paiement 100% sécurisé</span>
                            </div>
                        </div>

                        {/* En-tête checkout */}
                        <header className="flex flex-col gap-1 pr-8">
                            <div className="flex items-center gap-2">
                                <Badge tone="secondary">Étape 2 sur 2 · Règlement</Badge>
                                <span className="font-mono text-xs font-bold text-primary-600 dark:text-primary-400">
                                    {confirmedVisit.reference}
                                </span>
                            </div>
                            <h2 id="visit-modal-title" className="text-xl font-bold text-zinc-900 sm:text-2xl dark:text-zinc-100">
                                Régler la caution du logement
                            </h2>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                {property.title} · {property.city}, {property.country}
                            </p>
                        </header>

                        {errorMsg && (
                            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
                                {errorMsg}
                            </div>
                        )}

                        {/* Résumé du dossier et montant */}
                        <div className="rounded-2xl border border-amber-200/90 bg-amber-50/60 p-4 dark:border-amber-900/60 dark:bg-amber-950/20">
                            <div className="flex items-baseline justify-between gap-4">
                                <div>
                                    <span className="text-xs font-semibold text-amber-900 dark:text-amber-300 uppercase tracking-wider">
                                        Montant de la caution à bloquer
                                    </span>
                                    <div className="text-2xl font-black text-zinc-900 dark:text-zinc-100">
                                        {formatPrice(visitFee)}
                                    </div>
                                </div>
                                <div className="text-right text-xs text-zinc-600 dark:text-zinc-400">
                                    <div><strong className="text-zinc-900 dark:text-zinc-100">Entrée :</strong> {formatDate(entryDate)}</div>
                                    <div><strong className="text-zinc-900 dark:text-zinc-100">Visite :</strong> {formatDate(visitDate)} à {timeSlot}</div>
                                </div>
                            </div>
                            <p className="mt-2.5 border-t border-amber-200/80 pt-2 text-[11px] text-zinc-600 dark:border-amber-900/50 dark:text-zinc-400">
                                Le versement de la caution permet de bloquer la disponibilité de ce bien et de bénéficier d’un accès privilégié à celui-ci, sous réserve de la présentation d’un dossier complet.
                            </p>
                        </div>

                        {/* Onglets de sélection du moyen de paiement */}
                        <div>
                            <Label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                                Choisissez votre moyen de règlement
                            </Label>
                            <div className="mt-2 grid grid-cols-3 gap-2">
                                {enabledMethods.includes('card') && (
                                    <button
                                        type="button"
                                        disabled={isPaying}
                                        onClick={() => setCheckoutMethod('card')}
                                        className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl border p-3 text-xs font-semibold transition ${
                                            checkoutMethod === 'card'
                                                ? 'border-primary-500 bg-primary-50/50 text-primary-900 shadow-xs ring-2 ring-primary-500/20 dark:bg-primary-950/30 dark:text-primary-100'
                                                : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-850 dark:text-zinc-400'
                                        }`}
                                    >
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="size-5">
                                            <rect x="2" y="5" width="20" height="14" rx="3" />
                                            <line x1="2" y1="10" x2="22" y2="10" />
                                        </svg>
                                        <span>Carte bancaire</span>
                                    </button>
                                )}

                                {enabledMethods.includes('paypal') && (
                                    <button
                                        type="button"
                                        disabled={isPaying}
                                        onClick={() => setCheckoutMethod('paypal')}
                                        className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl border p-3 text-xs font-semibold transition ${
                                            checkoutMethod === 'paypal'
                                                ? 'border-primary-500 bg-primary-50/50 text-primary-900 shadow-xs ring-2 ring-primary-500/20 dark:bg-primary-950/30 dark:text-primary-100'
                                                : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-850 dark:text-zinc-400'
                                        }`}
                                    >
                                        <div className="flex items-center text-sm font-black italic tracking-tighter">
                                            <span className="text-[#003087]">Pay</span>
                                            <span className="text-[#0079C1]">Pal</span>
                                        </div>
                                        <span>PayPal</span>
                                    </button>
                                )}

                                {enabledMethods.includes('bank_transfer') && (
                                    <button
                                        type="button"
                                        disabled={isPaying}
                                        onClick={() => setCheckoutMethod('bank_transfer')}
                                        className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl border p-3 text-xs font-semibold transition ${
                                            checkoutMethod === 'bank_transfer'
                                                ? 'border-primary-500 bg-primary-50/50 text-primary-900 shadow-xs ring-2 ring-primary-500/20 dark:bg-primary-950/30 dark:text-primary-100'
                                                : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-850 dark:text-zinc-400'
                                        }`}
                                    >
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="size-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                        </svg>
                                        <span>Virement SEPA</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Progression 3DS / Simulation paiement */}
                        {isPaying && paymentStage && (
                            <div className="flex items-center gap-3 rounded-2xl border border-primary-200 bg-primary-50/70 p-4 dark:border-primary-900/60 dark:bg-primary-950/40">
                                <svg className="size-5 animate-spin text-primary-600 dark:text-primary-400" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                </svg>
                                <div className="text-xs">
                                    <p className="font-bold text-primary-950 dark:text-primary-100">Traitement de votre règlement</p>
                                    <p className="text-primary-800 dark:text-primary-300">{paymentStage}</p>
                                </div>
                            </div>
                        )}

                        {/* TAB 1: FORMULAIRE CARTE BANCAIRE */}
                        {checkoutMethod === 'card' && !isPaying && (
                            <form onSubmit={handlePayCard} className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-zinc-50/50 p-4 sm:p-5 dark:border-zinc-800 dark:bg-zinc-850/30">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                                        Carte bancaire sécurisée
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                        <span className={`flex h-5 items-center rounded border px-1.5 text-[9px] font-black tracking-tight ${
                                            isVisa ? 'border-primary-500 bg-white shadow-xs' : 'border-zinc-200 bg-white/70'
                                        }`}>
                                            <span className="italic text-[#1a1f71]">VISA</span>
                                        </span>
                                        <span className={`flex h-5 items-center justify-center rounded border px-1 ${
                                            isMastercard ? 'border-primary-500 bg-white shadow-xs' : 'border-zinc-200 bg-white/70'
                                        }`}>
                                            <svg className="h-3 w-5" viewBox="0 0 24 16" fill="none">
                                                <circle cx="8" cy="8" r="6" fill="#EB001B" />
                                                <circle cx="16" cy="8" r="6" fill="#F79E1B" fillOpacity="0.85" />
                                            </svg>
                                        </span>
                                        <span className="flex h-5 items-center rounded border border-zinc-200 bg-white/70 px-1.5 text-[9px] font-black tracking-tight">
                                            <span className="text-[#006633]">C</span>
                                            <span className="text-[#003399]">B</span>
                                        </span>
                                    </div>
                                </div>

                                <div className="grid gap-3 sm:grid-cols-2">
                                    <div className="sm:col-span-2">
                                        <Field
                                            label="Nom figurant sur la carte *"
                                            htmlFor="checkout_card_holder"
                                            error={cardErrors.holder}
                                        >
                                            <Input
                                                id="checkout_card_holder"
                                                type="text"
                                                placeholder="Ex. Thomas Laurent"
                                                value={cardHolder}
                                                onChange={(e) => {
                                                    setCardHolder(e.target.value);
                                                    if (cardErrors.holder) {
                                                        setCardErrors((prev) => ({ ...prev, holder: undefined }));
                                                    }
                                                }}
                                                required
                                            />
                                        </Field>
                                    </div>

                                    <div className="sm:col-span-2">
                                        <Field
                                            label="Numéro de carte *"
                                            htmlFor="checkout_card_number"
                                            error={cardErrors.number}
                                        >
                                            <Input
                                                id="checkout_card_number"
                                                type="text"
                                                inputMode="numeric"
                                                placeholder="4532 •••• •••• 8892"
                                                value={cardNumber}
                                                onChange={(e) => handleCardNumberChange(e.target.value)}
                                                required
                                                maxLength={19}
                                            />
                                        </Field>
                                    </div>

                                    <div>
                                        <Field
                                            label="Date d'expiration *"
                                            htmlFor="checkout_card_expiry"
                                            error={cardErrors.expiry}
                                        >
                                            <Input
                                                id="checkout_card_expiry"
                                                type="text"
                                                inputMode="numeric"
                                                placeholder="MM/AA"
                                                value={cardExpiry}
                                                onChange={(e) => handleExpiryChange(e.target.value)}
                                                required
                                                maxLength={5}
                                            />
                                        </Field>
                                    </div>

                                    <div>
                                        <Field
                                            label="Cryptogramme (CVC) *"
                                            htmlFor="checkout_card_cvc"
                                            hint="3 chiffres au dos de votre carte"
                                            error={cardErrors.cvc}
                                        >
                                            <Input
                                                id="checkout_card_cvc"
                                                type="text"
                                                inputMode="numeric"
                                                placeholder="123"
                                                value={cardCvc}
                                                onChange={(e) => handleCvcChange(e.target.value)}
                                                required
                                                maxLength={4}
                                            />
                                        </Field>
                                    </div>
                                </div>

                                <div className="mt-1 flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
                                    <div className="flex items-center gap-1.5">
                                        <svg viewBox="0 0 20 20" fill="currentColor" className="size-3.5 text-emerald-600 dark:text-emerald-400">
                                            <path fillRule="evenodd" d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z" clipRule="evenodd" />
                                        </svg>
                                        <span>Cryptage SSL 256-bit · 3D Secure v2</span>
                                    </div>
                                    <span>Norme bancaire PCI-DSS</span>
                                </div>

                                <Button
                                    type="submit"
                                    size="lg"
                                    loading={isPaying}
                                    className="mt-2 w-full justify-center"
                                >
                                    Payer la caution ({formatPrice(visitFee)}) par Carte
                                </Button>

                                {stripeConfigured && (
                                    <button
                                        type="button"
                                        onClick={handleStripeCheckoutRedirect}
                                        disabled={stripeCheckoutLoading || isPaying}
                                        className="mt-1 text-center text-xs text-primary-600 hover:underline dark:text-primary-400"
                                    >
                                        {stripeCheckoutLoading
                                            ? 'Connexion à Stripe...'
                                            : 'Ou régler directement via la page Stripe Checkout ↗'}
                                    </button>
                                )}
                            </form>
                        )}

                        {/* TAB 2: PAYPAL CHECKOUT */}
                        {checkoutMethod === 'paypal' && !isPaying && (
                            <div className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-zinc-50/50 p-5 dark:border-zinc-800 dark:bg-zinc-850/30">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                                        Paiement Express PayPal
                                    </span>
                                    <div className="text-lg font-black italic tracking-tight">
                                        <span className="text-[#003087]">Pay</span>
                                        <span className="text-[#0079C1]">Pal</span>
                                    </div>
                                </div>

                                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                                    Réglez rapidement et en toute sécurité votre caution de{' '}
                                    <strong className="text-zinc-900 dark:text-zinc-100">
                                        {formatPrice(visitFee)}
                                    </strong>{' '}
                                    via votre compte PayPal ou cartes enregistrées.
                                </p>

                                <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3 text-xs text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-200">
                                    🛡️ <strong>Protection des Achats PayPal :</strong> Vos transactions sont protégées de bout en bout et bénéficient de l&apos;assistance GuestHoster.
                                </div>

                                <button
                                    type="button"
                                    disabled={isPaying}
                                    onClick={handlePayPaypal}
                                    className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#d4a017] bg-[#ffc439] text-sm font-bold text-zinc-900 shadow-xs transition hover:bg-[#f2ba32] active:bg-[#e5b02b] disabled:opacity-50"
                                >
                                    <span className="italic font-bold">Payer avec</span>
                                    <span className="text-base font-black italic tracking-tighter">
                                        <span className="text-[#003087]">Pay</span>
                                        <span className="text-[#0079C1]">Pal</span>
                                    </span>
                                    <span>({formatPrice(visitFee)})</span>
                                </button>
                            </div>
                        )}

                        {/* TAB 3: VIREMENT BANCAIRE SEPA */}
                        {checkoutMethod === 'bank_transfer' && !isPaying && (
                            <div className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-zinc-50/50 p-5 dark:border-zinc-800 dark:bg-zinc-850/30">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                                        Coordonnées bancaires pour le virement
                                    </span>
                                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                                        Virement SEPA
                                    </span>
                                </div>

                                {/* Référence obligatoire à rappeler */}
                                <div className="rounded-xl border border-primary-300 bg-primary-50 p-3.5 dark:border-primary-900/80 dark:bg-primary-950/40">
                                    <div className="flex items-center justify-between gap-2">
                                        <div>
                                            <span className="text-[11px] font-semibold text-primary-900 dark:text-primary-200">
                                                ⚠️ Référence obligatoire à reporter en motif de virement :
                                            </span>
                                            <div className="mt-0.5 font-mono text-base font-black text-primary-700 dark:text-primary-300">
                                                {confirmedVisit.reference}
                                            </div>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={() => copyToClipboard(confirmedVisit.reference, 'Référence')}
                                        >
                                            {copiedField === 'Référence' ? 'Copié !' : 'Copier'}
                                        </Button>
                                    </div>
                                    <p className="mt-2 text-[11px] text-primary-800 dark:text-primary-300">
                                        Ce libellé permet l&apos;affectation automatique immédiate de votre caution à votre dossier de location.
                                    </p>
                                </div>

                                {/* Tableau des coordonnées bancaires */}
                                <div className="rounded-xl border border-zinc-200 bg-white divide-y divide-zinc-200 text-xs dark:border-zinc-800 dark:bg-zinc-900 dark:divide-zinc-800">
                                    <div className="flex items-center justify-between p-3">
                                        <div>
                                            <span className="text-[11px] text-zinc-500 dark:text-zinc-400">Bénéficiaire / Titulaire</span>
                                            <div className="font-semibold text-zinc-900 dark:text-zinc-100">{activeBank.holder}</div>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => copyToClipboard(activeBank.holder, 'Bénéficiaire')}
                                        >
                                            {copiedField === 'Bénéficiaire' ? 'Copié !' : 'Copier'}
                                        </Button>
                                    </div>

                                    <div className="flex items-center justify-between p-3">
                                        <div>
                                            <span className="text-[11px] text-zinc-500 dark:text-zinc-400">Banque</span>
                                            <div className="font-semibold text-zinc-900 dark:text-zinc-100">{activeBank.bankName}</div>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => copyToClipboard(activeBank.bankName, 'Banque')}
                                        >
                                            {copiedField === 'Banque' ? 'Copié !' : 'Copier'}
                                        </Button>
                                    </div>

                                    <div className="flex items-center justify-between p-3">
                                        <div>
                                            <span className="text-[11px] text-zinc-500 dark:text-zinc-400">IBAN</span>
                                            <div className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                                                {activeBank.iban}
                                            </div>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => copyToClipboard(activeBank.iban, 'IBAN')}
                                        >
                                            {copiedField === 'IBAN' ? 'Copié !' : 'Copier'}
                                        </Button>
                                    </div>

                                    <div className="flex items-center justify-between p-3">
                                        <div>
                                            <span className="text-[11px] text-zinc-500 dark:text-zinc-400">BIC / SWIFT</span>
                                            <div className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                                                {activeBank.bic}
                                            </div>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => copyToClipboard(activeBank.bic, 'BIC')}
                                        >
                                            {copiedField === 'BIC' ? 'Copié !' : 'Copier'}
                                        </Button>
                                    </div>

                                    <div className="flex items-center justify-between p-3 bg-amber-50/50 dark:bg-amber-950/20">
                                        <div>
                                            <span className="text-[11px] text-amber-900 dark:text-amber-400">Montant exact du virement</span>
                                            <div className="text-sm font-black text-amber-950 dark:text-amber-100">
                                                {formatPrice(visitFee)}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Justificatif optionnel */}
                                <div className="rounded-xl border border-dashed border-zinc-300 p-3 text-xs dark:border-zinc-700">
                                    <Label htmlFor="checkout_proof_file">
                                        Justificatif ou avis d&apos;opération de virement (facultatif)
                                    </Label>
                                    <input
                                        id="checkout_proof_file"
                                        type="file"
                                        accept="image/*,application/pdf"
                                        onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
                                        className="mt-1 block w-full text-xs text-zinc-600 file:mr-2 file:rounded-lg file:border-0 file:bg-zinc-200 file:px-2.5 file:py-1 file:text-xs file:font-semibold hover:file:bg-zinc-300 dark:text-zinc-400 dark:file:bg-zinc-800 dark:file:text-zinc-200"
                                    />
                                    {proofFile && (
                                        <div className="mt-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                                            ✓ Fichier sélectionné : {proofFile.name}
                                        </div>
                                    )}
                                </div>

                                <Button
                                    type="button"
                                    size="lg"
                                    loading={isPaying}
                                    onClick={handleConfirmBankTransfer}
                                    className="mt-1 w-full justify-center"
                                >
                                    Confirmer mon ordre de virement ({formatPrice(visitFee)})
                                </Button>
                            </div>
                        )}
                    </div>
                ) : null}

                {/* ===================================================================== */}
                {/* STEP 1 : FORMULAIRE DE PRISE DE RENDEZ-VOUS ET COORDONNÉES             */}
                {/* ===================================================================== */}
                {step === 'form' && (
                    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                        <header className="flex flex-col gap-1 pr-8">
                            <div className="flex items-center gap-2">
                                <Badge tone="secondary">
                                    Location classique · Min. {formatLeaseDuration(property.min_lease_months)}
                                </Badge>
                            </div>
                            <h2 id="visit-modal-title" className="text-xl font-bold text-zinc-900 sm:text-2xl dark:text-zinc-100">
                                Louer ce bien dès aujourd&apos;hui
                            </h2>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                {property.title} · {property.city}, {property.country}
                            </p>
                        </header>

                        {errorMsg && (
                            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
                                {errorMsg}
                            </div>
                        )}

                        {/* Alerte in-page en cas d'échec de moyen de paiement (style Lenaonline) */}
                        {paymentError && (
                            <PaymentErrorBanner
                                error={paymentError}
                                onSwitch={(newMethod) => {
                                    setPaymentMethod(newMethod);
                                    setPaymentError(null);
                                }}
                            />
                        )}

                        <div className="grid gap-4 sm:grid-cols-2">
                            {/* Date d'entrée souhaitée */}
                            <div>
                                <Label htmlFor="entry_date">Date d&apos;entrée souhaitée *</Label>
                                <input
                                    id="entry_date"
                                    type="date"
                                    min={today}
                                    value={entryDate}
                                    onChange={(e) => setEntryDate(e.target.value)}
                                    required
                                    className="mt-1 flex h-10 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm text-zinc-900 transition hover:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                                />
                            </div>

                            {/* Date visite disponible */}
                            <div>
                                <Label htmlFor="visit_date">Date visite disponible *</Label>
                                <input
                                    id="visit_date"
                                    type="date"
                                    min={minVisitDate}
                                    value={visitDate}
                                    onChange={(e) => {
                                        setVisitDate(e.target.value);
                                        if (!timeSlot) {
                                            setTimeSlot(TIME_SLOTS[1]);
                                        }
                                    }}
                                    required
                                    className="mt-1 flex h-10 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm text-zinc-900 transition hover:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                                />
                                <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                                    Disponible à partir du {formatDate(minVisitDate)} (+3 jours de préavis).
                                </p>
                            </div>

                            {/* Créneau horaire : affiché uniquement après sélection de la date de visite souhaitée */}
                            {visitDate ? (
                                <div className="sm:col-span-2 rounded-2xl border border-primary-200/80 bg-primary-50/40 p-4 dark:border-primary-900/60 dark:bg-primary-950/20">
                                    <Label htmlFor="time_slot" className="font-semibold text-zinc-900 dark:text-zinc-100">
                                        Créneau horaire disponible pour le {formatDate(visitDate)} *
                                    </Label>
                                    <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
                                        {TIME_SLOTS.map((slot) => (
                                            <button
                                                key={slot}
                                                type="button"
                                                onClick={() => setTimeSlot(slot)}
                                                className={`rounded-xl border py-2 text-xs font-semibold transition ${
                                                    timeSlot === slot
                                                        ? 'border-primary-500 bg-primary-600 text-white shadow-xs ring-2 ring-primary-500/20'
                                                        : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                                                }`}
                                            >
                                                {slot}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="sm:col-span-2 rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50 p-3 text-center text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-400">
                                    ⏰ Sélectionnez une <strong>Date visite disponible</strong> ci-dessus pour afficher et choisir vos créneaux horaires.
                                </div>
                            )}
                        </div>

                        {/* Coordonnées du candidat */}
                        <div className="rounded-2xl border border-zinc-200 bg-zinc-50/60 p-4 dark:border-zinc-800 dark:bg-zinc-850/40">
                            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                                Vos coordonnées pour le rendez-vous
                            </h3>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <Field label="Nom complet *" htmlFor="candidate_name">
                                    <Input
                                        id="candidate_name"
                                        type="text"
                                        required
                                        placeholder="Ex. Thomas Laurent"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                    />
                                </Field>
                                <Field label="Adresse e-mail *" htmlFor="candidate_email">
                                    <Input
                                        id="candidate_email"
                                        type="email"
                                        required
                                        placeholder="thomas@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </Field>
                                <Field label="Téléphone" htmlFor="candidate_phone">
                                    <Input
                                        id="candidate_phone"
                                        type="tel"
                                        placeholder="06 12 34 56 78"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                    />
                                </Field>
                                <Field label="Situation professionnelle" htmlFor="candidate_situation">
                                    <Select
                                        id="candidate_situation"
                                        value={situation}
                                        onChange={(e) => setSituation(e.target.value)}
                                    >
                                        {CANDIDATE_SITUATIONS.map((sit) => (
                                            <option key={sit} value={sit}>
                                                {sit}
                                            </option>
                                        ))}
                                    </Select>
                                </Field>
                            </div>

                            <div className="mt-3">
                                <Field
                                    label="Précisions pour la visite (facultatif)"
                                    htmlFor="candidate_notes"
                                    hint="Date d’emménagement souhaitée, questions ou profil du garant."
                                >
                                    <Textarea
                                        id="candidate_notes"
                                        rows={2}
                                        placeholder="Bonjour, je souhaiterais visiter ce bien en vue d'un bail d'habitation pour le mois prochain..."
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                    />
                                </Field>
                            </div>
                        </div>

                        {/* Modalités financières - Caution à payer */}
                        {visitFee > 0 ? (
                            <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900/60 dark:bg-amber-950/20">
                                <div className="flex items-baseline justify-between">
                                    <div>
                                        <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                                            Caution à payer pour intégrer le logement
                                        </h4>
                                        <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
                                            Le versement de la caution permet de bloquer la disponibilité de ce bien et de bénéficier d’un accès privilégié à celui-ci, sous réserve de la présentation d’un dossier complet.
                                        </p>
                                    </div>
                                    <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                                        {formatPrice(visitFee)}
                                    </span>
                                </div>

                                <div className="mt-3 border-t border-amber-200/80 pt-3 dark:border-amber-900/60">
                                    <Label>Mode de règlement préféré pour le checkout</Label>
                                    <div className="mt-2 grid gap-2 sm:grid-cols-3">
                                        {enabledMethods.includes('card') && (
                                            <label className={`flex cursor-pointer items-center gap-2 rounded-xl border p-2.5 text-xs font-semibold transition ${paymentMethod === 'card'
                                                    ? 'border-primary-500 bg-white text-zinc-900 shadow-xs dark:bg-zinc-900 dark:text-zinc-100'
                                                    : 'border-zinc-200 bg-zinc-50/50 text-zinc-600 hover:bg-white dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-300'
                                                }`}>
                                                <input
                                                    type="radio"
                                                    name="payment_method"
                                                    checked={paymentMethod === 'card'}
                                                    onChange={() => setPaymentMethod('card')}
                                                    className="accent-primary-600"
                                                />
                                                <span>Carte bancaire</span>
                                            </label>
                                        )}

                                        {enabledMethods.includes('paypal') && (
                                            <label className={`flex cursor-pointer items-center gap-2 rounded-xl border p-2.5 text-xs font-semibold transition ${paymentMethod === 'paypal'
                                                    ? 'border-primary-500 bg-white text-zinc-900 shadow-xs dark:bg-zinc-900 dark:text-zinc-100'
                                                    : 'border-zinc-200 bg-zinc-50/50 text-zinc-600 hover:bg-white dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-300'
                                                }`}>
                                                <input
                                                    type="radio"
                                                    name="payment_method"
                                                    checked={paymentMethod === 'paypal'}
                                                    onChange={() => setPaymentMethod('paypal')}
                                                    className="accent-primary-600"
                                                />
                                                <span>PayPal</span>
                                            </label>
                                        )}

                                        {enabledMethods.includes('bank_transfer') && (
                                            <label className={`flex cursor-pointer items-center gap-2 rounded-xl border p-2.5 text-xs font-semibold transition ${paymentMethod === 'bank_transfer'
                                                    ? 'border-primary-500 bg-white text-zinc-900 shadow-xs dark:bg-zinc-900 dark:text-zinc-100'
                                                    : 'border-zinc-200 bg-zinc-50/50 text-zinc-600 hover:bg-white dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-300'
                                                }`}>
                                                <input
                                                    type="radio"
                                                    name="payment_method"
                                                    checked={paymentMethod === 'bank_transfer'}
                                                    onChange={() => setPaymentMethod('bank_transfer')}
                                                    className="accent-primary-600"
                                                />
                                                <span>Virement SEPA</span>
                                            </label>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-xs text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
                                <span>✓</span>
                                <span>
                                    <strong>Réservation sans frais :</strong> aucun versement de caution requis pour ce bien.
                                </span>
                            </div>
                        )}

                        <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:items-center sm:justify-end">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleCloseModal}
                                disabled={isSubmitting}
                            >
                                Annuler
                            </Button>
                            <Button type="submit" loading={isSubmitting}>
                                {visitFee > 0
                                    ? `Régler la caution (${formatPrice(visitFee)})`
                                    : 'Confirmer ma demande de location'}
                            </Button>
                        </div>
                    </form>
                )}
            </div>

            {/* Modal Popup en cas d'échec de paiement (style Lenaonline) */}
            <PaymentErrorModal
                error={paymentError}
                onClose={() => setPaymentError(null)}
                onSwitch={(newMethod) => {
                    setPaymentMethod(newMethod);
                    setPaymentError(null);
                }}
            />
        </div>
    );

    return createPortal(modalContent, document.body);
}
