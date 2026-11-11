import { Form, Head, Link } from '@inertiajs/react';
import { useState } from 'react';
import {
    applyFilters,
    FilterBar,
    StatusTabs,
} from '@/components/admin/filters';
import { Button, buttonClasses } from '@/components/button';
import { Badge, Card } from '@/components/card';
import { Field, Textarea } from '@/components/form';
import { Modal } from '@/components/modal';
import { Pagination } from '@/components/pagination';
import { PropertyStatusBadge } from '@/components/status-badge';
import { formatDateTime, formatPrice, plural } from '@/lib/format';
import { index, publish, reject } from '@/routes/admin/properties';
import { show } from '@/routes/properties';
import type { AdminProperty, CountedOption, Paginated } from '@/types';

type Props = {
    properties: Paginated<AdminProperty>;
    status: string;
    search: string | null;
    statuses: CountedOption[];
};

function RejectModal({
    property,
    onClose,
}: {
    property: AdminProperty | null;
    onClose: () => void;
}) {
    const isTakedown = property?.status === 'published';

    return (
        <Modal
            open={property !== null}
            onClose={onClose}
            title={isTakedown ? 'Retirer du catalogue' : 'Refuser le logement'}
        >
            {property && (
                <Form
                    {...reject.form(property.slug)}
                    options={{ preserveScroll: true }}
                    onSuccess={onClose}
                    className="flex flex-col gap-4"
                >
                    {({ errors, processing }) => (
                        <>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                {isTakedown
                                    ? `« ${property.title} » ne sera plus visible ni réservable. Les séjours déjà confirmés sont maintenus.`
                                    : `« ${property.title} » repassera en correction chez son hôte.`}{' '}
                                Le motif lui est envoyé par e-mail et affiché
                                dans son espace.
                            </p>
                            <Field
                                label="Motif"
                                htmlFor="reason"
                                error={errors.reason}
                                hint="Soyez précis : ce qui doit être corrigé avant un nouvel envoi."
                            >
                                <Textarea
                                    id="reason"
                                    name="reason"
                                    rows={4}
                                    required
                                    minLength={10}
                                    maxLength={1000}
                                />
                            </Field>
                            <div className="flex justify-end gap-2">
                                <Button variant="ghost" onClick={onClose}>
                                    Annuler
                                </Button>
                                <Button
                                    type="submit"
                                    variant="danger"
                                    loading={processing}
                                >
                                    {isTakedown ? 'Retirer' : 'Refuser'}
                                </Button>
                            </div>
                        </>
                    )}
                </Form>
            )}
        </Modal>
    );
}

export default function AdminProperties({
    properties,
    status,
    search,
    statuses,
}: Props) {
    const [rejecting, setRejecting] = useState<AdminProperty | null>(null);
    const filter = (query: Record<string, unknown>) =>
        applyFilters(index.url(), { statut: status, q: search, ...query });

    return (
        <>
            <Head title="Modération des logements" />
            <h1 className="text-2xl font-semibold">Logements</h1>

            <StatusTabs
                tabs={statuses}
                current={status}
                onChange={(value) => filter({ statut: value, q: null })}
            />
            <FilterBar
                key={status}
                search={search}
                placeholder="Titre, ville, hôte…"
                onSearch={(q) => filter({ q })}
                className="mt-4"
            />

            {properties.data.length === 0 ? (
                <Card className="mt-6 px-6 py-16 text-center text-sm text-zinc-500 dark:text-zinc-400">
                    {status === 'pending' && !search
                        ? 'Aucun logement en attente de validation.'
                        : 'Aucun logement ne correspond.'}
                </Card>
            ) : (
                <ul className="mt-6 flex flex-col gap-4">
                    {properties.data.map((property) => (
                        <li key={property.id}>
                            <Card className="flex flex-col gap-4 p-4 md:flex-row">
                                <div className="aspect-4/3 w-full shrink-0 overflow-hidden rounded-xl bg-zinc-100 md:w-44 dark:bg-zinc-800">
                                    {property.cover_url && (
                                        <img
                                            src={property.cover_url}
                                            alt=""
                                            className="size-full object-cover"
                                        />
                                    )}
                                </div>
                                <div className="flex min-w-0 flex-1 flex-col gap-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h2 className="font-medium">
                                            {property.title}
                                        </h2>
                                        <PropertyStatusBadge
                                            status={property.status}
                                            label={property.status_label}
                                        />
                                        {property.host.suspended && (
                                            <Badge tone="danger">
                                                Hôte suspendu
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-sm text-zinc-600 dark:text-zinc-300">
                                        {property.type} ·{' '}
                                        {property.city ??
                                            'Ville non renseignée'}{' '}
                                        ·{' '}
                                        {formatPrice(property.price_per_night)}{' '}
                                        / nuit ·{' '}
                                        {plural(property.photos, 'photo')} ·{' '}
                                        {property.booking_mode}
                                    </p>
                                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                        {property.host.name} (
                                        {property.host.email})
                                        {property.submitted_at &&
                                            ` · envoyé le ${formatDateTime(property.submitted_at)}`}
                                    </p>
                                    {property.rejection_reason && (
                                        <p className="mt-1 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
                                            Motif : {property.rejection_reason}
                                        </p>
                                    )}
                                </div>
                                <div className="flex shrink-0 flex-wrap items-start gap-2 md:flex-col md:items-stretch">
                                    <Link
                                        href={show(property.slug)}
                                        className={buttonClasses({
                                            variant: 'outline',
                                            size: 'sm',
                                        })}
                                    >
                                        Aperçu
                                    </Link>
                                    {property.status === 'pending' && (
                                        <Link
                                            href={publish(property.slug)}
                                            as="button"
                                            preserveScroll
                                            className={buttonClasses({
                                                size: 'sm',
                                            })}
                                        >
                                            Publier
                                        </Link>
                                    )}
                                    {(property.status === 'pending' ||
                                        property.status === 'published') && (
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() =>
                                                setRejecting(property)
                                            }
                                        >
                                            {property.status === 'published'
                                                ? 'Retirer'
                                                : 'Refuser'}
                                        </Button>
                                    )}
                                </div>
                            </Card>
                        </li>
                    ))}
                </ul>
            )}

            <Pagination paginator={properties} noun="logement" />
            <RejectModal
                property={rejecting}
                onClose={() => setRejecting(null)}
            />
        </>
    );
}
