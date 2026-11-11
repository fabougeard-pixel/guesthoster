import { Stars } from '@/components/star-rating';
import type { Review } from '@/types';

function formatMonth(iso: string): string {
    return new Intl.DateTimeFormat('fr-FR', {
        month: 'long',
        year: 'numeric',
    }).format(new Date(iso));
}

export function ReviewCard({
    review,
    hostName,
}: {
    review: Review;
    hostName?: string;
}) {
    return (
        <article className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
                <span
                    className="flex size-9 items-center justify-center rounded-full bg-secondary-100 text-sm font-semibold text-secondary-800 dark:bg-secondary-950 dark:text-secondary-300"
                    aria-hidden="true"
                >
                    {review.author.charAt(0).toUpperCase()}
                </span>
                <div>
                    <p className="font-medium">{review.author}</p>
                    {review.created_at && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            {formatMonth(review.created_at)}
                        </p>
                    )}
                </div>
            </div>
            <Stars rating={review.rating} />
            <p className="text-sm whitespace-pre-line text-zinc-700 dark:text-zinc-300">
                {review.comment}
            </p>
            {review.host_reply && (
                <div className="mt-1 rounded-xl bg-zinc-50 p-3 text-sm dark:bg-zinc-900">
                    <p className="font-medium">
                        Réponse {hostName ? `de ${hostName}` : 'de l’hôte'}
                    </p>
                    <p className="mt-1 whitespace-pre-line text-zinc-600 dark:text-zinc-400">
                        {review.host_reply}
                    </p>
                </div>
            )}
        </article>
    );
}

