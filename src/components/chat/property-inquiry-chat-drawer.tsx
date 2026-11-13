'use client';

import Link from 'next/link';
import type { FormEvent, KeyboardEvent } from 'react';
import { useEffect, useRef, useState, useTransition } from 'react';
import { Button } from '@/components/button';
import { Badge } from '@/components/card';
import {
    closeInquiryAndSendRecapAction,
    getOrCreateInquiryAction,
    sendInquiryMessageAction,
} from '@/lib/actions/inquiries';
import type { InquiryMessage, PropertyInquiryDetail } from '@/types';

function formatTime(iso: string | null) {
    if (!iso) {
        return '';
    }
    return new Intl.DateTimeFormat('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(iso));
}

export function PropertyInquiryChatDrawer({
    open,
    onClose,
    propertySlug,
    propertyTitle,
    hostName,
    isViewerAuthenticated,
}: {
    open: boolean;
    onClose: () => void;
    propertySlug: string;
    propertyTitle: string;
    hostName: string;
    isViewerAuthenticated: boolean;
}) {
    const [inquiry, setInquiry] = useState<PropertyInquiryDetail | null>(null);
    const [messages, setMessages] = useState<InquiryMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [body, setBody] = useState('');
    const [sending, setSending] = useState(false);
    const [isClosing, startClosing] = useTransition();
    const endRef = useRef<HTMLDivElement>(null);

    // Initial load
    useEffect(() => {
        if (!open || !isViewerAuthenticated) {
            return;
        }

        let isMounted = true;

        void getOrCreateInquiryAction(propertySlug).then((res) => {
            if (!isMounted) {
                return;
            }
            setLoading(false);
            if (res.ok && res.data) {
                setInquiry(res.data.inquiry);
                setMessages(res.data.inquiry.messages);
            } else {
                setError(!res.ok && res.error ? res.error : 'Impossible d’ouvrir le chat.');
            }
        });

        return () => {
            isMounted = false;
        };
    }, [open, isViewerAuthenticated, propertySlug]);

    // Polling while open to catch live responses
    useEffect(() => {
        if (!open || !isViewerAuthenticated || !inquiry || inquiry.status === 'closed') {
            return;
        }

        const interval = window.setInterval(() => {
            getOrCreateInquiryAction(propertySlug).then((res) => {
                if (res.ok && res.data) {
                    setInquiry(res.data.inquiry);
                    setMessages(res.data.inquiry.messages);
                }
            });
        }, 5000);

        return () => window.clearInterval(interval);
    }, [open, isViewerAuthenticated, propertySlug, inquiry?.status, inquiry]);

    // Scroll to bottom on new message
    useEffect(() => {
        if (open) {
            endRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages.length, open]);

    async function handleSendMessage(e?: FormEvent) {
        if (e) {
            e.preventDefault();
        }
        if (!inquiry || !body.trim() || sending) {
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
            setError(!res.ok && res.error ? res.error : 'Erreur lors de l’envoi du message.');
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
        if (!inquiry) {
            return;
        }
        if (!confirm('Clôturer cette session de chat ? Un email récapitulatif sera envoyé au propriétaire si le bien est en gestion.')) {
            return;
        }

        startClosing(async () => {
            const res = await closeInquiryAndSendRecapAction(inquiry.reference);
            if (res.ok) {
                setInquiry((prev) => (prev ? { ...prev, status: 'closed', recap_sent_at: new Date().toISOString() } : null));
            } else {
                alert(res.error ?? 'Impossible de clôturer la session.');
            }
        });
    }

    if (!open) {
        return null;
    }

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="chat-title"
            className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
        >
            <div className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl dark:bg-zinc-900 animate-in slide-in-from-right duration-250">
                {/* En-tête du Chat */}
                <header className="flex items-center justify-between border-b border-zinc-200 p-4 dark:border-zinc-800">
                    <div className="flex items-center gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-100 font-bold text-primary-700 dark:bg-primary-950 dark:text-primary-300">
                            {hostName.slice(0, 1).toUpperCase()}
                        </div>
                        <div>
                            <h2 id="chat-title" className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                {hostName}
                            </h2>
                            <p className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                                <span className="size-2 rounded-full bg-emerald-500" />
                                Chat en direct avec l’hôte
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Fermer le chat"
                        className="flex size-8 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                    >
                        ✕
                    </button>
                </header>

                {/* Bannière du logement concerné */}
                <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50/70 px-4 py-2 text-xs text-zinc-600 dark:border-zinc-800/60 dark:bg-zinc-800/40 dark:text-zinc-400">
                    <span className="truncate max-w-[260px] font-medium text-zinc-800 dark:text-zinc-200">
                        Logement : {propertyTitle}
                    </span>
                    {inquiry && inquiry.status === 'open' && (
                        <Badge tone="success" className="text-[10px] px-1.5 py-0.5">
                            En cours
                        </Badge>
                    )}
                </div>

                {/* Corps des messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
                    {!isViewerAuthenticated ? (
                        <div className="my-auto flex flex-col items-center justify-center gap-3 py-16 text-center">
                            <div className="flex size-12 items-center justify-center rounded-full bg-primary-50 text-primary-600 dark:bg-primary-950/60 dark:text-primary-400">
                                <svg viewBox="0 0 20 20" fill="currentColor" className="size-6" aria-hidden="true">
                                    <path fillRule="evenodd" d="M10 2c-2.236 0-4.43.18-6.57.524C1.993 2.755 1 4.014 1 5.426v5.148c0 1.413.993 2.67 2.43 2.902.848.137 1.705.248 2.57.331v3.443a.75.75 0 0 0 1.28.53l3.58-3.579a.78.78 0 0 1 .527-.224 41.202 41.202 0 0 0 5.183-.5c1.437-.232 2.43-1.49 2.43-2.903V5.426c0-1.413-.993-2.67-2.43-2.902A41.289 41.289 0 0 0 10 2Z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                                Connectez-vous pour échanger
                            </h3>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xs">
                                Vous pourrez poser toutes vos questions en direct à l’hôte avant ou pendant votre séjour.
                            </p>
                            <Link
                                href={`/login?return_to=${encodeURIComponent(`/logements/${propertySlug}`)}`}
                                className="mt-2 inline-flex items-center justify-center rounded-xl bg-primary-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-primary-700"
                            >
                                Se connecter / S’inscrire
                            </Link>
                        </div>
                    ) : loading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-xs text-zinc-500">
                            <div className="size-6 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
                            <p className="mt-2">Ouverture du chat…</p>
                        </div>
                    ) : error ? (
                        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                            {error}
                        </div>
                    ) : (
                        <>
                            {messages.length === 0 ? (
                                <div className="rounded-xl border border-dashed border-zinc-200 p-6 text-center text-xs text-zinc-500 dark:border-zinc-800">
                                    <p className="font-medium text-zinc-700 dark:text-zinc-300">
                                        Commencez la discussion avec {hostName}
                                    </p>
                                    <p className="mt-1 text-zinc-400">
                                        Demandez des détails sur les équipements, l’arrivée ou la disponibilité.
                                    </p>
                                </div>
                            ) : (
                                messages.map((msg) => {
                                    const isMine = msg.sender_role === 'guest';
                                    return (
                                        <div
                                            key={msg.id}
                                            className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                                        >
                                            <span className="mb-1 text-[11px] font-medium text-zinc-400">
                                                {msg.sender_name}
                                            </span>
                                            <div
                                                className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed shadow-2xs ${
                                                    isMine
                                                        ? 'bg-primary-600 text-white rounded-br-xs'
                                                        : 'bg-zinc-100 text-zinc-900 rounded-bl-xs dark:bg-zinc-800 dark:text-zinc-100'
                                                }`}
                                            >
                                                {msg.body}
                                            </div>
                                            <span className="mt-1 text-[10px] text-zinc-400">
                                                {formatTime(msg.created_at)}
                                            </span>
                                        </div>
                                    );
                                })
                            )}
                            <div ref={endRef} />
                        </>
                    )}
                </div>

                {/* Clôture & information récapitulatif email */}
                {inquiry && inquiry.status === 'closed' && (
                    <div className="border-t border-zinc-200 bg-zinc-50 p-3 text-center text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/40">
                        <p className="font-medium text-zinc-700 dark:text-zinc-300">
                            Cette session de chat est terminée.
                        </p>
                        {inquiry.is_managed_by_admin && inquiry.host_email && (
                            <p className="mt-0.5 text-[11px] text-emerald-600 dark:text-emerald-400">
                                ✓ Le récapitulatif complet des échanges a été transmis à l’adresse {inquiry.host_email}.
                            </p>
                        )}
                    </div>
                )}

                {/* Zone de saisie */}
                {isViewerAuthenticated && (!inquiry || inquiry.status === 'open') && (
                    <footer className="border-t border-zinc-200 p-3 dark:border-zinc-800">
                        <form onSubmit={handleSendMessage} className="flex flex-col gap-2">
                            <textarea
                                value={body}
                                onChange={(e) => setBody(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={`Écrire à ${hostName}… (Entrée pour envoyer)`}
                                rows={2}
                                className="w-full resize-none rounded-xl border border-zinc-300 p-2.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-primary-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                            />
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] text-zinc-400">
                                    Maj + Entrée pour saut de ligne
                                </span>
                                <div className="flex items-center gap-2">
                                    {inquiry && (inquiry.is_managed_by_admin || inquiry.host_id) && (
                                        <button
                                            type="button"
                                            onClick={handleCloseSession}
                                            disabled={isClosing}
                                            title="Clôturer et envoyer le récapitulatif par email"
                                            className="text-[11px] text-zinc-400 underline hover:text-zinc-600 dark:hover:text-zinc-200"
                                        >
                                            {isClosing ? 'Clôture…' : 'Terminer la session'}
                                        </button>
                                    )}
                                    <Button
                                        type="submit"
                                        size="sm"
                                        loading={sending}
                                        disabled={!body.trim()}
                                        className="h-8 px-3 text-xs"
                                    >
                                        Envoyer
                                    </Button>
                                </div>
                            </div>
                        </form>
                    </footer>
                )}
            </div>
        </div>
    );
}

