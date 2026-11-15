'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useAppState } from '@/components/providers';
import {
    SUPPORT_CATEGORIES,
    SUPPORT_CATEGORY_DESCRIPTIONS,
    SUPPORT_CATEGORY_ICONS,
    type SupportCategory,
} from '@/lib/domain/enums';
import {
    createSupportTicketAction,
    getSupportTicketAction,
    sendSupportTicketMessageAction,
} from '@/lib/actions/support';
import type { SupportTicketDetail, SupportTicketMessage } from '@/types';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'guesthoster_active_support_ref';

function formatMessageTime(iso: string | null) {
    if (!iso) return '';
    return new Intl.DateTimeFormat('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(iso));
}

export function SiteSupportChatWidget() {
    const { user } = useAppState();
    const [isOpen, setIsOpen] = useState(false);
    const [activeRef, setActiveRef] = useState<string | null>(null);
    const [ticket, setTicket] = useState<SupportTicketDetail | null>(null);
    const [messages, setMessages] = useState<SupportTicketMessage[]>([]);
    const [loadingTicket, setLoadingTicket] = useState(false);

    // Form states for new ticket
    const [selectedCategory, setSelectedCategory] = useState<SupportCategory>("Demandes d'information");
    const [name, setName] = useState(user?.name ?? '');
    const [email, setEmail] = useState(user?.email ?? '');
    const [phone, setPhone] = useState('');
    const [initialMessage, setInitialMessage] = useState('');
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [isCreating, startCreating] = useTransition();

    // Message reply state
    const [replyText, setReplyText] = useState('');
    const [isSending, setIsSending] = useState(false);
    const endRef = useRef<HTMLDivElement>(null);

    // Synchroniser avec l'utilisateur connecté
    useEffect(() => {
        if (user) {
            if (!name) setName(user.name);
            if (!email) setEmail(user.email);
        }
    }, [user, name, email]);

    // Restaurer le ticket actif depuis le stockage local
    useEffect(() => {
        try {
            const saved = window.sessionStorage.getItem(STORAGE_KEY);
            if (saved) {
                setActiveRef(saved);
            }
        } catch {
            // Ignore storage access error
        }
    }, []);

    // Charger les messages du ticket actif
    useEffect(() => {
        if (!activeRef || !isOpen) return;

        let isMounted = true;
        setLoadingTicket(true);

        void getSupportTicketAction(activeRef).then((res) => {
            if (!isMounted) return;
            setLoadingTicket(false);
            if (res.ok && res.data) {
                setTicket(res.data.ticket);
                setMessages(res.data.ticket.messages);
            } else {
                // Invalide ou introuvable
                setActiveRef(null);
                try {
                    window.sessionStorage.removeItem(STORAGE_KEY);
                } catch {}
            }
        });

        // Polling toutes les 4 secondes pour voir les réponses de l'Admin en direct
        const interval = window.setInterval(() => {
            getSupportTicketAction(activeRef).then((res) => {
                if (res.ok && res.data) {
                    setTicket(res.data.ticket);
                    setMessages(res.data.ticket.messages);
                }
            });
        }, 4000);

        return () => {
            isMounted = false;
            window.clearInterval(interval);
        };
    }, [activeRef, isOpen]);

    // Défiler vers le bas à chaque nouveau message
    useEffect(() => {
        if (isOpen && activeRef) {
            endRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages.length, isOpen, activeRef]);

    function handleCreateTicket(e: React.FormEvent) {
        e.preventDefault();
        setFormErrors({});

        startCreating(async () => {
            const res = await createSupportTicketAction({
                name: name.trim() || user?.name || 'Visiteur',
                email: email.trim() || user?.email || '',
                phone: phone.trim() || undefined,
                category: selectedCategory,
                message: initialMessage.trim(),
            });

            const data = res.ok ? res.data : undefined;
            if (data?.ticket) {
                const newTicket = data.ticket;
                setTicket(newTicket);
                setMessages(newTicket.messages);
                setActiveRef(newTicket.reference);
                setInitialMessage('');
                try {
                    window.sessionStorage.setItem(STORAGE_KEY, newTicket.reference);
                } catch {}
            } else if (!res.ok) {
                if (res.fieldErrors) {
                    setFormErrors(res.fieldErrors);
                } else if (res.error) {
                    setFormErrors({ general: res.error });
                }
            }
        });
    }

    async function handleSendReply(e?: React.FormEvent) {
        if (e) e.preventDefault();
        if (!replyText.trim() || !activeRef || isSending) return;

        const text = replyText.trim();
        setIsSending(true);
        setReplyText('');

        try {
            const res = await sendSupportTicketMessageAction({
                reference: activeRef,
                body: text,
            });

            const data = res.ok ? res.data : undefined;
            if (data?.message) {
                setMessages((prev) => [...prev, data.message]);
            } else {
                alert(!res.ok && res.error ? res.error : 'Erreur lors de l’envoi.');
                setReplyText(text);
            }
        } finally {
            setIsSending(false);
        }
    }

    function handleNewRequest() {
        setActiveRef(null);
        setTicket(null);
        setMessages([]);
        setInitialMessage('');
        try {
            window.sessionStorage.removeItem(STORAGE_KEY);
        } catch {}
    }

    return (
        <>
            {/* Bouton Flottant Déclencheur en bas à droite */}
            <div className="fixed bottom-5 right-5 z-40 print:hidden">
                {!isOpen && (
                    <button
                        type="button"
                        onClick={() => setIsOpen(true)}
                        className="group flex items-center gap-2.5 rounded-full bg-gradient-to-r from-primary-600 to-primary-700 px-4 py-3 text-white shadow-xl ring-4 ring-primary-500/20 transition hover:scale-105 hover:from-primary-700 hover:to-primary-800 active:scale-95"
                        aria-label="Contacter le support client Guest Hoster"
                    >
                        <div className="relative flex size-7 shrink-0 items-center justify-center rounded-full bg-white/20">
                            {/* Logo Icon */}
                            <img
                                src="/images/logos/logo-icon.svg"
                                alt="Support"
                                className="size-4.5 object-contain"
                            />
                            <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-emerald-400 ring-2 ring-white" />
                        </div>
                        <div className="flex flex-col text-left">
                            <span className="text-xs font-bold leading-tight tracking-wide">
                                Support Client
                            </span>
                            <span className="text-[10px] text-primary-100 font-medium leading-tight">
                                Besoin d’aide ? Écrivez-nous
                            </span>
                        </div>
                    </button>
                )}
            </div>

            {/* Fenêtre / Drawer de Chat Support */}
            {isOpen && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="support-chat-title"
                    className="fixed bottom-4 right-4 z-50 flex h-[580px] w-full max-w-sm sm:max-w-md flex-col overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 animate-in slide-in-from-bottom-5 duration-200"
                >
                    {/* Header */}
                    <header className="flex items-center justify-between border-b border-zinc-100 bg-gradient-to-r from-primary-600 via-primary-700 to-purple-800 px-4 py-3.5 text-white">
                        <div className="flex items-center gap-3">
                            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white p-1 ring-2 ring-white/30 shadow-xs">
                                <img
                                    src="/images/logos/logo-icon.svg"
                                    alt="Guest Hoster"
                                    className="size-6 object-contain"
                                />
                            </div>
                            <div>
                                <h3 id="support-chat-title" className="text-sm font-bold flex items-center gap-1.5">
                                    <span>Guest Hoster</span>
                                    <span className="inline-flex items-center gap-0.5 rounded-full bg-white/20 px-1.5 py-0.2 text-[10px] font-medium backdrop-blur-xs">
                                        🛡️ Officiel
                                    </span>
                                </h3>
                                <p className="text-[11px] text-primary-100 flex items-center gap-1">
                                    <span className="size-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                                    Support Client · En direct
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-1">
                            {activeRef && (
                                <button
                                    type="button"
                                    onClick={handleNewRequest}
                                    title="Démarrer une nouvelle demande"
                                    className="rounded-lg p-1.5 text-xs text-white/80 hover:bg-white/10 hover:text-white transition"
                                >
                                    + Nouvelle
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                aria-label="Fermer le support"
                                className="flex size-7 items-center justify-center rounded-full text-white/80 hover:bg-white/20 hover:text-white transition"
                            >
                                ✕
                            </button>
                        </div>
                    </header>

                    {/* Contenu : Soit Formulaire de démarrage catégorisé, soit Discussion en direct */}
                    {!activeRef ? (
                        /* Vue 1 : Accueil & Catégorisation */
                        <form
                            onSubmit={handleCreateTicket}
                            className="flex-1 flex flex-col justify-between overflow-y-auto p-4 gap-4 text-xs"
                        >
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <h4 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">
                                        Comment pouvons-nous vous aider ?
                                    </h4>
                                    <p className="text-zinc-500 dark:text-zinc-400 text-[11px]">
                                        Sélectionnez la catégorie de votre demande pour être orienté vers le conseiller dédié :
                                    </p>
                                </div>

                                {/* Grille des 4 Catégories */}
                                <div className="grid grid-cols-2 gap-2">
                                    {SUPPORT_CATEGORIES.map((cat) => {
                                        const isSelected = selectedCategory === cat;
                                        return (
                                            <button
                                                type="button"
                                                key={cat}
                                                onClick={() => setSelectedCategory(cat)}
                                                className={cn(
                                                    'flex flex-col items-start p-2.5 rounded-2xl border text-left transition relative',
                                                    isSelected
                                                        ? 'border-primary-600 bg-primary-50/80 ring-2 ring-primary-500/20 text-primary-950 dark:bg-primary-950/40 dark:border-primary-500 dark:text-primary-100'
                                                        : 'border-zinc-200 bg-zinc-50/70 hover:bg-zinc-100/80 text-zinc-800 dark:border-zinc-800 dark:bg-zinc-800/40 dark:text-zinc-200 dark:hover:bg-zinc-800',
                                                )}
                                            >
                                                <div className="flex items-center gap-1.5 mb-1">
                                                    <span className="text-base">{SUPPORT_CATEGORY_ICONS[cat]}</span>
                                                    <span className="font-bold text-xs leading-tight">{cat}</span>
                                                </div>
                                                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-snug">
                                                    {SUPPORT_CATEGORY_DESCRIPTIONS[cat]}
                                                </span>
                                                {isSelected && (
                                                    <span className="absolute top-2 right-2 text-primary-600 dark:text-primary-400 text-xs font-bold">
                                                        ✓
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Coordonnées si non connecté */}
                                {!user && (
                                    <div className="space-y-2 pt-1 border-t border-zinc-100 dark:border-zinc-800">
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-0.5">
                                                    Nom & Prénom *
                                                </label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={name}
                                                    onChange={(e) => setName(e.target.value)}
                                                    placeholder="Votre nom"
                                                    className="w-full rounded-xl border border-zinc-200 px-2.5 py-1.5 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-0.5">
                                                    Adresse e-mail *
                                                </label>
                                                <input
                                                    type="email"
                                                    required
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                    placeholder="votre@email.com"
                                                    className="w-full rounded-xl border border-zinc-200 px-2.5 py-1.5 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Saisie du message */}
                                <div>
                                    <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                                        Votre message *
                                    </label>
                                    <textarea
                                        required
                                        rows={3}
                                        value={initialMessage}
                                        onChange={(e) => setInitialMessage(e.target.value)}
                                        placeholder={`Détaillez votre question concernant « ${selectedCategory} »...`}
                                        className="w-full resize-none rounded-2xl border border-zinc-200 p-2.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-primary-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                                    />
                                    {formErrors.message && (
                                        <p className="mt-1 text-[11px] text-red-600 dark:text-red-400">{formErrors.message}</p>
                                    )}
                                    {formErrors.general && (
                                        <p className="mt-1 text-[11px] text-red-600 dark:text-red-400">{formErrors.general}</p>
                                    )}
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isCreating || !initialMessage.trim()}
                                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-primary-600 px-4 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-primary-700 active:scale-98 disabled:opacity-60"
                            >
                                <span>💬</span>
                                <span>{isCreating ? 'Connexion au support…' : 'Démarrer la discussion'}</span>
                            </button>
                        </form>
                    ) : (
                        /* Vue 2 : Discussion active */
                        <div className="flex-1 flex flex-col justify-between overflow-hidden">
                            {/* Bannière de la catégorie sélectionnée */}
                            {ticket && (
                                <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50 px-3.5 py-1.5 text-[11px] text-zinc-600 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-300">
                                    <span className="flex items-center gap-1 font-semibold text-primary-800 dark:text-primary-300">
                                        <span>{SUPPORT_CATEGORY_ICONS[ticket.category as SupportCategory] || '📁'}</span>
                                        <span>{ticket.category}</span>
                                    </span>
                                    <span className="font-mono text-[10px] text-zinc-400">
                                        Réf: {ticket.reference}
                                    </span>
                                </div>
                            )}

                            {/* Liste des messages */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                {loadingTicket ? (
                                    <div className="flex flex-col items-center justify-center py-20 text-xs text-zinc-400">
                                        <div className="size-6 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
                                        <p className="mt-2">Chargement de vos échanges…</p>
                                    </div>
                                ) : (
                                    messages.map((m) => {
                                        const isUser = m.sender_role === 'user';
                                        return (
                                            <div
                                                key={m.id}
                                                className={cn('flex flex-col', isUser ? 'items-end' : 'items-start')}
                                            >
                                                <div className="mb-1 flex items-center gap-1 text-[10px] font-medium text-zinc-400">
                                                    {!isUser && (
                                                        <img
                                                            src="/images/logos/logo-icon.svg"
                                                            alt="Guest Hoster"
                                                            className="size-3 object-contain"
                                                        />
                                                    )}
                                                    <span>{isUser ? 'Vous' : 'Support Guest Hoster'}</span>
                                                </div>
                                                <div
                                                    className={cn(
                                                        'max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed shadow-2xs',
                                                        isUser
                                                            ? 'bg-primary-600 text-white rounded-br-xs'
                                                            : 'bg-zinc-100 text-zinc-900 rounded-bl-xs border border-zinc-200/80 dark:bg-zinc-800 dark:text-zinc-100 dark:border-zinc-700',
                                                    )}
                                                >
                                                    {m.body}
                                                </div>
                                                <span className="mt-1 text-[9px] text-zinc-400">
                                                    {formatMessageTime(m.created_at)}
                                                </span>
                                            </div>
                                        );
                                    })
                                )}
                                <div ref={endRef} />
                            </div>

                            {/* Zone de réponse */}
                            <footer className="border-t border-zinc-200 p-2.5 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                                <form onSubmit={handleSendReply} className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={replyText}
                                        onChange={(e) => setReplyText(e.target.value)}
                                        placeholder="Votre message..."
                                        className="flex-1 rounded-xl border border-zinc-200 px-3 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-primary-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                                    />
                                    <button
                                        type="submit"
                                        disabled={isSending || !replyText.trim()}
                                        className="inline-flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary-600 text-white shadow-xs transition hover:bg-primary-700 active:scale-95 disabled:opacity-50"
                                        aria-label="Envoyer"
                                    >
                                        ➤
                                    </button>
                                </form>
                            </footer>
                        </div>
                    )}
                </div>
            )}
        </>
    );
}
