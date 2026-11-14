'use client';

import { useState } from 'react';
import { Button } from '@/components/button';
import { Badge } from '@/components/card';
import { Checkbox, Field, Input, Select, Textarea } from '@/components/form';
import { useActionFeedback } from '@/components/use-action-feedback';
import { createCustomPropertyTypeAction } from '@/lib/actions/host';
import {
    RENTAL_DURATION_OPTIONS,
    type RentalDuration,
} from '@/lib/domain/enums';
import { quoteLongTermUpfront } from '@/lib/domain/pricing';
import { CUSTOM_PROPERTY_TYPE_OPTION } from '@/lib/domain/property-schemas';
import { formatPrice, plural } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { HostFormOptions, HostProperty, Option } from '@/types';

type Errors = Partial<Record<string, string>>;

export type PropertyEditableFields = Pick<
    HostProperty,
    | 'rental_duration'
    | 'title'
    | 'property_type_id'
    | 'description'
    | 'city_id'
    | 'address'
    | 'postal_code'
    | 'latitude'
    | 'longitude'
    | 'max_guests'
    | 'bedrooms'
    | 'beds'
    | 'bathrooms'
    | 'amenities'
    | 'price_per_night'
    | 'cleaning_fee'
    | 'visit_fee'
    | 'min_nights'
    | 'max_nights'
    | 'monthly_rent'
    | 'security_deposit'
    | 'monthly_charges'
    | 'charges_included'
    | 'advance_rent_months'
    | 'min_lease_months'
    | 'check_in_time'
    | 'check_out_time'
    | 'cancellation_days'
    | 'booking_mode'
> & {
    managed_by_admin?: boolean;
    custom_property_type?: string;
    property_type_choice?: string;
};

