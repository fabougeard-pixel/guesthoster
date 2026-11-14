'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Input, Label, Select, Textarea } from '@/components/form';
import { updatePlatformSeoSettingsAction } from '@/lib/actions/admin-settings';
import type { PlatformSeoSettings } from '@/lib/domain/platform-settings';
import { cn } from '@/lib/utils';

export function AdminSeoClient({
    initialSettings,
}: {
    initialSettings: PlatformSeoSettings;
}) {
    const router = useRouter();
    const [settings, setSettings] = useState<PlatformSeoSettings>(initialSettings);
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState<{
        type: 'success' | 'error';
        text: string;
    } | null>(null);

    function patch(values: Partial<PlatformSeoSettings>) {
        setSettings((prev) => ({ ...prev, ...values }));
    }

    async function handleSubmit(event: React.FormEvent) {
        event.preventDefault();
        setSaving(true);
        setStatus(null);
        try {
            const res = await updatePlatformSeoSettingsAction(settings);
            if (!res.ok) {
                setStatus({
                    type: 'error',
                    text: res.error ?? 'Erreur lors de l’enregistrement.',
                });
            } else {
                if (res.data) {
                    setSettings(res.data);
                }
                setStatus({
                    type: 'success',
                    text: 'Paramètres SEO et métadonnées enregistrés avec succès.',
                });
                router.refresh();
            }
        } catch {
            setStatus({
                type: 'error',
                text: 'Une erreur inattendue est survenue.',
            });
        } finally {
            setSaving(false);
        }
    }

    const titleLength = settings.metaTitle.length;
    const descLength = settings.metaDescription.length;

    const displayBaseUrl =
        settings.canonicalBaseUrl.trim() || 'https://www.guesthoster.com';

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            {/* Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                        Paramètres SEO & Référencement
                    </h1>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                        Configuration complète inspirée de Lenaonline : balises OpenGraph, données structurées Schema.org, Google Analytics et suivi SEO.
                    </p>
                </div>
                <Button
                    type="submit"
                    disabled={saving}
                    className="self-start sm:self-auto"
                >
                    {saving ? 'Enregistrement...' : 'Enregistrer les paramètres'}
                </Button>
            </div>

            {status && (
                <div
                    role="alert"
                    className={cn(
                        'rounded-xl border p-4 text-sm font-medium',
                        status.type === 'success'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300'
                            : 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300',
                    )}
                >
                    {status.text}
                </div>
            )}

            {/* Google SERP Live Preview */}
            <Card className="border-primary-100 bg-gradient-to-br from-primary-50/50 via-white to-zinc-50/50 p-6 dark:border-primary-950 dark:from-primary-950/20 dark:via-zinc-900 dark:to-zinc-900">
                <div className="flex items-center gap-2">
                    <span className="flex size-7 items-center justify-center rounded-lg bg-primary-600 text-xs font-bold text-white shadow-xs">
                        G
                    </span>
                    <div>
                        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                            Aperçu Google Search (SERP)
                        </h2>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            Simulation en temps réel de votre résultat dans les moteurs de recherche
                        </p>
                    </div>
                </div>

                <div className="mt-4 rounded-xl border border-zinc-200/80 bg-white p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-950">
                    <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                        <span className="font-medium text-zinc-900 dark:text-zinc-200">
                            {settings.organizationName || 'GuestHoster'}
                        </span>
                        <span>›</span>
                        <span className="truncate text-zinc-500">
                            {displayBaseUrl.replace(/^https?:\/\//, '')}
                        </span>
                    </div>
                    <div className="mt-1">
                        <span className="cursor-pointer text-lg font-medium text-blue-700 hover:underline dark:text-blue-400">
                            {settings.metaTitle || 'GuestHoster · Plateforme de locations'}
                        </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-300">
                        {settings.metaDescription ||
                            'Locations d’exception partout en Europe : réservez en direct auprès de propriétaires vérifiés...'}
                    </p>
                </div>
            </Card>

            {/* Section 1: Balises Méta & Page d'accueil */}
            <Card className="p-6">
                <div className="mb-6 border-b border-zinc-100 pb-4 dark:border-zinc-800">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                        1. Métadonnées Générales & Page d’accueil
                    </h2>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        Ces métadonnées définissent le titre, la description et l’URL canonique du site.
                    </p>
                </div>

                <div className="space-y-6">
                    <div>
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium">
                                Meta Titre (Page d’accueil & par défaut)
                            </Label>
                            <span
                                className={cn(
                                    'text-xs font-semibold',
                                    titleLength < 50
                                        ? 'text-amber-600 dark:text-amber-400'
                                        : titleLength <= 60
                                          ? 'text-emerald-600 dark:text-emerald-400'
                                          : 'text-amber-600 dark:text-amber-400',
                                )}
                            >
                                {titleLength} caractères{' '}
                                {titleLength === 0
                                    ? ''
                                    : titleLength < 50
                                      ? '(Trop court, 50-60 conseillé)'
                                      : titleLength <= 60
                                        ? '✓ Idéal'
                                        : '(Trop long, risque de troncature)'}
                            </span>
                        </div>
                        <Input
                            className="mt-2"
                            value={settings.metaTitle}
                            onChange={(e) => patch({ metaTitle: e.target.value })}
                            placeholder="GuestHoster | Conciergerie & Locations Saisonnières et Longue Durée"
                            maxLength={160}
                        />
                        <p className="mt-1.5 text-xs text-zinc-500">
                            Recommandation SEO : entre 50 et 60 caractères pour un affichage optimal dans les SERP.
                        </p>
                    </div>

                    <div>
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium">
                                Meta Description
                            </Label>
                            <span
                                className={cn(
                                    'text-xs font-semibold',
                                    descLength < 80
                                        ? 'text-amber-600 dark:text-amber-400'
                                        : descLength <= 160
                                          ? 'text-emerald-600 dark:text-emerald-400'
                                          : 'text-amber-600 dark:text-amber-400',
                                )}
                            >
                                {descLength} caractères{' '}
                                {descLength === 0
                                    ? ''
                                    : descLength < 80
                                      ? '(Trop court, 80-160 conseillé)'
                                      : descLength <= 160
                                        ? '✓ Idéal'
                                        : '(Tronqué au-delà de 160)'}
                            </span>
                        </div>
                        <Textarea
                            rows={3}
                            className="mt-2"
                            value={settings.metaDescription}
                            onChange={(e) =>
                                patch({ metaDescription: e.target.value })
                            }
                            placeholder="Locations saisonnières et séjours de standing partout en Europe : réservez en direct auprès de propriétaires vérifiés..."
                            maxLength={320}
                        />
                        <p className="mt-1.5 text-xs text-zinc-500">
                            Recommandation SEO : 80 à 160 caractères pour maximiser le taux de clic (CTR).
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <div>
                            <Label className="text-sm font-medium">
                                Mots-clés SEO (meta keywords)
                            </Label>
                            <p className="mt-0.5 text-xs text-zinc-500">
                                Séparez les expressions par des virgules.
                            </p>
                            <Input
                                className="mt-2"
                                value={settings.metaKeywords}
                                onChange={(e) =>
                                    patch({ metaKeywords: e.target.value })
                                }
                                placeholder="location saisonnière, conciergerie, villa de vacances"
                            />
                        </div>

                        <div>
                            <Label className="text-sm font-medium">
                                URL de base canonique
                            </Label>
                            <p className="mt-0.5 text-xs text-zinc-500">
                                Utilisée pour les balises rel=&apos;canonical&apos; et sitemap.xml.
                            </p>
                            <Input
                                className="mt-2"
                                value={settings.canonicalBaseUrl}
                                onChange={(e) =>
                                    patch({ canonicalBaseUrl: e.target.value })
                                }
                                placeholder="https://www.guesthoster.com"
                            />
                        </div>
                    </div>
                </div>
            </Card>

            {/* Section 2: Réseaux Sociaux & OpenGraph */}
            <Card className="p-6">
                <div className="mb-6 border-b border-zinc-100 pb-4 dark:border-zinc-800">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                        2. Réseaux Sociaux & Balises OpenGraph
                    </h2>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        Contrôlez l’apparence lors des partages sur Facebook, LinkedIn, Twitter/X et WhatsApp.
                    </p>
                </div>

                <div className="space-y-6">
                    <div>
                        <Label className="text-sm font-medium">
                            Image OpenGraph (og:image)
                        </Label>
                        <p className="mt-0.5 text-xs text-zinc-500">
                            Image de prévisualisation (ratio 1.91:1 recommandé, ex: 1200x630px).
                        </p>
                        <Input
                            className="mt-2"
                            value={settings.ogImage}
                            onChange={(e) => patch({ ogImage: e.target.value })}
                            placeholder="https://www.guesthoster.com/og-image.jpg"
                        />

                        {settings.ogImage && (
                            <div className="mt-3 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-800 dark:bg-zinc-900">
                                <p className="mb-2 text-xs font-medium text-zinc-500">
                                    Aperçu de l’image :
                                </p>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={settings.ogImage}
                                    alt="Prévisualisation OpenGraph"
                                    className="max-h-48 w-auto rounded-lg object-cover shadow-xs"
                                    onError={(e) => {
                                        (e.target as HTMLElement).style.display =
                                            'none';
                                    }}
                                />
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <div>
                            <Label className="text-sm font-medium">
                                Format Twitter Card
                            </Label>
                            <p className="mt-0.5 text-xs text-zinc-500">
                                Grand visuel ou résumé compact.
                            </p>
                            <Select
                                className="mt-2"
                                value={settings.twitterCard}
                                onChange={(e) =>
                                    patch({
                                        twitterCard: e.target
                                            .value as PlatformSeoSettings['twitterCard'],
                                    })
                                }
                            >
                                <option value="summary_large_image">
                                    Grand visuel (summary_large_image)
                                </option>
                                <option value="summary">
                                    Format carré compact (summary)
                                </option>
                            </Select>
                        </div>

                        <div>
                            <Label className="text-sm font-medium">
                                Compte Twitter / X
                            </Label>
                            <p className="mt-0.5 text-xs text-zinc-500">
                                Ex: @guesthoster pour l’attribution créateur.
                            </p>
                            <Input
                                className="mt-2"
                                value={settings.twitterHandle}
                                onChange={(e) =>
                                    patch({ twitterHandle: e.target.value })
                                }
                                placeholder="@guesthoster"
                            />
                        </div>
                    </div>
                </div>
            </Card>

            {/* Section 3: Indexation, Google Search Console & Analytics */}
            <Card className="p-6">
                <div className="mb-6 border-b border-zinc-100 pb-4 dark:border-zinc-800">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                        3. Moteurs de Recherche, Suivi & Indexation
                    </h2>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        Connectez vos outils d’analyse et gérez les directives pour les robots d’exploration.
                    </p>
                </div>

                <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <div>
                            <Label className="text-sm font-medium">
                                Google Search Console
                            </Label>
                            <p className="mt-0.5 text-xs text-zinc-500">
                                Code du tag de validation (ex: xxxxxxxxx-yyyyyy).
                            </p>
                            <Input
                                className="mt-2"
                                value={settings.googleSiteVerification}
                                onChange={(e) =>
                                    patch({
                                        googleSiteVerification: e.target.value,
                                    })
                                }
                                placeholder="votre_code_de_verification"
                            />
                        </div>

                        <div>
                            <Label className="text-sm font-medium">
                                Google Analytics 4 (ID de mesure)
                            </Label>
                            <p className="mt-0.5 text-xs text-zinc-500">
                                Format G-XXXXXXXXXX pour le tracking d’audience.
                            </p>
                            <Input
                                className="mt-2 font-mono"
                                value={settings.googleAnalyticsId}
                                onChange={(e) =>
                                    patch({ googleAnalyticsId: e.target.value })
                                }
                                placeholder="G-XXXXXXXXXX"
                            />
                        </div>
                    </div>

                    <div>
                        <Label className="text-sm font-medium">
                            Directive d’indexation (Robots)
                        </Label>
                        <p className="mt-0.5 text-xs text-zinc-500">
                            Définissez si les moteurs de recherche sont autorisés à indexer la plateforme.
                        </p>
                        <Select
                            className="mt-2"
                            value={settings.robotsIndexing}
                            onChange={(e) =>
                                patch({
                                    robotsIndexing: e.target
                                        .value as PlatformSeoSettings['robotsIndexing'],
                                })
                            }
                        >
                            <option value="index_follow">
                                Activer l’indexation (index, follow - Recommandé en production)
                            </option>
                            <option value="noindex_nofollow">
                                Désactiver l’indexation (noindex, nofollow - Maintenance / Préproduction)
                            </option>
                        </Select>
                    </div>
                </div>
            </Card>

            {/* Section 4: Données Structurées & Local SEO (Schema.org / JSON-LD) */}
            <Card className="p-6">
                <div className="mb-6 border-b border-zinc-100 pb-4 dark:border-zinc-800">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                        4. Local SEO & Données Structurées (Schema.org / JSON-LD)
                    </h2>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        Permet à Google de générer des fiches enrichies (Knowledge Graph, Rich Snippets et coordonnées).
                    </p>
                </div>

                <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <div>
                            <Label className="text-sm font-medium">
                                Nom commercial de l’organisation
                            </Label>
                            <p className="mt-0.5 text-xs text-zinc-500">
                                Nom de marque pour Schema.org.
                            </p>
                            <Input
                                className="mt-2"
                                value={settings.organizationName}
                                onChange={(e) =>
                                    patch({ organizationName: e.target.value })
                                }
                                placeholder="GuestHoster"
                            />
                        </div>

                        <div>
                            <Label className="text-sm font-medium">
                                Type d’établissement (Schema.org)
                            </Label>
                            <p className="mt-0.5 text-xs text-zinc-500">
                                Type d’entité pour les robots de recherche.
                            </p>
                            <Select
                                className="mt-2"
                                value={settings.businessType}
                                onChange={(e) =>
                                    patch({
                                        businessType: e.target
                                            .value as PlatformSeoSettings['businessType'],
                                    })
                                }
                            >
                                <option value="LodgingBusiness">
                                    Hébergement touristique (LodgingBusiness)
                                </option>
                                <option value="RealEstateAgent">
                                    Agence immobilière / Conciergerie (RealEstateAgent)
                                </option>
                                <option value="LocalBusiness">
                                    Entreprise locale (LocalBusiness)
                                </option>
                                <option value="Organization">
                                    Organisation générale (Organization)
                                </option>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                        <div>
                            <Label className="text-sm font-medium">
                                Code pays (ISO 2 lettres)
                            </Label>
                            <p className="mt-0.5 text-xs text-zinc-500">
                                Ex: FR, BE, CH, ES.
                            </p>
                            <Input
                                className="mt-2 font-mono"
                                value={settings.storeCountry}
                                onChange={(e) =>
                                    patch({
                                        storeCountry: e.target.value.toUpperCase(),
                                    })
                                }
                                placeholder="FR"
                                maxLength={2}
                            />
                        </div>

                        <div>
                            <Label className="text-sm font-medium">
                                Ville / Localité (addressLocality)
                            </Label>
                            <p className="mt-0.5 text-xs text-zinc-500">
                                Ville du siège ou de référence.
                            </p>
                            <Input
                                className="mt-2"
                                value={settings.storeCity}
                                onChange={(e) =>
                                    patch({ storeCity: e.target.value })
                                }
                                placeholder="Paris"
                            />
                        </div>

                        <div>
                            <Label className="text-sm font-medium">
                                Code Postal (postalCode)
                            </Label>
                            <p className="mt-0.5 text-xs text-zinc-500">
                                Code postal officiel.
                            </p>
                            <Input
                                className="mt-2 font-mono"
                                value={settings.storePostalCode}
                                onChange={(e) =>
                                    patch({ storePostalCode: e.target.value })
                                }
                                placeholder="75001"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                        <div>
                            <Label className="text-sm font-medium">
                                Adresse postale (streetAddress)
                            </Label>
                            <p className="mt-0.5 text-xs text-zinc-500">
                                Numéro et nom de rue.
                            </p>
                            <Input
                                className="mt-2"
                                value={settings.storeStreetAddress}
                                onChange={(e) =>
                                    patch({ storeStreetAddress: e.target.value })
                                }
                                placeholder="12 rue de la Paix"
                            />
                        </div>

                        <div>
                            <Label className="text-sm font-medium">
                                Téléphone officiel (telephone)
                            </Label>
                            <p className="mt-0.5 text-xs text-zinc-500">
                                Affiché dans les fiches Google.
                            </p>
                            <Input
                                className="mt-2 font-mono"
                                value={settings.storePhone}
                                onChange={(e) =>
                                    patch({ storePhone: e.target.value })
                                }
                                placeholder="+33 1 23 45 67 89"
                            />
                        </div>

                        <div>
                            <Label className="text-sm font-medium">
                                Email officiel (email)
                            </Label>
                            <p className="mt-0.5 text-xs text-zinc-500">
                                Email de contact officiel.
                            </p>
                            <Input
                                className="mt-2"
                                value={settings.storeEmail}
                                onChange={(e) =>
                                    patch({ storeEmail: e.target.value })
                                }
                                placeholder="contact@guesthoster.com"
                            />
                        </div>
                    </div>

                    <div>
                        <Label className="text-sm font-medium">
                            Fourchette de prix (priceRange)
                        </Label>
                        <p className="mt-0.5 text-xs text-zinc-500">
                            Ex: €, €€, €€€ ou 50€ - 300€. Utilisé par Google pour les données structurées.
                        </p>
                        <Input
                            className="mt-2 max-w-xs font-mono"
                            value={settings.storePriceRange}
                            onChange={(e) =>
                                patch({ storePriceRange: e.target.value })
                            }
                            placeholder="€€"
                        />
                    </div>
                </div>
            </Card>

            {/* Section 5: Flux RSS & Attribution */}
            <Card className="p-6">
                <div className="mb-6 border-b border-zinc-100 pb-4 dark:border-zinc-800">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                        5. Flux RSS & Protection du Contenu (Style Lenaonline)
                    </h2>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        Ajoutez du contenu personnalisé d’attribution avant ou après chaque article ou publication dans votre flux RSS. Variables disponibles : <code>{'{post_link}'}</code> et <code>{'{blog_link}'}</code>.
                    </p>
                </div>

                <div className="space-y-6">
                    <div>
                        <Label className="text-sm font-medium">
                            Contenu avant l’article (RSS Before Content)
                        </Label>
                        <p className="mt-0.5 text-xs text-zinc-500">
                            Texte ou avertissement inséré en en-tête du flux.
                        </p>
                        <Textarea
                            rows={2}
                            className="mt-2"
                            value={settings.rssBeforeContent}
                            onChange={(e) =>
                                patch({ rssBeforeContent: e.target.value })
                            }
                            placeholder="Ex: Bienvenue sur notre sélection de logements d’exception..."
                        />
                    </div>

                    <div>
                        <Label className="text-sm font-medium">
                            Contenu après l’article (RSS After Content)
                        </Label>
                        <p className="mt-0.5 text-xs text-zinc-500">
                            Attribution d’auteur et lien de retour pour la protection contre le scraping.
                        </p>
                        <Textarea
                            rows={2}
                            className="mt-2"
                            value={settings.rssAfterContent}
                            onChange={(e) =>
                                patch({ rssAfterContent: e.target.value })
                            }
                            placeholder="Le bien {post_link} est publié en exclusivité sur {blog_link}."
                        />
                    </div>
                </div>
            </Card>

            {/* Bottom Actions */}
            <div className="flex items-center justify-end gap-3 border-t border-zinc-200 pt-6 dark:border-zinc-800">
                <Button type="submit" disabled={saving}>
                    {saving ? 'Enregistrement...' : 'Enregistrer les paramètres SEO'}
                </Button>
            </div>
        </form>
    );
}
