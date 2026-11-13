'use client';

import Link from 'next/link';
import type { FormEvent, KeyboardEvent } from 'react';
import { useEffect, useRef, useState, useTransition } from 'react';
import { Button } from '@/components/button';
import { Badge, Card } from '@/components/card';
import {
    closeInquiryAndSendRecapAction,
    sendInquiryMessageAction,
} from '@/lib/actions/inquiries';
import type { InquiryMessage, PropertyInquiryDetail } from '@/types';

function formatMessageTime(iso: string | null) {
    if (!iso) {
        return '';
    }
    return new Intl.DateTimeFormat('fr-FR', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(iso));
}

export function AdminInquiryClient({
    inquiry: initialInquiry,
}: {
    inquiry: PropertyInquiryDetail;
}) {
    const [inquiry, setInquiry] = useState(initialInquiry);
    const [messages, setMessages] = useState<InquiryMessage[]>(initialInquiry.messages);
    const [body, setBody] = useState('');
    const [sending, setSending] = useState(false);
    const [isClosing, startClosing] = useTransition();
    const endRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages.length]);

    async function handleSendMessage(e?: FormEvent) {
        if (e) {
            e.preventDefault();
        }
        if (!body.trim() || sending || inquiry.status === 'closed') {
            return;
        }

        const textToSend = body.trim();
        setSending(true);
        setBody('');

        const res = await sendInquiryMessageAction({
            reference: inquiry.reference,
            body: textToSend,
        });

        setSending(false);
        const data = res.ok ? res.data : undefined;
        if (data?.message) {
            setMessages((prev) => [...prev, data.message]);
        } else {
            alert(!res.ok && res.error ? res.error : 'Erreur lors de l’envoi du message.');
            setBody(textToSend);
        }
    }

    function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            void handleSendMessage();
        }
    }

    function handleCloseSession() {
        if (inquiry.status === 'closed') {
            return;
        }
        if (
            !confirm(
                `Confirmez-vous la clôture de cette session ? Un email récapitulatif complet de tous les échanges sera immédiatement envoyé à l'adresse du propriétaire (${inquiry.host_email ?? 'du compte'}).`,
            )
        ) {
            return;
        }

        startClosing(async () => {
            const res = await closeInquiryAndSendRecapAction(inquiry.reference);
            if (res.ok) {
                setInquiry((prev) => ({
                    ...prev,
                    status: 'closed',
                    closed_at: new Date().toISOString(),
                    recap_sent_at: new Date().toISOString(),
                }));
                alert(
                    res.toast?.message ??
                        `Session clôturée et email récapitulatif envoyé à ${inquiry.host_email}.`,
                );
            } else {
                alert(res.error ?? 'Erreur lors de la clôture.');
            }
        });
    }

    return (
        <div className="space-y-6">
            {/* Barre supérieure avec retour et statut */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Link
                        href="/admin/messages"
                        className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                        ← Retour aux messages
                    </Link>
                    <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                        {inquiry.property_title}
                    </h1>
                    {inquiry.status === 'open' ? (
                        <Badge tone="success">Session active</Badge>
                    ) : (
                        <Badge tone="neutral">Session clôturée</Badge>
                    )}
                </div>

                {inquiry.status === 'open' && (
                    <Button
                        variant="danger"
                        size="sm"
                        loading={isClosing}
                        onClick={handleCloseSession}
                        className="flex items-center gap-2"
                    >
                        <svg viewBox="0 0 20 20" fill="currentColor" className="size-4" aria-hidden="true">
                            <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                        </svg>
                        Terminer la session & envoyer le récapitulatif
                    </Button>
                )}
            </div>

            {/* Fiche d'information conciergerie */}
            <Card className="border-primary-200 bg-primary-50/50 p-4 dark:border-primary-900/50 dark:bg-primary-950/20">
                <div className="flex flex-col gap-2 text-xs text-primary-900 dark:text-primary-200">
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
                        <span>
                            <strong>Voyageur :</strong> {inquiry.guest_name} ({inquiry.guest_email})
                        </span>
                        <span>
                            <strong>Propriétaire du bien :</strong> {inquiry.host_name} ({inquiry.host_email})
                        </span>
                        <span>
                            <strong>Logement :</strong>{' '}
                            <Link
                                href={`/logements/${inquiry.property_slug}`}
                                target="_blank"
                                className="underline hover:text-primary-700"
                            >
                                Voir la fiche en ligne ↗
                            </Link>
                        </span>
                    </div>
                    <p className="mt-1 text-[11px] text-primary-700 dark:text-primary-300">
                        ℹ️ <strong>Règle Conciergerie :</strong> Lorsque vous répondez en tant qu’administrateur, votre message s’affiche au voyageur sous le nom de l’hôte (« <strong>{inquiry.host_name}</strong> »). À la fin de la session, le récapitulatif complet de tous les échanges est automatiquement envoyé à l’adresse e-mail du propriétaire ({inquiry.host_email}).
                    </p>
                </div>
            </Card>

            {/* Statut de récapitulatif si déjà clôturé */}
            {inquiry.status === 'closed' && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 text-xs text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200">
                    ✓ Cette session est clôturée. Le récapitulatif complet des échanges a été transmis au propriétaire ({inquiry.host_email}).
                </div>
            )}

            {/* Zone de discussion */}
            <Card className="flex flex-col overflow-hidden">
                <div className="flex-1 space-y-4 p-5 min-h-[350px] max-h-[550px] overflow-y-auto">
                    {messages.length === 0 ? (
                        <p className="text-center text-xs text-zinc-500 py-12">
                            Aucun message dans cette session pour l’instant.
                        </p>
                    ) : (
                        messages.map((msg) => {
                            const isAdminOrHost = msg.sender_role === 'admin' || msg.sender_role === 'host';
                            return (
                                <div
                                    key={msg.id}
                                    className={`flex flex-col ${isAdminOrHost ? 'items-end' : 'items-start'}`}
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                                            {msg.sender_name}
                                        </span>
                                        {msg.sender_role === 'admin' && (
                                            <span className="rounded-md bg-primary-100 px-1.5 py-0.5 text-[10px] font-semibold text-primary-700 dark:bg-primary-900/60 dark:text-primary-300">
                                                Réponse Conciergerie (vue par le client comme {inquiry.host_name})
                                            </span>
                                        )}
                                    </div>
                                    <div
                                        className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed shadow-2xs ${
                                            isAdminOrHost
                                                ? 'bg-primary-600 text-white rounded-br-xs'
                                                : 'bg-zinc-100 text-zinc-900 rounded-bl-xs dark:bg-zinc-800 dark:text-zinc-100'
                                        }`}
                                    >
                                        {msg.body}
                                    </div>
                                    <span className="mt-1 text-[10px] text-zinc-400">
                                        {formatMessageTime(msg.created_at)}
                                    </span>
                                </div>
                            );
                        })
                    )}
                    <div ref={endRef} />
                </div>

                {/* Formulaire de réponse pour l'Admin */}
                {inquiry.status === 'open' ? (
                    <div className="border-t border-zinc-200 p-4 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-850">
                        <form onSubmit={handleSendMessage} className="flex flex-col gap-3">
                            <textarea
                                value={body}
                                onChange={(e) => setBody(e.target.value)}
                                onKeyDown={handleKeyDown}
                                rows={3}
                                placeholder={`Répondre au voyageur (${inquiry.guest_name}) en tant que ${inquiry.host_name}… (Entrée pour envoyer)`}
                                className="w-full resize-none rounded-xl border border-zinc-300 p-3 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-primary-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                            />
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                                    Maj + Entrée pour un saut de ligne
                                </span>
                                <Button
                                    type="submit"
                                    size="sm"
                                    loading={sending}
                                    disabled={!body.trim()}
                                >
                                    Envoyer la réponse
                                </Button>
                            </div>
                        </form>
                    </div>
                ) : (
                    <div className="border-t border-zinc-200 p-3 text-center text-xs text-zinc-500 dark:border-zinc-800">
                        Cette session est clôturée. Les nouveaux messages sont désactivés.
                    </div>
                )}
            </Card>
        </div>
    );
}