export function PropertyDetailsFields({
    errors,
    types,
    property,
    onRentalDurationChange,
    onTypeAdded,
}: {
    errors: Errors;
    types: Option[];
    property?: Partial<PropertyEditableFields>;
    onRentalDurationChange?: (duration: RentalDuration) => void;
    onTypeAdded?: (option: Option) => void;
}) {
    const { pushToast } = useActionFeedback();
    const [addedTypes, setAddedTypes] = useState<Option[]>([]);
    const typeOptions = [
        ...types,
        ...addedTypes.filter(
            (added) => !types.some((existing) => existing.value === added.value),
        ),
    ];
    const initialDuration: RentalDuration =
        property?.rental_duration === 'long_term' ? 'long_term' : 'short_term';
    const [rentalDuration, setRentalDuration] =
        useState<RentalDuration>(initialDuration);
    const [selectedType, setSelectedType] = useState<string>(() => {
        if (property?.property_type_choice === CUSTOM_PROPERTY_TYPE_OPTION) {
            return CUSTOM_PROPERTY_TYPE_OPTION;
        }
        return property?.property_type_id
            ? String(property.property_type_id)
            : '';
    });
    const [customTypeName, setCustomTypeName] = useState<string>(
        property?.custom_property_type ?? '',
    );
    const [addingType, setAddingType] = useState(false);
    const [localCustomTypeError, setLocalCustomTypeError] = useState<
        string | undefined
    >(undefined);
    const customTypeError = localCustomTypeError ?? errors.custom_property_type;

    async function handleQuickAddType() {
        const clean = customTypeName.trim();
        if (clean.length < 2) {
            setLocalCustomTypeError(
                'Saisissez au moins 2 caractères pour le nouveau type.',
            );
            return;
        }
        setAddingType(true);
        setLocalCustomTypeError(undefined);
        try {
            const res = await createCustomPropertyTypeAction(clean);
            if (!res.ok) {
                setLocalCustomTypeError(
                    res.fieldErrors?.custom_property_type ??
                    res.error ??
                    'Impossible d’ajouter ce type.',
                );
                return;
            }
            if (res.data) {
                const newOption: Option = {
                    value: String(res.data.id),
                    label: res.data.name,
                };
                setAddedTypes((prev) =>
                    prev.some((o) => o.value === newOption.value)
                        ? prev
                        : [...prev, newOption],
                );
                setSelectedType(newOption.value);
                setCustomTypeName('');
                onTypeAdded?.(newOption);
                if (res.toast) {
                    pushToast(res.toast);
                }
            }
        } finally {
            setAddingType(false);
        }
    }

    return (
        <>
            <fieldset className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <legend className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        Formule de location
                    </legend>
                    <Badge tone={rentalDuration === 'long_term' ? 'secondary' : 'primary'}>
                        {rentalDuration === 'long_term' ? 'Bail d’habitation' : 'Séjour vacances'}
                    </Badge>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                    {RENTAL_DURATION_OPTIONS.map((option) => {
                        const isSelected = rentalDuration === option.value;
                        const isStandard = option.value === 'long_term';
                        return (
                            <label
                                key={option.value}
                                className={cn(
                                    'flex cursor-pointer gap-3 rounded-2xl border p-4.5 transition',
                                    isSelected
                                        ? isStandard
                                            ? 'border-secondary-500 bg-secondary-50/70 shadow-xs ring-1 ring-secondary-500/30 dark:border-secondary-600 dark:bg-secondary-950/40'
                                            : 'border-primary-500 bg-primary-50/70 shadow-xs ring-1 ring-primary-500/30 dark:border-primary-600 dark:bg-primary-950/40'
                                        : 'border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700',
                                )}
                            >
                                <input
                                    type="radio"
                                    name="rental_duration"
                                    value={option.value}
                                    checked={isSelected}
                                    onChange={() => {
                                        const next = option.value as RentalDuration;
                                        setRentalDuration(next);
                                        onRentalDurationChange?.(next);
                                    }}
                                    className="mt-1 accent-primary-600"
                                />
                                <span className="space-y-1">
                                    <span className="flex items-center gap-2">
                                        <span className="block font-semibold text-zinc-900 dark:text-zinc-100">
                                            {option.label}
                                        </span>
                                    </span>
                                    <span className="block text-xs text-zinc-600 dark:text-zinc-400">
                                        {isStandard
                                            ? 'Bail d’habitation meublé ou vide (1 an renouvelable, 3 ans...) : loyer mensuel, charges, caution et rendez-vous de visite.'
                                            : 'Location saisonnière touristique : tarif par nuit, calendrier de séjour, voyageurs et frais de ménage.'}
                                    </span>
                                </span>
                            </label>
                        );
                    })}
                </div>
            </fieldset>

            <Field
                label={
                    rentalDuration === 'long_term'
                        ? 'Titre de l’annonce immobilière'
                        : 'Titre de l’annonce'
                }
                htmlFor="title"
                error={errors.title}
                hint={
                    rentalDuration === 'long_term'
                        ? 'Entre 10 et 120 caractères, par exemple « Appartement T3 68m² avec balcon et parking - Centre-ville ».'
                        : 'Entre 10 et 120 caractères, par exemple « Appartement lumineux près du Vieux-Port ».'
                }
            >
                <Input
                    id="title"
                    name="title"
                    required
                    maxLength={120}
                    defaultValue={property?.title}
                    placeholder={
                        rentalDuration === 'long_term'
                            ? 'Ex. Appartement 3 pièces 72m² avec balcon et cave'
                            : 'Ex. Charmant studio avec terrasse vue mer'
                    }
                    aria-invalid={Boolean(errors.title)}
                />
            </Field>

            <div className="space-y-3">
                <Field
                    label="Type de bien"
                    htmlFor="property_type_id"
                    error={errors.property_type_id}
                    hint="Choisissez un type existant ou sélectionnez « Autre » pour en ajouter un durablement dans la base."
                >
                    <Select
                        id="property_type_id"
                        name="property_type_id"
                        required
                        value={selectedType}
                        onChange={(event) => {
                            setSelectedType(event.target.value);
                            setLocalCustomTypeError(undefined);
                        }}
                        aria-invalid={Boolean(errors.property_type_id)}
                    >
                        <option value="" disabled>
                            Choisir…
                        </option>
                        {typeOptions.map((type) => (
                            <option key={type.value} value={type.value}>
                                {type.label}
                            </option>
                        ))}
                        <option value={CUSTOM_PROPERTY_TYPE_OPTION}>
                            Autre (ajouter manuellement)…
                        </option>
                    </Select>
                </Field>

                {selectedType === CUSTOM_PROPERTY_TYPE_OPTION && (
                    <div className="rounded-xl border border-primary-200 bg-primary-50/40 p-4 dark:border-primary-900/60 dark:bg-primary-950/20">
                        <Field
                            label="Nouveau type de bien"
                            htmlFor="custom_property_type"
                            error={customTypeError}
                            hint="Ce type sera ajouté à la taxonomie du site pour les prochaines annonces et la recherche."
                        >
                            <div className="flex flex-col gap-2 sm:flex-row">
                                <Input
                                    id="custom_property_type"
                                    name="custom_property_type"
                                    value={customTypeName}
                                    onChange={(event) => {
                                        setCustomTypeName(event.target.value);
                                        setLocalCustomTypeError(undefined);
                                    }}
                                    maxLength={80}
                                    placeholder="Ex. Loft, Tiny house, Péniche…"
                                    aria-invalid={Boolean(customTypeError)}
                                />
                                <Button
                                    type="button"
                                    variant="secondary"
                                    loading={addingType}
                                    onClick={() => void handleQuickAddType()}
                                    className="shrink-0"
                                >
                                    Enregistrer le type
                                </Button>
                            </div>
                        </Field>
                    </div>
                )}
            </div>

            <Field
                label="Description"
                htmlFor="description"
                error={errors.description}
                hint="Au moins 80 caractères : présentez le bien, les pièces, le quartier et ses atouts."
            >
                <Textarea
                    id="description"
                    name="description"
                    rows={8}
                    required
                    maxLength={5000}
                    defaultValue={property?.description}
                    aria-invalid={Boolean(errors.description)}
                />
            </Field>
        </>
    );
}

