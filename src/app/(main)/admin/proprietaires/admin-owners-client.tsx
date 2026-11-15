'use client';

import Link from 'next/link';
import type { FormEvent } from 'react';
import { useRef, useState, useTransition } from 'react';
import {
    DataTable,
    FilterBar,
    buildFilterUrl,
} from '@/components/admin/filters';
import { Button } from '@/components/button';
import { Badge, Card } from '@/components/card';
import { Field, Input, Select, Textarea } from '@/components/form';
import { Modal } from '@/components/modal';
import { Pagination } from '@/components/pagination';
import { useActionFeedback } from '@/components/use-action-feedback';
import {
    createManagedOwnerAction,
    deleteManagedOwnerAction,
    updateManagedOwnerAction,
    uploadOwnerAvatarAction,
} from '@/lib/actions/admin';
import { switchManagedHostAction } from '@/lib/actions/managed-host';
import type { FieldErrors } from '@/lib/actions/types';
import { formatDate, plural } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Paginated } from '@/types';

export const DEFAULT_HOST_TYPES = [
    'Superhôte',
    'Hôte Premium',
    'Hôte Vérifié',
    'Hôte Standard',
    'Conciergerie Partenaire',
    'Propriétaire Professionnel',
];

export type ManagedOwner = {
    id: number;
    name: string;
    email: string;
    role: string;
    host_type: string;
    account_type: 'individual' | 'company';
    company_name: string | null;
    company_registration: string | null;
    profession: string | null;
    bio: string | null;
    spoken_languages: string | null;
    response_time: string | null;
    response_rate: number | null;
    avatar_url: string | null;
    created_at: string;
    properties_count: number;
    suspended_at: string | null;
};

type Props = {
    owners: Paginated<ManagedOwner>;
    totalPropertiesCount: number;
    filters: {
        search: string;
    };
};

