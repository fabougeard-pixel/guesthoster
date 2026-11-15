'use client';

import Link from 'next/link';
import type { FormEvent, KeyboardEvent } from 'react';
import { useEffect, useRef, useState, useTransition } from 'react';
import { Button } from '@/components/button';
import { Badge, Card } from '@/components/card';
import {
    SUPPORT_CATEGORY_ICONS,
    type SupportCategory,
} from '@/lib/domain/enums';
import {
    sendSupportTicketMessageAction,
    updateSupportTicketStatusAction,
} from '@/lib/actions/support';
import type { SupportTicketDetail, SupportTicketMessage } from '@/types';

function formatMessageTime(iso: string | null) {
    if (!iso) return '';
    return new Intl.DateTimeFormat('fr-FR', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(iso));
}

export function AdminSupportTicketClient({
    ticket: initialTicket,
}: {
    ticket: SupportTicketDetail;
}) {
    const [ticket, setTicket] = useState(initialTicket);
    const [messages, setMessages] = useState<SupportTicketMessage[]>(initialTicket.messages);
    const [body, setBody] = useState('');
    const [sending, setSending] = useState(false);
    const [isUpdatingStatus, startUpdatingStatus] = useTransition();
    const endRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages.length]);

    async function handleSendMessage(e?: FormEvent) {
        if (e) e.preventDefault();
        if (!body.trim() || sending || ticket.status === 'closed') return;

        const text = body.trim();
        setSending(true);
        setBody('');

        const res = await sendSupportTicketMessageAction({
            reference: ticket.reference,
            body: text,
        });

        setSending(false);
        const data = res.ok ? res.data : undefined;
        if (data?.message) {
            setMessages((prev) => [...prev, data.message]);
            if (ticket.status === 'open') {
                setTicket((prev) => ({ ...prev, status: 'in_progress' }));
            }
        } else {
            alert(!res.ok && res.error ? res.error : 'Erreur lors de l’envoi.');
            setBody(text);
        }
    }

    function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            void handleSendMessage();
        }
    }

    function handleStatusChange(nextStatus: 'open' | 'in_progress' | 'resolved' | 'closed') {
        startUpdatingStatus(async () => {
            const res = await updateSupportTicketStatusAction({
                reference: ticket.reference,
                status: nextStatus,
            });
            if (res.ok) {
                setTicket((prev) => ({
                    ...prev,
                    status: nextStatus,
                    resolved_at: nextStatus === 'resolved' || nextStatus === 'closed' ? new Date().toISOString() : null,
                }));
            } else {
                alert(res.error || 'Erreur lors du changement de statut.');
            }
        });
    }

    const catIcon = SUPPORT_CATEGORY_ICONS[ticket.category as SupportCategory] || '📁';

    return (
        <div className="space-y-6">
            {/* Barre de navigation & Statut */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Link
                        href="/admin/messages?tab=support"
                        className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                        ← Retour aux tickets support
                    </Link>
                    <div className="flex items-center gap-2">
                        <span className="text-xl">{catIcon}</span>
                        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                            Support : {ticket.category}
                        </h1>
                    </div>
                    {ticket.status === 'open' && <Badge tone="warning">Nouveau / En attente</Badge>}
                    {ticket.status === 'in_progress' && <Badge tone="primary">En cours de traitement</Badge>}
                    {ticket.status === 'resolved' && <Badge tone="success">Résolu</Badge>}
                    {ticket.status === 'closed' && <Badge tone="neutral">Clôturé</Badge>}
                </div>

                <div className="flex items-center gap-2">
                    {ticket.status !== 'resolved' && (
                        <Button
                            variant="outline"
                            size="sm"
                            loading={isUpdatingStatus}
                            onClick={() => handleStatusChange('resolved')}
                            className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-300"
                        >
                            ✓ Marquer comme résolu
                        </Button>
                    )}
                    {ticket.status !== 'closed' && (
                        <Button
                            variant="ghost"
                            size="sm"
                            loading={isUpdatingStatus}
                            onClick={() => handleStatusChange('closed')}
                            className="text-zinc-500 hover:text-zinc-800"
                        >
                            Clôturer
                        </Button>
                    )}
                    {ticket.status === 'closed' && (
                        <Button
                            variant="outline"
                            size="sm"
                            loading={isUpdatingStatus}
                            onClick={() => handleStatusChange('in_progress')}
                        >
                            Rouvrir le ticket
                        </Button>
                    )}
                </div>
            </div>

            {/* Fiche d'identification du client */}
            <Card className="border-primary-200 bg-primary-50/50 p-4 dark:border-primary-900/50 dark:bg-primary-950/20">
                <div className="flex flex-col gap-2 text-xs text-primary-950 dark:text-primary-200">
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
                        <span>
                            <strong>Demandeur :</strong> {ticket.name}
                        </span>
                        <span>
                            <strong>E-mail :</strong>{' '}
                            <a href={`mailto:${ticket.email}`} className="underline hover:text-primary-700">
                                {ticket.email}
                            </a>
                        </span>
                        {ticket.phone && (
                            <span>
                                <strong>Téléphone :</strong>{' '}
                                <a href={`tel:${ticket.phone}`} className="underline hover:text-primary-700">
                                    {ticket.phone}
                                </a>
                            </span>
                        )}
                        <span>
                            <strong>Catégorie :</strong> {ticket.category}
                        </span>
                        <span>
                            <strong>Réf :</strong> <code className="font-mono font-bold">{ticket.reference}</code>
                        </span>
                    </div>
                    <p className="mt-1 text-[11px] text-primary-800 dark:text-primary-300">
                        🛡️ <strong>Support Officiel :</strong> En répondant à cette demande, votre message s’affichera en temps réel dans le widget du visiteur avec la signature officielle « <strong>Guest Hoster (Support Client)</strong> » et le logo du site.
                    </p>
                </div>
            </Card>

            {/* Zone de discussion */}
            <Card className="flex flex-col overflow-hidden">
                <div className="flex-1 space-y-4 p-5 min-h-[350px] max-h-[550px] overflow-y-auto">
                    {messages.map((m) => {
                        const isAdmin = m.sender_role === 'admin';
                        return (
                            <div
                                key={m.id}
                                className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}
                            >
                                <div className="mb-1 flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                                    {isAdmin ? (
                                        <>
                                            <span className="font-semibold text-primary-700 dark:text-primary-400">
                                                Vous (Guest Hoster Support)
                                            </span>
                                            <img
                                                src="/images/logos/logo-icon.svg"
                                                alt="Guest Hoster"
                                                className="size-3.5 object-contain"
                                            />
                                        </>
                                    ) : (
                                        <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                                            {m.sender_name} ({ticket.email})
                                        </span>
                                    )}
                                    <span>·</span>
                                    <span>{formatMessageTime(m.created_at)}</span>
                                </div>
                                <div
                                    className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-xs ${
                                        isAdmin
                                            ? 'bg-primary-600 text-white rounded-br-xs'
                                            : 'bg-zinc-100 text-zinc-900 rounded-bl-xs border border-zinc-200/80 dark:bg-zinc-800 dark:text-zinc-100 dark:border-zinc-700'
                                    }`}
                                >
                                    {m.body}
                                </div>
                            </div>
                        );
                    })}
                    <div ref={endRef} />
                </div>

                {/* Saisie de réponse Admin */}
                {ticket.status !== 'closed' ? (
                    <footer className="border-t border-zinc-200 p-4 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900">
                        <form onSubmit={handleSendMessage} className="space-y-3">
                            <textarea
                                value={body}
                                onChange={(e) => setBody(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Répondre au demandeur en tant que Support Guest Hoster... (Entrée pour envoyer)"
                                rows={3}
                                className="w-full resize-none rounded-xl border border-zinc-300 p-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-primary-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                            />
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-zinc-400">
                                    Maj + Entrée pour saut de ligne
                                </span>
                                <Button
                                    type="submit"
                                    loading={sending}
                                    disabled={!body.trim()}
                                    className="bg-primary-600 hover:bg-primary-700"
                                >
                                    Envoyer la réponse Support
                                </Button>
                            </div>
                        </form>
                    </footer>
                ) : (
                    <footer className="border-t border-zinc-200 p-4 text-center text-xs text-zinc-500 dark:border-zinc-800">
                        Ce ticket de support est clôturé. Rouvrez-le pour envoyer un nouveau message.
                    </footer>
                )}
            </Card>
        </div>
    );
}