export function LocationFields({
    errors,
    property,
    countries,
}: {
    errors: Errors;
    property: Pick<
        PropertyEditableFields,
        'city_id' | 'address' | 'postal_code' | 'latitude' | 'longitude'
    >;
    countries: HostFormOptions['countries'];
}) {
    return (
        <>
            <Field label="Ville" htmlFor="city_id" error={errors.city_id}>
                <Select
                    id="city_id"
                    name="city_id"
                    required
                    defaultValue={property.city_id ? String(property.city_id) : ''}
                    aria-invalid={Boolean(errors.city_id)}
                >
                    <option value="" disabled>
                        Choisir une ville…
                    </option>
                    {countries.map((country) => (
                        <optgroup key={country.name} label={country.name}>
                            {country.cities.map((city) => (
                                <option key={city.id} value={city.id}>
                                    {city.name}
                                </option>
                            ))}
                        </optgroup>
                    ))}
                </Select>
            </Field>
            <Field
                label="Adresse"
                htmlFor="address"
                error={errors.address}
                hint="Elle n’est communiquée au locataire ou voyageur qu’après confirmation."
            >
                <Input
                    id="address"
                    name="address"
                    required
                    autoComplete="street-address"
                    defaultValue={property.address ?? ''}
                    aria-invalid={Boolean(errors.address)}
                />
            </Field>
            <Field
                label="Code postal"
                htmlFor="postal_code"
                error={errors.postal_code}
            >
                <Input
                    id="postal_code"
                    name="postal_code"
                    autoComplete="postal-code"
                    className="max-w-40"
                    defaultValue={property.postal_code ?? ''}
                />
            </Field>
            <div className="grid gap-6 sm:grid-cols-2">
                <Field
                    label="Latitude"
                    htmlFor="latitude"
                    error={errors.latitude}
                    hint="Optionnel (entre -90 et 90), ex. 48.8566."
                >
                    <Input
                        id="latitude"
                        name="latitude"
                        type="number"
                        step="any"
                        min={-90}
                        max={90}
                        placeholder="ex. 48.8566"
                        defaultValue={property.latitude ?? ''}
                        aria-invalid={Boolean(errors.latitude)}
                    />
                </Field>
                <Field
                    label="Longitude"
                    htmlFor="longitude"
                    error={errors.longitude}
                    hint="Optionnel (entre -180 et 180), ex. 2.3522."
                >
                    <Input
                        id="longitude"
                        name="longitude"
                        type="number"
                        step="any"
                        min={-180}
                        max={180}
                        placeholder="ex. 2.3522"
                        defaultValue={property.longitude ?? ''}
                        aria-invalid={Boolean(errors.longitude)}
                    />
                </Field>
            </div>
        </>
    );
}

