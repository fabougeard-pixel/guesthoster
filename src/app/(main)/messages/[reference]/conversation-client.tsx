'use client';

import Link from 'next/link';
import type { FormEvent, KeyboardEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/button';
import { Container } from '@/components/card';
import { InputError } from '@/components/form';
import { useActionFeedback } from '@/components/use-action-feedback';
import { sendMessageAction } from '@/lib/actions/bookings';
import type { FieldErrors } from '@/lib/actions/types';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

type ChatMessage = {
    id: number;
    body: string;
    sender_id: number;
    created_at: string | null;
    read_at: string | null;
};

type ConversationInfo = {
    reference: string;
    property_title: string;
    check_in: string;
    check_out: string;
    status_label: string;
    counterpart: string;
};

function formatMessageTime(iso: string | null): string {
    return iso
        ? new Intl.DateTimeFormat('fr-FR', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
          }).format(new Date(iso))
        : '';
}

export function ConversationClient({
    conversation,
    messages,
    currentUserId,
}: {
    conversation: ConversationInfo;
    messages: ChatMessage[];
    currentUserId: number;
}) {
    const { applyResult, router } = useActionFeedback();
    const endRef = useRef<HTMLDivElement>(null);
    const [body, setBody] = useState('');
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<FieldErrors>({});

    const lastOwn = [...messages]
        .reverse()
        .find((message) => message.sender_id === currentUserId);

    useEffect(() => {
        endRef.current?.scrollIntoView({ block: 'end' });
    }, [messages.length]);

    useEffect(() => {
        const id = window.setInterval(() => {
            router.refresh();
        }, 10000);
        return () => window.clearInterval(id);
    }, [router]);

    async function submitMessage(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!body.trim()) {
            return;
        }
        setLoading(true);
        setErrors({});
        try {
            const res = await sendMessageAction({
                reference: conversation.reference,
                body,
            });
            applyResult(res, {
                setFieldErrors: setErrors,
                onSuccess: () => setBody(''),
            });
        } finally {
            setLoading(false);
        }
    }

    function submitOnEnter(event: KeyboardEvent<HTMLTextAreaElement>) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            event.currentTarget.form?.requestSubmit();
        }
    }

    return (
        <Container className="flex max-w-3xl flex-col gap-4 py-8">
            <div className="flex items-center gap-4 border-b border-zinc-200 pb-4 dark:border-zinc-800">
                <Link
                    href="/messages"
                    className="text-sm font-medium text-zinc-600 hover:underline dark:text-zinc-400"
                >
                    ← Messages
                </Link>
                <div className="min-w-0 flex-1">
                    <h1 className="truncate text-lg font-semibold">
                        {conversation.counterpart}
                    </h1>
                    <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">
                        <Link
                            href={`/reservations/${conversation.reference}`}
                            className="hover:underline"
                        >
                            {conversation.property_title}
                        </Link>{' '}
                        · {formatDate(conversation.check_in)} →{' '}
                        {formatDate(conversation.check_out)} ·{' '}
                        {conversation.status_label}
                    </p>
                </div>
            </div>

            <ol
                className="flex min-h-64 flex-col gap-3"
                aria-live="polite"
                aria-label="Conversation"
            >
                {messages.length === 0 && (
                    <li className="py-12 text-center text-sm text-zinc-500 dark:text-zinc-400">
                        Démarrez la conversation avec {conversation.counterpart}
                        .
                    </li>
                )}
                {messages.map((message) => {
                    const mine = message.sender_id === currentUserId;

                    return (
                        <li
                            key={message.id}
                            className={cn(
                                'flex flex-col gap-1',
                                mine ? 'items-end' : 'items-start',
                            )}
                        >
                            <p
                                className={cn(
                                    'max-w-[80%] rounded-2xl px-4 py-2 whitespace-pre-line',
                                    mine
                                        ? 'rounded-br-sm bg-primary-600 text-white'
                                        : 'rounded-bl-sm bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100',
                                )}
                            >
                                <span className="sr-only">
                                    {mine
                                        ? 'Vous : '
                                        : `${conversation.counterpart} : `}
                                </span>
                                {message.body}
                            </p>
                            <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                {formatMessageTime(message.created_at)}
                                {mine &&
                                    message.id === lastOwn?.id &&
                                    message.read_at &&
                                    ' · Lu'}
                            </span>
                        </li>
                    );
                })}
            </ol>
            <div ref={endRef} />

            <form
                onSubmit={(event) => void submitMessage(event)}
                className="sticky bottom-0 flex flex-col gap-2 border-t border-zinc-200 bg-white pt-4 pb-4 dark:border-zinc-800 dark:bg-zinc-950"
            >
                <label htmlFor="body" className="sr-only">
                    Votre message
                </label>
                <div className="flex items-end gap-2">
                    <textarea
                        id="body"
                        name="body"
                        rows={2}
                        maxLength={2000}
                        required
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        onKeyDown={submitOnEnter}
                        placeholder={`Écrire à ${conversation.counterpart}…`}
                        className="block w-full resize-none rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
                    />
                    <Button type="submit" loading={loading}>
                        Envoyer
                    </Button>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Entrée pour envoyer, Maj + Entrée pour aller à la ligne.
                </p>
                <InputError message={errors.body} />
            </form>
        </Container>
    );
}