export function AdminOwnersClient({
    owners,
    totalPropertiesCount,
    filters,
}: Props) {
    const { applyResult, pushToast, router } = useActionFeedback();
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [createErrors, setCreateErrors] = useState<FieldErrors>({});
    const [createAccountType, setCreateAccountType] = useState<'individual' | 'company'>('individual');
    const [createAvatarUrl, setCreateAvatarUrl] = useState<string | null>(null);
    const [createUploadingAvatar, setCreateUploadingAvatar] = useState(false);

    const [editingOwner, setEditingOwner] = useState<ManagedOwner | null>(null);
    const [editStep, setEditStep] = useState<1 | 2>(1);
    const editFormRef = useRef<HTMLFormElement>(null);
    const [editErrors, setEditErrors] = useState<FieldErrors>({});
    const [editAccountType, setEditAccountType] = useState<'individual' | 'company'>('individual');
    const [editAvatarUrl, setEditAvatarUrl] = useState<string | null>(null);
    const [editUploadingAvatar, setEditUploadingAvatar] = useState(false);
    const [switchingHostId, setSwitchingHostId] = useState<number | null>(null);

    const [isPending, startTransition] = useTransition();

    function handleSwitchToHost(owner: ManagedOwner) {
        setSwitchingHostId(owner.id);
        startTransition(async () => {
            try {
                const res = await switchManagedHostAction(owner.id);
                if (res.ok) {
                    pushToast({
                        type: 'success',
                        message: `Espace hôte de « ${owner.name} » activé.`,
                    });
                    router.push('/hote');
                } else {
                    pushToast({
                        type: 'error',
                        message:
                            res.error || 'Erreur lors de la bascule vers cet espace.',
                    });
                }
            } finally {
                setSwitchingHostId(null);
            }
        });
    }

    function applyFilter(next: Partial<Props['filters']>) {
        const merged = { ...filters, ...next };
        router.push(
            buildFilterUrl('/admin/proprietaires', {
                search: merged.search || undefined,
            }),
        );
    }

    async function handleAvatarUpload(file: File, isEdit: boolean) {
        const setLoading = isEdit ? setEditUploadingAvatar : setCreateUploadingAvatar;
        const setUrl = isEdit ? setEditAvatarUrl : setCreateAvatarUrl;

        // Aperçu local immédiat via FileReader pour afficher la photo instantanément
        const reader = new FileReader();
        reader.onload = (e) => {
            if (typeof e.target?.result === 'string') {
                setUrl(e.target.result);
            }
        };
        reader.readAsDataURL(file);

        setLoading(true);
        try {
            const fd = new FormData();
            fd.append('file', file);
            if (isEdit && editingOwner) {
                fd.append('ownerId', String(editingOwner.id));
            }
            const res = await uploadOwnerAvatarAction(fd);
            if (res.ok && res.data?.url) {
                setUrl(res.data.url);
                pushToast({
                    type: 'success',
                    message: 'Photo de profil mise à jour avec succès.',
                });
            } else if (!res.ok) {
                pushToast({
                    type: 'error',
                    message: res.error || 'Erreur lors du téléversement de la photo.',
                });
            }
        } finally {
            setLoading(false);
        }
    }

    function openEditModal(owner: ManagedOwner) {
        setEditingOwner(owner);
        setEditStep(1);
        setEditErrors({});
        setEditAccountType(owner.account_type);
        setEditAvatarUrl(owner.avatar_url);
    }

    function handleNextStep() {
        if (!editFormRef.current) {
            setEditStep(2);
            return;
        }

        const nameInput = editFormRef.current.querySelector<HTMLInputElement>('input[name="name"]');
        const emailInput = editFormRef.current.querySelector<HTMLInputElement>('input[name="email"]');
        const nameVal = nameInput?.value.trim() ?? '';
        const emailVal = emailInput?.value.trim() ?? '';

        const errors: FieldErrors = {};
        if (!nameVal) {
            errors.name = 'Le nom et prénom sont obligatoires.';
        }
        if (!emailVal) {
            errors.email = 'L’adresse e-mail est obligatoire.';
        }
        if (Object.keys(errors).length > 0) {
            setEditErrors(errors);
            return;
        }

        setEditErrors({});
        setEditStep(2);
    }

    async function handleCreateOwner(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setCreateErrors({});
        const fd = new FormData(event.currentTarget);

        const name = String(fd.get('name') ?? '').trim();
        const email = String(fd.get('email') ?? '').trim();
        const password = String(fd.get('password') ?? '').trim();
        const hostType = String(fd.get('hostType') ?? '').trim();
        const companyName = String(fd.get('companyName') ?? '').trim();
        const companyRegistration = String(fd.get('companyRegistration') ?? '').trim();
        const profession = String(fd.get('profession') ?? '').trim();
        const bio = String(fd.get('bio') ?? '').trim();
        const spokenLanguages = String(fd.get('spokenLanguages') ?? '').trim();
        const responseTime = String(fd.get('responseTime') ?? '').trim();
        const responseRateRaw = Number(fd.get('responseRate') ?? 100);

        startTransition(async () => {
            const res = await createManagedOwnerAction({
                name,
                email,
                password: password || undefined,
                hostType: hostType || undefined,
                accountType: createAccountType,
                companyName: createAccountType === 'company' ? companyName : undefined,
                companyRegistration: createAccountType === 'company' ? companyRegistration : undefined,
                profession: profession || undefined,
                bio: bio || undefined,
                spokenLanguages: spokenLanguages || undefined,
                responseTime: responseTime || undefined,
                responseRate: isNaN(responseRateRaw) ? 100 : responseRateRaw,
                avatarUrl: createAvatarUrl || undefined,
            });

            applyResult(res, {
                setFieldErrors: setCreateErrors,
                onSuccess: () => {
                    setIsCreateOpen(false);
                    setCreateAvatarUrl(null);
                },
            });
        });
    }

    async function handleUpdateOwner(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!editingOwner) {
            return;
        }
        setEditErrors({});
        const fd = new FormData(event.currentTarget);

        const name = String(fd.get('name') ?? '').trim();
        const email = String(fd.get('email') ?? '').trim();
        const password = String(fd.get('password') ?? '').trim();
        const hostType = String(fd.get('hostType') ?? '').trim();
        const companyName = String(fd.get('companyName') ?? '').trim();
        const companyRegistration = String(fd.get('companyRegistration') ?? '').trim();
        const profession = String(fd.get('profession') ?? '').trim();
        const bio = String(fd.get('bio') ?? '').trim();
        const spokenLanguages = String(fd.get('spokenLanguages') ?? '').trim();
        const responseTime = String(fd.get('responseTime') ?? '').trim();
        const responseRateRaw = Number(fd.get('responseRate') ?? 100);

        startTransition(async () => {
            const res = await updateManagedOwnerAction({
                id: editingOwner.id,
                name,
                email,
                password: password || undefined,
                hostType: hostType || undefined,
                accountType: editAccountType,
                companyName: editAccountType === 'company' ? companyName : undefined,
                companyRegistration: editAccountType === 'company' ? companyRegistration : undefined,
                profession: profession || undefined,
                bio: bio || undefined,
                spokenLanguages: spokenLanguages || undefined,
                responseTime: responseTime || undefined,
                responseRate: isNaN(responseRateRaw) ? 100 : responseRateRaw,
                avatarUrl: editAvatarUrl || undefined,
            });

            if (
                !res.ok &&
                res.fieldErrors &&
                (res.fieldErrors.name ||
                    res.fieldErrors.email ||
                    res.fieldErrors.password ||
                    res.fieldErrors.companyName ||
                    res.fieldErrors.companyRegistration)
            ) {
                setEditStep(1);
            }

            applyResult(res, {
                setFieldErrors: setEditErrors,
                onSuccess: () => {
                    setEditingOwner(null);
                    setEditStep(1);
                },
            });
        });
    }

    function handleDeleteOwner(owner: ManagedOwner) {
        if (
            !window.confirm(
                `Supprimer définitivement le propriétaire « ${owner.name} » ainsi que tous ses biens associés ? Cette action est irréversible.`,
            )
        ) {
            return;
        }

        startTransition(async () => {
            const res = await deleteManagedOwnerAction(owner.id);
            applyResult(res);
        });
    }

    return (
        <div className="flex flex-col gap-6">
            {/* En-tête avec bouton d'enregistrement */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                        Propriétaires en gestion
                    </h1>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        Enregistrez et personnalisez le profil complet des hôtes et propriétaires (Superhôte, Pro/Particulier, photo, engagements).
                    </p>
                </div>
                <Button
                    onClick={() => {
                        setCreateErrors({});
                        setCreateAccountType('individual');
                        setCreateAvatarUrl(null);
                        setIsCreateOpen(true);
                    }}
                    className="self-start sm:self-auto bg-primary-600 hover:bg-primary-700"
                >
                    <svg
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="mr-1.5 size-4"
                        aria-hidden="true"
                    >
                        <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
                    </svg>
                    Enregistrer un propriétaire
                </Button>
            </div>

            {/* Cartes statistiques */}
            <div className="grid gap-4 sm:grid-cols-3">
                <Card className="p-4">
                    <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider dark:text-zinc-400">
                        Propriétaires enregistrés
                    </p>
                    <p className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                        {owners.total}
                    </p>
                </Card>
                <Card className="p-4">
                    <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider dark:text-zinc-400">
                        Biens au catalogue
                    </p>
                    <p className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                        {totalPropertiesCount}
                    </p>
                </Card>
                <Card className="p-4">
                    <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider dark:text-zinc-400">
                        Rôle système
                    </p>
                    <p className="mt-2 text-sm font-semibold text-primary-700 dark:text-primary-300">
                        Hôte & Propriétaire vérifié
                    </p>
                </Card>
            </div>

            {/* Barre de recherche */}
            <FilterBar
                search={filters.search}
                placeholder="Rechercher par nom, entreprise ou email…"
                onSearch={(search) => applyFilter({ search })}
            />

            {/* Tableau des propriétaires */}
            <DataTable
                head={[
                    'Propriétaire',
                    'Badge & Statut',
                    'Logements',
                    'Statut',
                    'Actions',
                ]}
                empty={owners.data.length === 0 ? 'Aucun propriétaire trouvé.' : false}
            >
                {owners.data.map((owner) => (
                    <tr
                        key={owner.id}
                        className="transition hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40"
                    >
                        {/* Propriétaire & Contact */}
                        <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                            <div className="flex items-center gap-3">
                                <div className="relative flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary-100 text-sm font-bold text-secondary-800 ring-2 ring-zinc-200 dark:bg-secondary-900/40 dark:text-secondary-300 dark:ring-zinc-700 overflow-hidden">
                                    <span className="select-none">{owner.name.slice(0, 1).toUpperCase()}</span>
                                    {owner.avatar_url && (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={owner.avatar_url}
                                            alt={owner.name}
                                            className="absolute inset-0 size-full object-cover"
                                            onError={(e) => {
                                                e.currentTarget.style.display = 'none';
                                            }}
                                        />
                                    )}
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">{owner.name}</span>
                                    <span className="text-xs text-zinc-500 truncate max-w-56">{owner.email}</span>
                                    {owner.profession && (
                                        <span className="text-[11px] text-zinc-400 truncate max-w-56">
                                            {owner.profession}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </td>

                        {/* Statut / Badge d'hôte & Statut juridique */}
                        <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex flex-col gap-1 items-start">
                                <span
                                    className={cn(
                                        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold',
                                        owner.host_type === 'Superhôte'
                                            ? 'bg-purple-100 text-purple-900 border border-purple-300 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-700'
                                            : owner.host_type === 'Hôte Premium'
                                                ? 'bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-700'
                                                : owner.host_type === 'Hôte Vérifié'
                                                    ? 'bg-sky-100 text-sky-900 border border-sky-300 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-700'
                                                    : owner.host_type === 'Conciergerie Partenaire' || owner.host_type === 'Propriétaire Professionnel'
                                                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-700'
                                                        : 'bg-zinc-100 text-zinc-700 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700',
                                    )}
                                >
                                    {owner.host_type === 'Superhôte' && <span>⭐</span>}
                                    {owner.host_type === 'Hôte Premium' && <span>👑</span>}
                                    {owner.host_type === 'Hôte Vérifié' && <span>🎖️</span>}
                                    <span>{owner.host_type}</span>
                                </span>

                                {owner.account_type === 'company' ? (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 dark:text-blue-400">
                                        <span>🏢</span>
                                        <span className="truncate max-w-36">{owner.company_name || 'Pro / Entreprise'}</span>
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                                        <span>👤</span>
                                        <span>Particulier</span>
                                    </span>
                                )}
                            </div>
                        </td>

                        {/* Logements */}
                        <td className="px-4 py-3 whitespace-nowrap">
                            <Link
                                href={`/admin/logements?search=${encodeURIComponent(owner.email)}`}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-800 transition hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                            >
                                <span>{plural(owner.properties_count, 'logement')}</span>
                                <svg
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                    className="size-3.5 text-zinc-400"
                                    aria-hidden="true"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M7.21 14.77a.75.75 0 0 1 .02-1.06L11.168 10 7.23 6.29a.75.75 0 1 1 1.04-1.08l4.5 4.25a.75.75 0 0 1 0 1.08l-4.5 4.25a.75.75 0 0 1-1.06-.02Z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                            </Link>
                        </td>

                        {/* Statut & Date d'enregistrement */}
                        <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex flex-col gap-1 items-start">
                                {owner.suspended_at ? (
                                    <Badge tone="danger">Suspendu</Badge>
                                ) : (
                                    <Badge tone="success">Actif</Badge>
                                )}
                                <span className="text-[11px] text-zinc-400 whitespace-nowrap">
                                    {owner.created_at ? formatDate(owner.created_at.slice(0, 10)) : '—'}
                                </span>
                            </div>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                                {/* Ouvrir / Gérer l'espace hôte de ce propriétaire */}
                                <button
                                    type="button"
                                    disabled={switchingHostId === owner.id || isPending}
                                    onClick={() => handleSwitchToHost(owner)}
                                    title={`Ouvrir et administrer l'espace hôte de « ${owner.name} »`}
                                    aria-label={`Gérer l'espace hôte de ${owner.name}`}
                                    className="flex size-8 items-center justify-center rounded-lg border border-purple-200 bg-purple-50/80 text-purple-700 transition hover:bg-purple-100 hover:text-purple-900 dark:border-purple-900/60 dark:bg-purple-950/40 dark:text-purple-300 dark:hover:bg-purple-900/50"
                                >
                                    {switchingHostId === owner.id ? (
                                        <span className="size-3.5 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" />
                                    ) : (
                                        <svg
                                            viewBox="0 0 20 20"
                                            fill="currentColor"
                                            className="size-4"
                                            aria-hidden="true"
                                        >
                                            <path
                                                fillRule="evenodd"
                                                d="M9.293 2.293a1 1 0 0 1 1.414 0l7 7A1 1 0 0 1 17 11h-1v6a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-6H3a1 1 0 0 1-.707-1.707l7-7Z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                    )}
                                </button>

                                {/* Modifier le profil de l'hôte */}
                                <button
                                    type="button"
                                    onClick={() => openEditModal(owner)}
                                    title="Modifier le profil complet de cet hôte/propriétaire"
                                    aria-label="Modifier ce propriétaire"
                                    className="flex size-8 items-center justify-center rounded-lg border border-amber-200 bg-amber-50/70 text-amber-700 transition hover:bg-amber-100 hover:text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-900/50"
                                >
                                    <svg
                                        viewBox="0 0 20 20"
                                        fill="currentColor"
                                        className="size-4"
                                        aria-hidden="true"
                                    >
                                        <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
                                        <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" />
                                    </svg>
                                </button>

                                {/* Ajouter un bien pour ce propriétaire */}
                                <Link
                                    href={`/admin/logements/nouveau?owner_id=${owner.id}`}
                                    title="Ajouter un bien pour ce propriétaire"
                                    aria-label="Ajouter un bien"
                                    className="flex size-8 items-center justify-center rounded-lg border border-primary-200 bg-primary-50/70 text-primary-700 transition hover:bg-primary-100 hover:text-primary-800 dark:border-primary-900/60 dark:bg-primary-950/40 dark:text-primary-300 dark:hover:bg-primary-900/50"
                                >
                                    <svg
                                        viewBox="0 0 20 20"
                                        fill="currentColor"
                                        className="size-4"
                                        aria-hidden="true"
                                    >
                                        <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
                                    </svg>
                                </Link>

                                {/* Profil utilisateur */}
                                <Link
                                    href={`/admin/utilisateurs?search=${encodeURIComponent(owner.email)}`}
                                    title="Consulter le compte utilisateur"
                                    aria-label="Voir le profil"
                                    className="flex size-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                                >
                                    <svg
                                        viewBox="0 0 20 20"
                                        fill="currentColor"
                                        className="size-4"
                                        aria-hidden="true"
                                    >
                                        <path d="M10 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3.465 14.493a1.23 1.23 0 0 0 .41 1.412A9.957 9.957 0 0 0 10 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 0 0-13.074.003Z" />
                                    </svg>
                                </Link>

                                {/* Supprimer le propriétaire */}
                                <button
                                    type="button"
                                    disabled={isPending}
                                    onClick={() => handleDeleteOwner(owner)}
                                    title="Supprimer définitivement ce propriétaire"
                                    aria-label="Supprimer ce propriétaire"
                                    className="flex size-8 items-center justify-center rounded-lg border border-red-200 bg-red-50/70 text-red-600 transition hover:border-red-300 hover:bg-red-100 hover:text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-900/50"
                                >
                                    <svg
                                        viewBox="0 0 20 20"
                                        fill="currentColor"
                                        className="size-4"
                                        aria-hidden="true"
                                    >
                                        <path
                                            fillRule="evenodd"
                                            d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 1 .75.72l.5 6a.75.75 0 1 1-1.498.12l-.5-6a.75.75 0 0 1 .748-.84Zm3.59.84a.75.75 0 0 0-1.498-.12l-.5 6a.75.75 0 1 0 1.498.12l.5-6Z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                </button>
                            </div>
                        </td>
                    </tr>
                ))}
            </DataTable>

            <Pagination paginator={owners} noun="propriétaire" nounPlural="propriétaires" />

            {/* Modale d'enregistrement d'un nouveau propriétaire */}
            <Modal
                open={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                title="Enregistrer un nouveau propriétaire / hôte"
                className="max-w-2xl"
            >
                <form
                    onSubmit={(event) => void handleCreateOwner(event)}
                    className="flex flex-col gap-5 text-left max-h-[80vh] overflow-y-auto px-1"
                >
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Configurez le compte hôte/propriétaire complet : badge (Superhôte, Premium...), statut particulier ou pro, photo et engagements.
                    </p>

                    {/* Photo de profil */}
                    <div className="flex items-center gap-4 rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
                        <div className="relative flex size-16 shrink-0 items-center justify-center rounded-full bg-secondary-100 text-xl font-black text-secondary-800 ring-2 ring-zinc-200 dark:bg-secondary-900/60 dark:text-secondary-200 dark:ring-zinc-700 overflow-hidden">
                            <span className="select-none text-secondary-600 dark:text-secondary-400">👤</span>
                            {createAvatarUrl && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={createAvatarUrl}
                                    alt="Aperçu"
                                    className="absolute inset-0 size-full object-cover"
                                    onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                    }}
                                />
                            )}
                        </div>
                        <div className="flex flex-col gap-1.5 flex-1">
                            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                                Photo de profil de l’hôte / propriétaire
                            </span>
                            <div className="flex flex-wrap items-center gap-2">
                                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-800 shadow-2xs hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                                    <span>{createUploadingAvatar ? 'Téléversement...' : 'Téléverser photo'}</span>
                                    <input
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp,image/gif"
                                        className="hidden"
                                        disabled={createUploadingAvatar}
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) void handleAvatarUpload(file, false);
                                        }}
                                    />
                                </label>
                                {createAvatarUrl && (
                                    <button
                                        type="button"
                                        onClick={() => setCreateAvatarUrl(null)}
                                        className="text-xs font-medium text-red-600 hover:underline dark:text-red-400"
                                    >
                                        Supprimer
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Identité */}
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field
                            label="Nom et prénom"
                            htmlFor="create-owner-name"
                            error={createErrors.name}
                        >
                            <Input
                                id="create-owner-name"
                                name="name"
                                required
                                placeholder="Ex : Marius Moreau"
                                autoComplete="name"
                            />
                        </Field>

                        <Field
                            label="Adresse e-mail"
                            htmlFor="create-owner-email"
                            error={createErrors.email}
                        >
                            <Input
                                id="create-owner-email"
                                name="email"
                                type="email"
                                required
                                placeholder="marius@exemple.com"
                                autoComplete="email"
                            />
                        </Field>
                    </div>

                    {/* Statut / Badge d'hôte & Mot de passe */}
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field
                            label="Statut / Badge d’hôte"
                            htmlFor="create-owner-host-type"
                            hint="Définit le badge affiché sur les annonces"
                        >
                            <Select
                                id="create-owner-host-type"
                                name="hostType"
                                defaultValue="Superhôte"
                            >
                                {DEFAULT_HOST_TYPES.map((type) => (
                                    <option key={type} value={type}>
                                        {type}
                                    </option>
                                ))}
                            </Select>
                        </Field>

                        <Field
                            label="Mot de passe provisoire (optionnel)"
                            htmlFor="create-owner-password"
                            error={createErrors.password}
                            hint="Laissez vide pour générer automatiquement"
                        >
                            <Input
                                id="create-owner-password"
                                name="password"
                                type="password"
                                placeholder="Minimum 8 caractères"
                                autoComplete="new-password"
                            />
                        </Field>
                    </div>

                    {/* Type de compte : Particulier ou Pro */}
                    <div className="rounded-2xl border border-zinc-200 bg-zinc-50/60 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
                        <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                            Statut juridique *
                        </span>
                        <div className="mt-2.5 grid gap-3 sm:grid-cols-2">
                            <label
                                className={cn(
                                    'flex cursor-pointer items-center justify-between rounded-xl border p-3 bg-white transition dark:bg-zinc-900',
                                    createAccountType === 'individual'
                                        ? 'border-primary-600 ring-2 ring-primary-500/20'
                                        : 'border-zinc-200 dark:border-zinc-800',
                                )}
                            >
                                <div className="flex items-center gap-2">
                                    <span className="text-lg">👤</span>
                                    <div>
                                        <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                                            Particulier
                                        </p>
                                        <p className="text-[11px] text-zinc-500">
                                            Location à titre privé
                                        </p>
                                    </div>
                                </div>
                                <input
                                    type="radio"
                                    name="accountTypeRadio"
                                    value="individual"
                                    checked={createAccountType === 'individual'}
                                    onChange={() => setCreateAccountType('individual')}
                                    className="accent-primary-600"
                                />
                            </label>

                            <label
                                className={cn(
                                    'flex cursor-pointer items-center justify-between rounded-xl border p-3 bg-white transition dark:bg-zinc-900',
                                    createAccountType === 'company'
                                        ? 'border-blue-600 ring-2 ring-blue-500/20'
                                        : 'border-zinc-200 dark:border-zinc-800',
                                )}
                            >
                                <div className="flex items-center gap-2">
                                    <span className="text-lg">🏢</span>
                                    <div>
                                        <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                                            Professionnel / Pro
                                        </p>
                                        <p className="text-[11px] text-zinc-500">
                                            Entreprise, conciergerie ou agence
                                        </p>
                                    </div>
                                </div>
                                <input
                                    type="radio"
                                    name="accountTypeRadio"
                                    value="company"
                                    checked={createAccountType === 'company'}
                                    onChange={() => setCreateAccountType('company')}
                                    className="accent-blue-600"
                                />
                            </label>
                        </div>

                        {createAccountType === 'company' && (
                            <div className="mt-3 grid gap-3 sm:grid-cols-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                                <Field
                                    label="Raison sociale / Nom entreprise"
                                    htmlFor="create-owner-company-name"
                                >
                                    <Input
                                        id="create-owner-company-name"
                                        name="companyName"
                                        placeholder="Ex : Appartements hôteliers Niro"
                                    />
                                </Field>

                                <Field
                                    label="N° SIRET / RCS"
                                    htmlFor="create-owner-company-reg"
                                >
                                    <Input
                                        id="create-owner-company-reg"
                                        name="companyRegistration"
                                        placeholder="Ex : 849 123 456 00012"
                                    />
                                </Field>
                            </div>
                        )}
                    </div>

                    {/* Activité & Métriques de réactivité */}
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field
                            label="Profession / Titre public"
                            htmlFor="create-owner-profession"
                            hint="Ex : Appartements hôteliers Niro, Conciergerie Azur..."
                        >
                            <Input
                                id="create-owner-profession"
                                name="profession"
                                placeholder="Ex : Appartements hôteliers Niro"
                            />
                        </Field>

                        <Field
                            label="Langues parlées"
                            htmlFor="create-owner-languages"
                            hint="Ex : Français, Anglais, Suédois..."
                        >
                            <Input
                                id="create-owner-languages"
                                name="spokenLanguages"
                                defaultValue="Français, Anglais"
                            />
                        </Field>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field
                            label="Délai de réponse habituel"
                            htmlFor="create-owner-resp-time"
                        >
                            <Select
                                id="create-owner-resp-time"
                                name="responseTime"
                                defaultValue="dans l'heure"
                            >
                                <option value="dans l'heure">Dans l’heure</option>
                                <option value="en quelques heures">En quelques heures</option>
                                <option value="dans la journée">Dans la journée</option>
                            </Select>
                        </Field>

                        <Field
                            label="Taux de réponse (%)"
                            htmlFor="create-owner-resp-rate"
                        >
                            <Input
                                id="create-owner-resp-rate"
                                name="responseRate"
                                type="number"
                                min={50}
                                max={100}
                                defaultValue={100}
                            />
                        </Field>
                    </div>

                    {/* Présentation / Bio */}
                    <Field
                        label="Présentation / Bio de l’hôte"
                        htmlFor="create-owner-bio"
                        hint="Texte affiché dans l’encadré « Faites connaissance avec votre hôte »"
                    >
                        <Textarea
                            id="create-owner-bio"
                            name="bio"
                            rows={3}
                            placeholder="Présentation des services, engagements de confort et disponibilité pour les voyageurs..."
                        />
                    </Field>

                    <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setIsCreateOpen(false)}
                        >
                            Annuler
                        </Button>
                        <Button
                            type="submit"
                            loading={isPending}
                            className="bg-primary-600 hover:bg-primary-700"
                        >
                            Enregistrer le propriétaire
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Modale de Modification d'un propriétaire existant */}
            <Modal
                open={editingOwner !== null}
                onClose={() => setEditingOwner(null)}
                title={editingOwner ? `Modifier le profil de « ${editingOwner.name} »` : 'Modifier le propriétaire'}
                className="max-w-2xl"
            >
                {editingOwner && (
                    <form
                        ref={editFormRef}
                        onSubmit={(event) => void handleUpdateOwner(event)}
                        className="flex flex-col gap-5 text-left max-h-[80vh] overflow-y-auto px-1"
                    >
                        {/* Indicateur de progression en 2 étapes */}
                        <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3 dark:border-zinc-800 dark:bg-zinc-900/50">
                            <div className="flex items-center justify-between text-xs">
                                <button
                                    type="button"
                                    onClick={() => setEditStep(1)}
                                    className={cn(
                                        'flex items-center gap-2 font-semibold transition',
                                        editStep === 1
                                            ? 'text-primary-700 dark:text-primary-400'
                                            : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200',
                                    )}
                                >
                                    <span
                                        className={cn(
                                            'flex size-6 items-center justify-center rounded-full text-[11px] font-bold shadow-xs',
                                            editStep === 1
                                                ? 'bg-primary-600 text-white'
                                                : 'bg-emerald-600 text-white',
                                        )}
                                    >
                                        {editStep === 2 ? '✓' : '1'}
                                    </span>
                                    <span>Étape 1 : Identité & Statut juridique</span>
                                </button>

                                <div className="mx-3 h-0.5 flex-1 bg-zinc-200 dark:bg-zinc-700">
                                    <div
                                        className={cn(
                                            'h-full bg-primary-600 transition-all duration-300',
                                            editStep === 2 ? 'w-full' : 'w-0',
                                        )}
                                    />
                                </div>

                                <button
                                    type="button"
                                    onClick={() => handleNextStep()}
                                    className={cn(
                                        'flex items-center gap-2 font-semibold transition',
                                        editStep === 2
                                            ? 'text-primary-700 dark:text-primary-400'
                                            : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200',
                                    )}
                                >
                                    <span
                                        className={cn(
                                            'flex size-6 items-center justify-center rounded-full text-[11px] font-bold shadow-xs',
                                            editStep === 2
                                                ? 'bg-primary-600 text-white'
                                                : 'bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300',
                                        )}
                                    >
                                        2
                                    </span>
                                    <span>Étape 2 : Activité & Présentation</span>
                                </button>
                            </div>
                        </div>

                        {/* ÉTAPE 1 : Identité & Statut juridique */}
                        <div className={cn('flex flex-col gap-5', editStep !== 1 && 'hidden')}>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                Modifiez la photo de profil, l’identité, le badge d’hôte et le statut juridique (Particulier ou Professionnel).
                            </p>

                            {/* Photo de profil */}
                            <div className="flex items-center gap-4 rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
                                <div className="relative flex size-16 shrink-0 items-center justify-center rounded-full bg-secondary-100 text-xl font-black text-secondary-800 ring-2 ring-zinc-200 dark:bg-secondary-900/60 dark:text-secondary-200 dark:ring-zinc-700 overflow-hidden">
                                    <span className="select-none">{editingOwner.name.slice(0, 1).toUpperCase()}</span>
                                    {editAvatarUrl && (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={editAvatarUrl}
                                            alt={editingOwner.name}
                                            className="absolute inset-0 size-full object-cover"
                                            onError={(e) => {
                                                e.currentTarget.style.display = 'none';
                                            }}
                                        />
                                    )}
                                </div>
                                <div className="flex flex-col gap-1.5 flex-1">
                                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                                        Photo de profil de l’hôte / propriétaire
                                    </span>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-800 shadow-2xs hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                                            <span>{editUploadingAvatar ? 'Téléversement...' : 'Changer la photo'}</span>
                                            <input
                                                type="file"
                                                accept="image/jpeg,image/png,image/webp,image/gif"
                                                className="hidden"
                                                disabled={editUploadingAvatar}
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) void handleAvatarUpload(file, true);
                                                }}
                                            />
                                        </label>
                                        {editAvatarUrl && (
                                            <button
                                                type="button"
                                                onClick={() => setEditAvatarUrl(null)}
                                                className="text-xs font-medium text-red-600 hover:underline dark:text-red-400"
                                            >
                                                Supprimer
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Identité */}
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Field
                                    label="Nom et prénom"
                                    htmlFor="edit-owner-name"
                                    error={editErrors.name}
                                >
                                    <Input
                                        id="edit-owner-name"
                                        name="name"
                                        defaultValue={editingOwner.name}
                                        required
                                        autoComplete="name"
                                    />
                                </Field>

                                <Field
                                    label="Adresse e-mail"
                                    htmlFor="edit-owner-email"
                                    error={editErrors.email}
                                >
                                    <Input
                                        id="edit-owner-email"
                                        name="email"
                                        type="email"
                                        defaultValue={editingOwner.email}
                                        required
                                        autoComplete="email"
                                    />
                                </Field>
                            </div>

                            {/* Statut / Badge d'hôte & Mot de passe */}
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Field
                                    label="Statut / Badge d’hôte"
                                    htmlFor="edit-owner-host-type"
                                    hint="Définit le badge affiché sur les annonces"
                                >
                                    <Select
                                        id="edit-owner-host-type"
                                        name="hostType"
                                        defaultValue={editingOwner.host_type}
                                    >
                                        {DEFAULT_HOST_TYPES.map((type) => (
                                            <option key={type} value={type}>
                                                {type}
                                            </option>
                                        ))}
                                    </Select>
                                </Field>

                                <Field
                                    label="Nouveau mot de passe (optionnel)"
                                    htmlFor="edit-owner-password"
                                    error={editErrors.password}
                                    hint="Laissez vide pour conserver l'actuel"
                                >
                                    <Input
                                        id="edit-owner-password"
                                        name="password"
                                        type="password"
                                        placeholder="Minimum 8 caractères"
                                        autoComplete="new-password"
                                    />
                                </Field>
                            </div>

                            {/* Type de compte : Particulier ou Pro */}
                            <div className="rounded-2xl border border-zinc-200 bg-zinc-50/60 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
                                <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                                    Statut juridique *
                                </span>
                                <div className="mt-2.5 grid gap-3 sm:grid-cols-2">
                                    <label
                                        className={cn(
                                            'flex cursor-pointer items-center justify-between rounded-xl border p-3 bg-white transition dark:bg-zinc-900',
                                            editAccountType === 'individual'
                                                ? 'border-primary-600 ring-2 ring-primary-500/20'
                                                : 'border-zinc-200 dark:border-zinc-800',
                                        )}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg">👤</span>
                                            <div>
                                                <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                                                    Particulier
                                                </p>
                                                <p className="text-[11px] text-zinc-500">
                                                    Location à titre privé
                                                </p>
                                            </div>
                                        </div>
                                        <input
                                            type="radio"
                                            name="editAccountTypeRadio"
                                            value="individual"
                                            checked={editAccountType === 'individual'}
                                            onChange={() => setEditAccountType('individual')}
                                            className="accent-primary-600"
                                        />
                                    </label>

                                    <label
                                        className={cn(
                                            'flex cursor-pointer items-center justify-between rounded-xl border p-3 bg-white transition dark:bg-zinc-900',
                                            editAccountType === 'company'
                                                ? 'border-blue-600 ring-2 ring-blue-500/20'
                                                : 'border-zinc-200 dark:border-zinc-800',
                                        )}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg">🏢</span>
                                            <div>
                                                <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                                                    Professionnel / Pro
                                                </p>
                                                <p className="text-[11px] text-zinc-500">
                                                    Entreprise, conciergerie ou agence
                                                </p>
                                            </div>
                                        </div>
                                        <input
                                            type="radio"
                                            name="editAccountTypeRadio"
                                            value="company"
                                            checked={editAccountType === 'company'}
                                            onChange={() => setEditAccountType('company')}
                                            className="accent-blue-600"
                                        />
                                    </label>
                                </div>

                                {editAccountType === 'company' && (
                                    <div className="mt-3 grid gap-3 sm:grid-cols-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                                        <Field
                                            label="Raison sociale / Nom entreprise"
                                            htmlFor="edit-owner-company-name"
                                            error={editErrors.companyName}
                                        >
                                            <Input
                                                id="edit-owner-company-name"
                                                name="companyName"
                                                defaultValue={editingOwner.company_name ?? ''}
                                                placeholder="Ex : Appartements hôteliers Niro"
                                            />
                                        </Field>

                                        <Field
                                            label="N° SIRET / RCS"
                                            htmlFor="edit-owner-company-reg"
                                            error={editErrors.companyRegistration}
                                        >
                                            <Input
                                                id="edit-owner-company-reg"
                                                name="companyRegistration"
                                                defaultValue={editingOwner.company_registration ?? ''}
                                                placeholder="Ex : 849 123 456 00012"
                                            />
                                        </Field>
                                    </div>
                                )}
                            </div>

                            {/* Boutons footer Étape 1 */}
                            <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setEditingOwner(null)}
                                >
                                    Annuler
                                </Button>
                                <Button
                                    type="button"
                                    onClick={() => handleNextStep()}
                                    className="bg-primary-600 hover:bg-primary-700"
                                >
                                    <span>Suivant</span>
                                    <svg
                                        viewBox="0 0 20 20"
                                        fill="currentColor"
                                        className="ml-1.5 size-4"
                                        aria-hidden="true"
                                    >
                                        <path
                                            fillRule="evenodd"
                                            d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                </Button>
                            </div>
                        </div>

                        {/* ÉTAPE 2 : Activité, Réactivité & Présentation */}
                        <div className={cn('flex flex-col gap-5', editStep !== 2 && 'hidden')}>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                Renseignez les informations publiques affichées sur les annonces pour les voyageurs (titre/profession, langues parlées, réactivité et biographie).
                            </p>

                            {/* Activité & Métriques de réactivité */}
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Field
                                    label="Profession / Titre public"
                                    htmlFor="edit-owner-profession"
                                    hint="Ex : Appartements hôteliers Niro, Conciergerie Azur..."
                                >
                                    <Input
                                        id="edit-owner-profession"
                                        name="profession"
                                        defaultValue={editingOwner.profession ?? ''}
                                        placeholder="Ex : Appartements hôteliers Niro"
                                    />
                                </Field>

                                <Field
                                    label="Langues parlées"
                                    htmlFor="edit-owner-languages"
                                    hint="Ex : Français, Anglais, Suédois..."
                                >
                                    <Input
                                        id="edit-owner-languages"
                                        name="spokenLanguages"
                                        defaultValue={editingOwner.spoken_languages ?? 'Français, Anglais'}
                                    />
                                </Field>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <Field
                                    label="Délai de réponse habituel"
                                    htmlFor="edit-owner-resp-time"
                                >
                                    <Select
                                        id="edit-owner-resp-time"
                                        name="responseTime"
                                        defaultValue={editingOwner.response_time ?? "dans l'heure"}
                                    >
                                        <option value="dans l'heure">Dans l’heure</option>
                                        <option value="en quelques heures">En quelques heures</option>
                                        <option value="dans la journée">Dans la journée</option>
                                    </Select>
                                </Field>

                                <Field
                                    label="Taux de réponse (%)"
                                    htmlFor="edit-owner-resp-rate"
                                >
                                    <Input
                                        id="edit-owner-resp-rate"
                                        name="responseRate"
                                        type="number"
                                        min={50}
                                        max={100}
                                        defaultValue={editingOwner.response_rate ?? 100}
                                    />
                                </Field>
                            </div>

                            {/* Présentation / Bio */}
                            <Field
                                label="Présentation / Bio de l’hôte"
                                htmlFor="edit-owner-bio"
                                hint="Texte affiché dans l’encadré « Faites connaissance avec votre hôte »"
                            >
                                <Textarea
                                    id="edit-owner-bio"
                                    name="bio"
                                    rows={4}
                                    defaultValue={editingOwner.bio ?? ''}
                                    placeholder="Présentation des services, engagements de confort et disponibilité pour les voyageurs..."
                                />
                            </Field>

                            {/* Boutons footer Étape 2 */}
                            <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setEditStep(1)}
                                >
                                    <svg
                                        viewBox="0 0 20 20"
                                        fill="currentColor"
                                        className="mr-1.5 size-4"
                                        aria-hidden="true"
                                    >
                                        <path
                                            fillRule="evenodd"
                                            d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                    <span>Précédent</span>
                                </Button>

                                <div className="flex items-center gap-2">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() => setEditingOwner(null)}
                                    >
                                        Annuler
                                    </Button>
                                    <Button
                                        type="submit"
                                        loading={isPending}
                                        className="bg-primary-600 hover:bg-primary-700"
                                    >
                                        Enregistrer les modifications
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </form>
                )}
            </Modal>
        </div>
    );
}