export function CapacityFields({
    errors,
    property,
}: {
    errors: Errors;
    property: Pick<
        PropertyEditableFields,
        'rental_duration' | 'max_guests' | 'bedrooms' | 'beds' | 'bathrooms'
    >;
}) {
    const isLongTerm = property.rental_duration === 'long_term';
    const [bedrooms, setBedrooms] = useState<number>(property.bedrooms ?? 1);
    const [bathrooms, setBathrooms] = useState<number>(property.bathrooms ?? 1);

    if (isLongTerm) {
        const derivedGuests = Math.max(1, (bedrooms || 1) * 2);
        const derivedBeds = Math.max(0, bedrooms || 0);

        return (
            <div className="space-y-6">
                <div className="rounded-2xl border border-secondary-200 bg-secondary-50/70 p-4 dark:border-secondary-900/60 dark:bg-secondary-950/30">
                    <div className="flex items-center gap-2">
                        <span className="flex size-6 items-center justify-center rounded-full bg-secondary-600 text-xs font-bold text-white shadow-xs">
                            ✓
                        </span>
                        <h3 className="text-sm font-semibold text-secondary-950 dark:text-secondary-100">
                            Configuration du logement (Bail d’habitation)
                        </h3>
                    </div>
                    <p className="mt-1.5 text-xs text-secondary-800 dark:text-secondary-300">
                        Pour une location standard, définissez l’agencement réel du bien en nombre de chambres et salles de bain. Les critères de vacanciers et de lits touristiques sont automatiquement masqués.
                    </p>
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                    <Field
                        label="Nombre de chambres"
                        htmlFor="bedrooms"
                        error={errors.bedrooms}
                        hint="Ex. 0 pour un studio, 1, 2, 3 ou plus pour un appartement ou une maison."
                    >
                        <Input
                            id="bedrooms"
                            name="bedrooms"
                            type="number"
                            required
                            min={0}
                            max={30}
                            value={bedrooms}
                            onChange={(e) =>
                                setBedrooms(Number(e.target.value) || 0)
                            }
                            aria-invalid={Boolean(errors.bedrooms)}
                        />
                    </Field>

                    <Field
                        label="Nombre de salles de bain / d’eau"
                        htmlFor="bathrooms"
                        error={errors.bathrooms}
                        hint="Salles de bain ou salles d’eau avec douche ou baignoire."
                    >
                        <Input
                            id="bathrooms"
                            name="bathrooms"
                            type="number"
                            required
                            min={1}
                            max={20}
                            value={bathrooms}
                            onChange={(e) =>
                                setBathrooms(
                                    Math.max(1, Number(e.target.value) || 1),
                                )
                            }
                            aria-invalid={Boolean(errors.bathrooms)}
                        />
                    </Field>
                </div>

                {/* Champs techniques automatiques pour respecter les contraintes de base sans encombrer l'utilisateur */}
                <input type="hidden" name="max_guests" value={derivedGuests} />
                <input type="hidden" name="beds" value={derivedBeds} />
            </div>
        );
    }

    const fields = [
        {
            name: 'max_guests',
            label: 'Voyageurs maximum',
            min: 1,
            max: 30,
        },
        { name: 'bedrooms', label: 'Chambres', min: 0, max: 30 },
        {
            name: 'beds',
            label: 'Lits',
            min: 1,
            max: 50,
        },
        { name: 'bathrooms', label: 'Salles de bain', min: 0, max: 20 },
    ] as const;

    return (
        <div className="grid gap-6 sm:grid-cols-2">
            {fields.map((field) => (
                <Field
                    key={field.name}
                    label={field.label}
                    htmlFor={field.name}
                    error={errors[field.name]}
                >
                    <Input
                        id={field.name}
                        name={field.name}
                        type="number"
                        required
                        min={field.min}
                        max={field.max}
                        defaultValue={property[field.name]}
                        aria-invalid={Boolean(errors[field.name])}
                    />
                </Field>
            ))}
        </div>
    );
}

export function AmenitiesFields({
    errors,
    property,
    amenities,
    isOptional = false,
}: {
    errors: Errors;
    property: Pick<PropertyEditableFields, 'amenities'>;
    amenities: HostFormOptions['amenities'];
    isOptional?: boolean;
}) {
    return (
        <div className="space-y-6">
            {isOptional && (
                <p className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
                    Case <strong>facultative</strong> : cochez uniquement les
                    équipements présents dans le bien, ou passez directement à
                    l’étape suivante.
                </p>
            )}
            <div className="grid gap-8 sm:grid-cols-2">
                {amenities.map((group) => (
                    <fieldset
                        key={group.category}
                        className="flex flex-col gap-2"
                    >
                        <legend className="mb-2 font-semibold">
                            {group.category}
                        </legend>
                        {group.items.map((amenity) => (
                            <label
                                key={amenity.id}
                                className="flex items-center gap-2 text-sm"
                            >
                                <Checkbox
                                    name="amenities[]"
                                    value={amenity.id}
                                    defaultChecked={property.amenities.includes(
                                        amenity.id,
                                    )}
                                />
                                {amenity.name}
                            </label>
                        ))}
                    </fieldset>
                ))}
                {errors.amenities && (
                    <p className="text-sm text-red-600 sm:col-span-2 dark:text-red-400">
                        {errors.amenities}
                    </p>
                )}
            </div>
        </div>
    );
}

