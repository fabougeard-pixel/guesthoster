'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/button';
import { Badge } from '@/components/card';
import { Field, Input, Label, Select, Textarea } from '@/components/form';
import {
    createPropertyVisitAction,
    type VisitBookingResult,
} from '@/lib/actions/visits';
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

const emptySubscribe = () => () => {};

export function VisitBookingModal({
    property,
    isOpen,
    onClose,
}: {
    property: PropertyDetail;
    isOpen: boolean;
    onClose: () => void;
}) {
    const isClient = useSyncExternalStore(
        emptySubscribe,
        () => true,
        () => false,
    );

    const today = todayIso();
    const [visitDate, setVisitDate] = useState<string>('');
    const [timeSlot, setTimeSlot] = useState<string>(TIME_SLOTS[1]);
    const [name, setName] = useState<string>('');
    const [email, setEmail] = useState<string>('');
    const [phone, setPhone] = useState<string>('');
    const [situation, setSituation] = useState<string>(CANDIDATE_SITUATIONS[0]);
    const [notes, setNotes] = useState<string>('');
    const [paymentMethod, setPaymentMethod] = useState<'card' | 'paypal' | 'bank_transfer'>('card');
    const [simulatedFailure, setSimulatedFailure] = useState<string | null>(null);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [confirmedVisit, setConfirmedVisit] = useState<VisitBookingResult | null>(null);

    // Lock body scroll while modal is open & listen for Escape
    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape' && !isSubmitting) {
                onClose();
            }
        }

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            document.body.style.overflow = prevOverflow;
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, isSubmitting, onClose]);

    if (!isOpen || !isClient) {
        return null;
    }

    const visitFee = property.visit_fee ?? 0;

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setErrorMsg(null);
        setSimulatedFailure(null);

        if (!visitDate) {
            setErrorMsg('Veuillez sélectionner une date de visite.');
            return;
        }

        if (!timeSlot) {
            setErrorMsg('Veuillez choisir un horaire de visite.');
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

        // Test check for payment failure simulation if user triggers PayPal edge case or requested modal
        if (visitFee > 0 && paymentMethod === 'paypal' && notes.toLowerCase().includes('fail')) {
            setSimulatedFailure(
                'L’option PayPal sélectionnée n’a pu aboutir suite à un refus temporaire du service. Nous vous recommandons de finaliser la validation par Carte bancaire en toute sécurité.',
            );
            return;
        }

        setIsSubmitting(true);

        try {
            const res = await createPropertyVisitAction({
                propertySlug: property.slug,
                visitDate,
                timeSlot,
                name,
                email,
                phone: phone.trim() || undefined,
                situation,
                notes: notes.trim() || undefined,
                paymentMethod: visitFee > 0 ? paymentMethod : undefined,
            });

            if (!res.ok) {
                setErrorMsg(
                    res.error ??
                        'Une erreur est survenue lors de la réservation.',
                );
            } else if (res.data) {
                setConfirmedVisit(res.data);
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

    const modalContent = (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="visit-modal-title"
            className="animate-in fade-in fixed inset-0 z-[99999] flex items-center justify-center overflow-y-auto bg-zinc-950/80 p-4 backdrop-blur-md duration-200 sm:p-6"
        >
            <div className="relative w-full max-w-2xl rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl transition sm:p-8 dark:border-zinc-800 dark:bg-zinc-900">
                {/* Close button */}
                <button
                    type="button"
                    onClick={onClose}
                    disabled={isSubmitting}
                    className="absolute top-5 right-5 flex size-9 items-center justify-center rounded-full text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                    aria-label="Fermer la fenêtre de prise de rendez-vous"
                >
                    <svg viewBox="0 0 20 20" fill="currentColor" className="size-5" aria-hidden="true">
                        <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                    </svg>
                </button>

                {confirmedVisit ? (
                    /* Écran de confirmation de visite */
                    <div className="flex flex-col items-center text-center py-4">
                        <div className="flex size-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="size-8">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                        </div>

                        <Badge tone="primary" className="mt-4">
                            Visite confirmée
                        </Badge>

                        <h2 className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                            Rendez-vous de visite enregistré !
                        </h2>

                        <p className="mt-2 max-w-md text-sm text-zinc-600 dark:text-zinc-400">
                            Votre demande de visite a bien été validée pour le logement{' '}
                            <strong className="text-zinc-900 dark:text-zinc-100">{property.title}</strong>.
                        </p>

                        <div className="mt-6 w-full rounded-2xl border border-zinc-200 bg-zinc-50/80 p-5 text-left dark:border-zinc-800 dark:bg-zinc-850/50">
                            <div className="grid gap-3 sm:grid-cols-2 text-sm">
                                <div>
                                    <span className="text-xs text-zinc-500 dark:text-zinc-400">Référence du rendez-vous</span>
                                    <p className="font-mono font-bold text-primary-600 dark:text-primary-400">
                                        {confirmedVisit.reference}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-xs text-zinc-500 dark:text-zinc-400">Date & créneau</span>
                                    <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                                        {formatDate(confirmedVisit.visitDate)} à {confirmedVisit.timeSlot}
                                    </p>
                                </div>
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
                            </div>

                            {confirmedVisit.visitFee > 0 && (
                                <div className="mt-4 border-t border-zinc-200 pt-3 text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                                    Forfait de validation réglé :{' '}
                                    <strong className="text-zinc-900 dark:text-zinc-100">
                                        {formatPrice(confirmedVisit.visitFee)}
                                    </strong>
                                    . Ce montant garantit votre créneau exclusif et sera déduit à la signature du bail.
                                </div>
                            )}
                        </div>

                        <div className="mt-8 flex gap-3">
                            <Button size="lg" onClick={onClose}>
                                Fermer et retourner au logement
                            </Button>
                        </div>
                    </div>
                ) : (
                    /* Formulaire de réservation de visite */
                    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                        <header className="flex flex-col gap-1 pr-8">
                            <div className="flex items-center gap-2">
                                <Badge tone="secondary">Location standard · Bail 1 an</Badge>
                                {visitFee > 0 ? (
                                    <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                                        Forfait validation : {formatPrice(visitFee)}
                                    </span>
                                ) : (
                                    <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                                        Visite sans frais
                                    </span>
                                )}
                            </div>
                            <h2 id="visit-modal-title" className="text-xl font-bold text-zinc-900 sm:text-2xl dark:text-zinc-100">
                                Prendre rendez-vous pour visiter ce bien
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

                        {/* Modale d'alerte en cas d'échec de paiement avec suggestion de l'option viable */}
                        {simulatedFailure && (
                            <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 text-xs dark:border-amber-700 dark:bg-amber-950/50">
                                <div className="flex items-start gap-3">
                                    <span className="text-lg">⚠️</span>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-amber-900 dark:text-amber-200">
                                            L’option de paiement sélectionnée n’a pu aboutir
                                        </h4>
                                        <p className="mt-1 text-amber-800 dark:text-amber-300">
                                            {simulatedFailure}
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setPaymentMethod('card');
                                                setSimulatedFailure(null);
                                            }}
                                            className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 font-semibold text-white transition hover:bg-amber-700"
                                        >
                                            Basculer sur Carte Bancaire (viable)
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="grid gap-4 sm:grid-cols-2">
                            {/* Date de la visite */}
                            <div>
                                <Label htmlFor="visit_date">Date de visite souhaitée *</Label>
                                <input
                                    id="visit_date"
                                    type="date"
                                    min={today}
                                    value={visitDate}
                                    onChange={(e) => setVisitDate(e.target.value)}
                                    required
                                    className="mt-1 flex h-10 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm text-zinc-900 transition hover:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                                />
                            </div>

                            {/* Créneau horaire */}
                            <div>
                                <Label htmlFor="time_slot">Créneau horaire disponible *</Label>
                                <div className="mt-1 grid grid-cols-3 gap-1.5">
                                    {TIME_SLOTS.map((slot) => (
                                        <button
                                            key={slot}
                                            type="button"
                                            onClick={() => setTimeSlot(slot)}
                                            className={`rounded-lg border px-2 py-1.5 text-xs font-semibold transition ${
                                                timeSlot === slot
                                                    ? 'border-primary-500 bg-primary-50 text-primary-700 ring-2 ring-primary-500/20 dark:border-primary-400 dark:bg-primary-950/60 dark:text-primary-300'
                                                    : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                                            }`}
                                        >
                                            {slot}
                                        </button>
                                    ))}
                                </div>
                            </div>
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
                                        placeholder="Bonjour, je souhaiterais visiter ce bien en vue d'un bail d'habitation standard pour le mois prochain..."
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                    />
                                </Field>
                            </div>
                        </div>

                        {/* Modalités financières du rendez-vous */}
                        {visitFee > 0 ? (
                            <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900/60 dark:bg-amber-950/20">
                                <div className="flex items-baseline justify-between">
                                    <div>
                                        <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                                            Forfait de validation du créneau de visite
                                        </h4>
                                        <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
                                            Ce montant bloque votre créneau avec l’hôte et vous garantit la disponibilité du créneau.
                                        </p>
                                    </div>
                                    <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                                        {formatPrice(visitFee)}
                                    </span>
                                </div>

                                <div className="mt-3 border-t border-amber-200/80 pt-3 dark:border-amber-900/60">
                                    <Label>Mode de règlement du forfait</Label>
                                    <div className="mt-2 grid gap-2 sm:grid-cols-3">
                                        <label className={`flex cursor-pointer items-center gap-2 rounded-xl border p-2.5 text-xs font-semibold transition ${
                                            paymentMethod === 'card'
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

                                        <label className={`flex cursor-pointer items-center gap-2 rounded-xl border p-2.5 text-xs font-semibold transition ${
                                            paymentMethod === 'paypal'
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

                                        <label className={`flex cursor-pointer items-center gap-2 rounded-xl border p-2.5 text-xs font-semibold transition ${
                                            paymentMethod === 'bank_transfer'
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
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-xs text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
                                <span>✓</span>
                                <span>
                                    <strong>Visite gratuite :</strong> aucun règlement requis pour confirmer votre visite.
                                </span>
                            </div>
                        )}

                        <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:items-center sm:justify-end">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onClose}
                                disabled={isSubmitting}
                            >
                                Annuler
                            </Button>
                            <Button type="submit" loading={isSubmitting}>
                                {visitFee > 0
                                    ? `Valider le créneau (${formatPrice(visitFee)})`
                                    : 'Confirmer mon rendez-vous de visite'}
                            </Button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}