export function PricingFields({
    errors,
    property,
    bookingModes,
}: {
    errors: Errors;
    property: Pick<
        PropertyEditableFields,
        | 'rental_duration'
        | 'price_per_night'
        | 'cleaning_fee'
        | 'visit_fee'
        | 'min_nights'
        | 'max_nights'
        | 'monthly_rent'
        | 'security_deposit'
        | 'monthly_charges'
        | 'charges_included'
        | 'advance_rent_months'
        | 'min_lease_months'
        | 'check_in_time'
        | 'check_out_time'
        | 'cancellation_days'
        | 'booking_mode'
    >;
    bookingModes: Option[];
}) {
    const isLongTerm = property.rental_duration === 'long_term';

    const [rentEuros, setRentEuros] = useState<string>(() =>
        property.monthly_rent > 0 ? String(property.monthly_rent / 100) : '',
    );
    const [depositEuros, setDepositEuros] = useState<string>(() =>
        property.security_deposit >= 0 && property.monthly_rent > 0
            ? String(property.security_deposit / 100)
            : '',
    );
    const [chargesIncluded, setChargesIncluded] = useState<boolean>(
        property.charges_included ?? true,
    );
    const [chargesEuros, setChargesEuros] = useState<string>(() =>
        property.monthly_charges > 0
            ? String(property.monthly_charges / 100)
            : '',
    );
    const [advanceMonths, setAdvanceMonths] = useState<string>(() =>
        String(Math.max(1, property.advance_rent_months || 1)),
    );
    const [minLeaseMonths, setMinLeaseMonths] = useState<string>(() =>
        String(Math.max(1, property.min_lease_months || 12)),
    );
    const [visitFeeEuros, setVisitFeeEuros] = useState<string>(() =>
        property.visit_fee && property.visit_fee > 0
            ? String(property.visit_fee / 100)
            : '0',
    );

    const parsedRentCents = Math.max(
        0,
        Math.round((Number(rentEuros) || 0) * 100),
    );
    const parsedDepositCents = Math.max(
        0,
        Math.round((Number(depositEuros) || 0) * 100),
    );
    const parsedChargesCents = Math.max(
        0,
        Math.round((Number(chargesEuros) || 0) * 100),
    );
    const parsedMonths = Math.max(
        1,
        Math.min(12, Math.trunc(Number(advanceMonths) || 1)),
    );

    const longTermPreview = quoteLongTermUpfront({
        monthlyRent: parsedRentCents,
        securityDeposit: parsedDepositCents,
        monthlyCharges: parsedChargesCents,
        chargesIncluded,
        advanceRentMonths: parsedMonths,
    });

    return (
        <>
            <input
                type="hidden"
                name="rental_duration"
                value={property.rental_duration ?? 'short_term'}
            />

            {isLongTerm ? (
                <div className="space-y-6">
                    <div className="rounded-2xl border border-secondary-200 bg-secondary-50/70 p-4 dark:border-secondary-900/60 dark:bg-secondary-950/30">
                        <div className="flex items-center gap-2">
                            <span className="flex size-6 items-center justify-center rounded-full bg-secondary-600 text-xs font-bold text-white shadow-xs">
                                ✓
                            </span>
                            <h3 className="text-sm font-semibold text-secondary-950 dark:text-secondary-100">
                                Loyer, Charges & Conditions du bail (Location standard)
                            </h3>
                        </div>
                        <p className="mt-1.5 text-xs text-secondary-800 dark:text-secondary-300">
                            Configurez les conditions financières du contrat de bail : loyer mensuel, répartition des charges, caution et organisation des visites.
                        </p>
                    </div>

                    <div className="grid gap-6 sm:grid-cols-2">
                        <Field
                            label="Loyer mensuel (€)"
                            htmlFor="monthly_rent"
                            error={errors.monthly_rent}
                            hint="Montant mensuel hors charges (ou tout compris si charges incluses)."
                        >
                            <Input
                                id="monthly_rent"
                                name="monthly_rent"
                                type="number"
                                required
                                min={50}
                                step="0.01"
                                value={rentEuros}
                                onChange={(e) => setRentEuros(e.target.value)}
                                aria-invalid={Boolean(errors.monthly_rent)}
                            />
                        </Field>

                        <Field
                            label="Mois de loyer d’avance à l’entrée"
                            htmlFor="advance_rent_months"
                            error={errors.advance_rent_months}
                            hint="Par défaut 1 mois (+ caution). Modifiable ex. 2 mois de loyer."
                        >
                            <div className="space-y-2">
                                <Input
                                    id="advance_rent_months"
                                    name="advance_rent_months"
                                    type="number"
                                    required
                                    min={1}
                                    max={12}
                                    value={advanceMonths}
                                    onChange={(e) =>
                                        setAdvanceMonths(e.target.value)
                                    }
                                    aria-invalid={Boolean(
                                        errors.advance_rent_months,
                                    )}
                                />
                                <div className="flex flex-wrap gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => setAdvanceMonths('1')}
                                        className={cn(
                                            'rounded-lg px-2 py-0.5 text-xs font-medium transition',
                                            advanceMonths === '1'
                                                ? 'bg-secondary-600 text-white'
                                                : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300',
                                        )}
                                    >
                                        1 mois
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setAdvanceMonths('2')}
                                        className={cn(
                                            'rounded-lg px-2 py-0.5 text-xs font-medium transition',
                                            advanceMonths === '2'
                                                ? 'bg-secondary-600 text-white'
                                                : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300',
                                        )}
                                    >
                                        2 mois
                                    </button>
                                </div>
                            </div>
                        </Field>

                        <Field
                            label="Durée minimale requise du bail (mois)"
                            htmlFor="min_lease_months"
                            error={errors.min_lease_months}
                            hint="Durée du contrat avant possibilité de renouvellement."
                        >
                            <div className="space-y-2">
                                <Input
                                    id="min_lease_months"
                                    name="min_lease_months"
                                    type="number"
                                    required
                                    min={1}
                                    max={120}
                                    value={minLeaseMonths}
                                    onChange={(e) =>
                                        setMinLeaseMonths(e.target.value)
                                    }
                                    aria-invalid={Boolean(errors.min_lease_months)}
                                />
                                <div className="flex flex-wrap gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => setMinLeaseMonths('12')}
                                        className={cn(
                                            'rounded-lg px-2 py-0.5 text-xs font-medium transition',
                                            minLeaseMonths === '12'
                                                ? 'bg-secondary-600 text-white'
                                                : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300',
                                        )}
                                    >
                                        1 an (12 mois)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setMinLeaseMonths('24')}
                                        className={cn(
                                            'rounded-lg px-2 py-0.5 text-xs font-medium transition',
                                            minLeaseMonths === '24'
                                                ? 'bg-secondary-600 text-white'
                                                : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300',
                                        )}
                                    >
                                        2 ans
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setMinLeaseMonths('36')}
                                        className={cn(
                                            'rounded-lg px-2 py-0.5 text-xs font-medium transition',
                                            minLeaseMonths === '36'
                                                ? 'bg-secondary-600 text-white'
                                                : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300',
                                        )}
                                    >
                                        3 ans (non meublé)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setMinLeaseMonths('9')}
                                        className={cn(
                                            'rounded-lg px-2 py-0.5 text-xs font-medium transition',
                                            minLeaseMonths === '9'
                                                ? 'bg-secondary-600 text-white'
                                                : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300',
                                        )}
                                    >
                                        9 mois (étudiant)
                                    </button>
                                </div>
                            </div>
                        </Field>

                        <Field
                            label="Caution / Dépôt de garantie (€)"
                            htmlFor="security_deposit"
                            error={errors.security_deposit}
                            hint="La caution est toujours calculée hors charges."
                        >
                            <div className="space-y-2">
                                <Input
                                    id="security_deposit"
                                    name="security_deposit"
                                    type="number"
                                    required
                                    min={0}
                                    step="0.01"
                                    value={depositEuros}
                                    onChange={(e) =>
                                        setDepositEuros(e.target.value)
                                    }
                                    aria-invalid={Boolean(errors.security_deposit)}
                                />
                                {Number(rentEuros) > 0 && (
                                    <div className="flex flex-wrap gap-1.5">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setDepositEuros(rentEuros)
                                            }
                                            className="rounded-lg bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
                                        >
                                            = 1 mois de loyer ({rentEuros} €)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setDepositEuros(
                                                    String(
                                                        Math.round(
                                                            Number(rentEuros) *
                                                            2 *
                                                            100,
                                                        ) / 100,
                                                    ),
                                                )
                                            }
                                            className="rounded-lg bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
                                        >
                                            = 2 mois de loyer (
                                            {Math.round(
                                                Number(rentEuros) * 2 * 100,
                                            ) / 100}{' '}
                                            €)
                                        </button>
                                    </div>
                                )}
                            </div>
                        </Field>

                        {!chargesIncluded && (
                            <Field
                                label="Charges mensuelles (€)"
                                htmlFor="monthly_charges"
                                error={errors.monthly_charges}
                                hint="Ajoutées au loyer à payer à l’entrée (hors caution)."
                            >
                                <Input
                                    id="monthly_charges"
                                    name="monthly_charges"
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    value={chargesEuros}
                                    onChange={(e) =>
                                        setChargesEuros(e.target.value)
                                    }
                                    aria-invalid={Boolean(
                                        errors.monthly_charges,
                                    )}
                                />
                            </Field>
                        )}
                        <Field
                            label="Forfait de réservation de visite (€)"
                            htmlFor="visit_fee"
                            error={errors.visit_fee}
                            hint="Montant forfaitaire demandé au candidat pour confirmer et bloquer son créneau de visite. Indiquez 0 € pour proposer des visites gratuites."
                        >
                            <Input
                                id="visit_fee"
                                name="visit_fee"
                                type="number"
                                min={0}
                                max={1000}
                                step="1"
                                value={visitFeeEuros}
                                onChange={(e) =>
                                    setVisitFeeEuros(e.target.value)
                                }
                                aria-invalid={Boolean(errors.visit_fee)}
                            />
                        </Field>
                    </div>

                    <fieldset className="flex flex-col gap-3">
                        <legend className="mb-1 text-sm font-medium">
                            Régime des charges locatives
                        </legend>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <label className="flex cursor-pointer gap-3 rounded-xl border border-zinc-200 p-4 has-checked:border-primary-500 has-checked:bg-primary-50 dark:border-zinc-700 dark:has-checked:bg-primary-950">
                                <input
                                    type="radio"
                                    name="charges_included"
                                    value="true"
                                    checked={chargesIncluded}
                                    onChange={() => setChargesIncluded(true)}
                                    className="mt-1 accent-primary-600"
                                />
                                <span>
                                    <span className="block font-medium">
                                        Charges comprises
                                    </span>
                                    <span className="text-xs text-zinc-600 dark:text-zinc-400">
                                        Total d’entrée = Loyer + Caution
                                    </span>
                                </span>
                            </label>
                            <label className="flex cursor-pointer gap-3 rounded-xl border border-zinc-200 p-4 has-checked:border-primary-500 has-checked:bg-primary-50 dark:border-zinc-700 dark:has-checked:bg-primary-950">
                                <input
                                    type="radio"
                                    name="charges_included"
                                    value="false"
                                    checked={!chargesIncluded}
                                    onChange={() => setChargesIncluded(false)}
                                    className="mt-1 accent-primary-600"
                                />
                                <span>
                                    <span className="block font-medium">
                                        Charges en sus
                                    </span>
                                    <span className="text-xs text-zinc-600 dark:text-zinc-400">
                                        Total d’entrée = Loyer + Provisions sur charges + Caution
                                    </span>
                                </span>
                            </label>
                        </div>
                    </fieldset>

                    <div className="rounded-xl border border-secondary-200 bg-secondary-50/70 p-4 dark:border-secondary-900 dark:bg-secondary-950/40">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <h3 className="text-sm font-semibold text-secondary-950 dark:text-secondary-100">
                                Aperçu du montant total à payer à l’entrée
                            </h3>
                            <Badge tone="secondary">
                                Calcul automatique du bail
                            </Badge>
                        </div>
                        <dl className="mt-3 space-y-1.5 text-sm">
                            <div className="flex justify-between gap-4">
                                <dt className="text-zinc-600 dark:text-zinc-400">
                                    Loyer ({plural(parsedMonths, 'mois')} ×{' '}
                                    {formatPrice(longTermPreview.monthly_rent)})
                                </dt>
                                <dd className="font-medium">
                                    {formatPrice(longTermPreview.upfront_rent)}
                                </dd>
                            </div>
                            <div className="flex justify-between gap-4">
                                <dt className="text-zinc-600 dark:text-zinc-400">
                                    Charges
                                </dt>
                                <dd className="font-medium">
                                    {chargesIncluded
                                        ? 'Charges comprises (0 €)'
                                        : formatPrice(
                                            longTermPreview.upfront_charges,
                                        )}
                                </dd>
                            </div>
                            <div className="flex justify-between gap-4">
                                <dt className="text-zinc-600 dark:text-zinc-400">
                                    Caution (toujours sans charges)
                                </dt>
                                <dd className="font-medium">
                                    {formatPrice(
                                        longTermPreview.security_deposit,
                                    )}
                                </dd>
                            </div>
                            <div className="flex justify-between gap-4 border-t border-secondary-200 pt-2 text-base font-bold text-secondary-900 dark:border-secondary-800 dark:text-secondary-100">
                                <dt>Total à payer à l’entrée</dt>
                                <dd>
                                    {formatPrice(longTermPreview.total_price)}
                                </dd>
                            </div>
                        </dl>
                    </div>

                    {/* Hidden inputs to guarantee consistent database schema for standard rental */}
                    <input type="hidden" name="price_per_night" value="0" />
                    <input type="hidden" name="cleaning_fee" value="0" />
                    <input type="hidden" name="min_nights" value="1" />
                    <input type="hidden" name="max_nights" value="" />
                    <input type="hidden" name="check_in_time" value="15:00" />
                    <input type="hidden" name="check_out_time" value="11:00" />
                    <input type="hidden" name="cancellation_days" value="7" />
                    <input type="hidden" name="booking_mode" value="request" />
                </div>
            ) : (
                <div className="grid gap-6 sm:grid-cols-2">
                    <Field
                        label="Prix par nuit (€)"
                        htmlFor="price_per_night"
                        error={errors.price_per_night}
                    >
                        <Input
                            id="price_per_night"
                            name="price_per_night"
                            type="number"
                            required
                            min={10}
                            step="0.01"
                            defaultValue={
                                property.price_per_night > 0
                                    ? property.price_per_night / 100
                                    : ''
                            }
                            aria-invalid={Boolean(errors.price_per_night)}
                        />
                    </Field>
                    <Field
                        label="Frais de ménage (€)"
                        htmlFor="cleaning_fee"
                        error={errors.cleaning_fee}
                        hint="Facturés une fois par séjour."
                    >
                        <Input
                            id="cleaning_fee"
                            name="cleaning_fee"
                            type="number"
                            min={0}
                            step="0.01"
                            defaultValue={property.cleaning_fee / 100}
                        />
                    </Field>
                    <Field
                        label="Nuits minimum"
                        htmlFor="min_nights"
                        error={errors.min_nights}
                    >
                        <Input
                            id="min_nights"
                            name="min_nights"
                            type="number"
                            required
                            min={1}
                            defaultValue={property.min_nights}
                        />
                    </Field>
                    <Field
                        label="Nuits maximum"
                        htmlFor="max_nights"
                        error={errors.max_nights}
                        hint="Laisser vide pour ne pas limiter."
                    >
                        <Input
                            id="max_nights"
                            name="max_nights"
                            type="number"
                            min={1}
                            defaultValue={property.max_nights ?? ''}
                        />
                    </Field>
                    <Field
                        label="Arrivée à partir de"
                        htmlFor="check_in_time"
                        error={errors.check_in_time}
                    >
                        <Input
                            id="check_in_time"
                            name="check_in_time"
                            type="time"
                            required
                            defaultValue={property.check_in_time}
                        />
                    </Field>
                    <Field
                        label="Départ avant"
                        htmlFor="check_out_time"
                        error={errors.check_out_time}
                    >
                        <Input
                            id="check_out_time"
                            name="check_out_time"
                            type="time"
                            required
                            defaultValue={property.check_out_time}
                        />
                    </Field>
                    <Field
                        label="Délai d’annulation gratuite"
                        htmlFor="cancellation_days"
                        error={errors.cancellation_days}
                        hint="Délai limite avant l'arrivée jusqu'auquel l'annulation sans frais est accordée (calculé dynamiquement sur la fiche du logement)."
                        className="sm:col-span-2"
                    >
                        <Select
                            id="cancellation_days"
                            name="cancellation_days"
                            defaultValue={String(property.cancellation_days ?? 7)}
                        >
                            <option value="1">1 jour (24h avant l’arrivée · Très flexible)</option>
                            <option value="2">2 jours (48h avant l’arrivée · Flexible)</option>
                            <option value="3">3 jours avant l’arrivée</option>
                            <option value="5">5 jours avant l’arrivée</option>
                            <option value="7">7 jours avant l’arrivée (1 semaine · Recommandé standard)</option>
                            <option value="14">14 jours avant l’arrivée (2 semaines · Modéré)</option>
                            <option value="30">30 jours avant l’arrivée (1 mois · Strict)</option>
                        </Select>
                    </Field>
                </div>
            )}

            <fieldset className="flex flex-col gap-3">
                <legend className="mb-1 text-sm font-medium">
                    Mode de réservation et de paiement
                </legend>
                {bookingModes.map((mode) => (
                    <label
                        key={mode.value}
                        className="flex cursor-pointer gap-3 rounded-xl border border-zinc-200 p-4 has-checked:border-primary-500 has-checked:bg-primary-50 dark:border-zinc-700 dark:has-checked:bg-primary-950"
                    >
                        <input
                            type="radio"
                            name="booking_mode"
                            value={mode.value}
                            defaultChecked={
                                property.booking_mode === mode.value
                            }
                            className="mt-1 accent-primary-600"
                        />
                        <span>
                            <span className="block font-medium">
                                {mode.label}
                            </span>
                            <span className="text-sm text-zinc-600 dark:text-zinc-400">
                                {mode.value === 'instant'
                                    ? isLongTerm
                                        ? 'Le locataire réserve sa date d’entrée et règle immédiatement le total en ligne.'
                                        : 'Les voyageurs réservent et paient directement, sans attendre votre accord.'
                                    : 'Vous acceptez ou refusez chaque demande avant que le paiement en ligne ne soit déclenché.'}
                            </span>
                        </span>
                    </label>
                ))}
                {errors.booking_mode && (
                    <p className="text-sm text-red-600 dark:text-red-400">
                        {errors.booking_mode}
                    </p>
                )}
            </fieldset>
        </>
    );
}
