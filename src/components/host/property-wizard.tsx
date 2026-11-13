'use client';

import Link from 'next/link';
import type { FormEvent } from 'react';
import { useRef, useState } from 'react';
import { Button, buttonClasses } from '@/components/button';
import { Badge, Card } from '@/components/card';
import { Alert, Field, Input, Select } from '@/components/form';
import { PhotoManager } from '@/components/host/photo-manager';
import {
    AmenitiesFields,
    CapacityFields,
    LocationFields,
    PricingFields,
    PropertyDetailsFields,
    type PropertyEditableFields,
} from '@/components/host/property-fields';
import { useActionFeedback } from '@/components/use-action-feedback';
import {
    finalizeWizardPropertyAction,
    saveWizardPropertyAction,
} from '@/lib/actions/host';
import { type FieldErrors, zodToFieldErrors } from '@/lib/actions/types';
import {
    BOOKING_MODE_LABELS,
    type BookingMode,
    RENTAL_DURATION_LABELS,
    type RentalDuration,
    USER_ROLE_LABELS,
} from '@/lib/domain/enums';
import { quoteLongTermUpfront } from '@/lib/domain/pricing';
import {
    adminOwnerSchema,
    amenitiesSchema,
    capacitySchema,
    CUSTOM_PROPERTY_TYPE_OPTION,
    DEFAULT_WIZARD_VALUES,
    detailsSchema,
    locationSchema,
    pricingSchema,
    type PropertyWizardDraftValues,
} from '@/lib/domain/property-schemas';
import { formatPrice, plural } from '@/lib/format';
import { cn } from '@/lib/utils';
import type {
    AdminOwnerOption,
    HostFormOptions,
    HostProperty,
    Option,
} from '@/types';

type WizardStepKey =
    | 'owner'
    | 'details'
    | 'location'
    | 'capacity'
    | 'amenities'
    | 'pricing'
    | 'photos';

type StepMeta = {
    key: WizardStepKey;
    label: string;
    description: string;
};

const ALL_WIZARD_STEPS: Record<WizardStepKey, StepMeta> = {
    owner: {
        key: 'owner',
        label: 'Propriétaire',
        description:
            'Attribuez ce logement à un compte existant ou créez un compte propriétaire, puis choisissez le mode de publication.',
    },
    details: {
        key: 'details',
        label: 'Description',
        description:
            'Renseignez le titre, le type de bien et une présentation détaillée pour les voyageurs.',
    },
    location: {
        key: 'location',
        label: 'Emplacement',
        description:
            'Indiquez la ville, l’adresse exacte et, si vous les avez, les coordonnées GPS.',
    },
    capacity: {
        key: 'capacity',
        label: 'Capacité',
        description:
            'Précisez la capacité d’accueil, les chambres, les lits et les salles de bain.',
    },
    amenities: {
        key: 'amenities',
        label: 'Équipements',
        description:
            'Sélectionnez tous les équipements disponibles dans le logement.',
    },
    pricing: {
        key: 'pricing',
        label: 'Tarifs & règles',
        description:
            'Définissez le prix par nuit, les frais de ménage, la durée de séjour, les horaires et le mode de réservation.',
    },
    photos: {
        key: 'photos',
        label: 'Photos & publication',
        description:
            'Ajoutez les photos du logement, vérifiez le récapitulatif et finalisez la création.',
    },
};

const FIELD_TO_STEP: Record<string, WizardStepKey> = {
    owner_mode: 'owner',
    owner_id: 'owner',
    owner_name: 'owner',
    owner_email: 'owner',
    owner_password: 'owner',
    initial_status: 'owner',
    rental_duration: 'details',
    title: 'details',
    property_type_id: 'details',
    custom_property_type: 'details',
    description: 'details',
    city_id: 'location',
    address: 'location',
    postal_code: 'location',
    latitude: 'location',
    longitude: 'location',
    max_guests: 'capacity',
    bedrooms: 'capacity',
    beds: 'capacity',
    bathrooms: 'capacity',
    amenities: 'amenities',
    price_per_night: 'pricing',
    cleaning_fee: 'pricing',
    visit_fee: 'pricing',
    min_nights: 'pricing',
    max_nights: 'pricing',
    monthly_rent: 'pricing',
    security_deposit: 'pricing',
    monthly_charges: 'pricing',
    charges_included: 'pricing',
    advance_rent_months: 'pricing',
    check_in_time: 'pricing',
    check_out_time: 'pricing',
    booking_mode: 'pricing',
    cancellation_days: 'pricing',
};

function draftToWizardValues(
    draft: HostProperty,
    fallbackOwnerId?: number,
): PropertyWizardDraftValues {
    return {
        ...DEFAULT_WIZARD_VALUES,
        owner_mode: 'existing',
        owner_id: String(draft.user_id ?? fallbackOwnerId ?? ''),
        initial_status:
            draft.status === 'published' || draft.status === 'pending'
                ? draft.status
                : 'draft',
        rental_duration: draft.rental_duration,
        title: draft.title,
        property_type_id: draft.property_type_id
            ? String(draft.property_type_id)
            : '',
        custom_property_type: '',
        description: draft.description,
        city_id: draft.city_id ? String(draft.city_id) : '',
        address: draft.address ?? '',
        postal_code: draft.postal_code ?? '',
        latitude: draft.latitude !== null ? String(draft.latitude) : '',
        longitude: draft.longitude !== null ? String(draft.longitude) : '',
        max_guests: draft.max_guests,
        bedrooms: draft.bedrooms,
        beds: draft.beds,
        bathrooms: draft.bathrooms,
        amenities: draft.amenities,
        price_per_night: draft.price_per_night,
        cleaning_fee: draft.cleaning_fee,
        visit_fee: draft.visit_fee ?? 0,
        min_nights: draft.min_nights,
        max_nights: draft.max_nights,
        monthly_rent: draft.monthly_rent,
        security_deposit: draft.security_deposit,
        monthly_charges: draft.monthly_charges,
        charges_included: draft.charges_included,
        advance_rent_months: draft.advance_rent_months,
        check_in_time: draft.check_in_time,
        check_out_time: draft.check_out_time,
        cancellation_days: draft.cancellation_days ?? 7,
        booking_mode:
            draft.booking_mode === 'instant' ? 'instant' : 'request',
    };
}

function toEditablePropertySlice(
    values: PropertyWizardDraftValues,
): PropertyEditableFields {
    const lat = values.latitude.trim();
    const lng = values.longitude.trim();

    return {
        rental_duration: values.rental_duration,
        title: values.title,
        property_type_id:
            values.property_type_id === CUSTOM_PROPERTY_TYPE_OPTION
                ? 0
                : Number(values.property_type_id) || 0,
        property_type_choice: values.property_type_id,
        custom_property_type: values.custom_property_type,
        description: values.description,
        city_id: Number(values.city_id) || null,
        address: values.address || null,
        postal_code: values.postal_code || null,
        latitude: lat !== '' && !Number.isNaN(Number(lat)) ? Number(lat) : null,
        longitude: lng !== '' && !Number.isNaN(Number(lng)) ? Number(lng) : null,
        max_guests: values.max_guests,
        bedrooms: values.bedrooms,
        beds: values.beds,
        bathrooms: values.bathrooms,
        amenities: values.amenities,
        price_per_night: values.price_per_night,
        cleaning_fee: values.cleaning_fee,
        visit_fee: values.visit_fee,
        min_nights: values.min_nights,
        max_nights: values.max_nights,
        monthly_rent: values.monthly_rent,
        security_deposit: values.security_deposit,
        monthly_charges: values.monthly_charges,
        charges_included: values.charges_included,
        advance_rent_months: values.advance_rent_months,
        check_in_time: values.check_in_time,
        check_out_time: values.check_out_time,
        cancellation_days: values.cancellation_days,
        managed_by_admin: false,
        booking_mode: values.booking_mode,
    };
}

function parseEurosToCents(raw: FormDataEntryValue | null, fallback = 0): number {
    const str = typeof raw === 'string' ? raw.trim() : '';
    if (str === '') {
        return fallback;
    }
    const parsed = Number(str);
    return Number.isFinite(parsed) ? Math.round(parsed * 100) : fallback;
}

function readStepValuesFromForm(
    step: WizardStepKey,
    form: HTMLFormElement,
    current: PropertyWizardDraftValues,
): PropertyWizardDraftValues {
    if (step === 'owner' || step === 'photos') {
        return current;
    }

    const fd = new FormData(form);

    switch (step) {
        case 'details': {
            const rawDuration = fd.get('rental_duration');
            const rentalDuration: RentalDuration =
                rawDuration === 'long_term' ? 'long_term' : 'short_term';
            return {
                ...current,
                rental_duration: rentalDuration,
                title: String(fd.get('title') ?? ''),
                property_type_id: String(fd.get('property_type_id') ?? ''),
                custom_property_type: String(
                    fd.get('custom_property_type') ?? '',
                ),
                description: String(fd.get('description') ?? ''),
            };
        }
        case 'location':
            return {
                ...current,
                city_id: String(fd.get('city_id') ?? ''),
                address: String(fd.get('address') ?? ''),
                postal_code: String(fd.get('postal_code') ?? ''),
                latitude: String(fd.get('latitude') ?? ''),
                longitude: String(fd.get('longitude') ?? ''),
            };
        case 'capacity':
            return {
                ...current,
                max_guests: Number(fd.get('max_guests') ?? current.max_guests),
                bedrooms: Number(fd.get('bedrooms') ?? current.bedrooms),
                beds: Number(fd.get('beds') ?? current.beds),
                bathrooms: Number(fd.get('bathrooms') ?? current.bathrooms),
            };
        case 'amenities':
            return {
                ...current,
                amenities: fd
                    .getAll('amenities[]')
                    .map((val) => Number(val))
                    .filter((num) => Number.isInteger(num) && num > 0),
            };
        case 'pricing': {
            if (current.rental_duration === 'long_term') {
                const rawChargesMode = fd.get('charges_included');
                const chargesIncluded = rawChargesMode !== 'false';
                const rawMonths = Number(
                    fd.get('advance_rent_months') ??
                        current.advance_rent_months,
                );
                return {
                    ...current,
                    monthly_rent: parseEurosToCents(fd.get('monthly_rent'), 0),
                    security_deposit: parseEurosToCents(
                        fd.get('security_deposit'),
                        0,
                    ),
                    charges_included: chargesIncluded,
                    visit_fee: parseEurosToCents(fd.get('visit_fee'), 0),
                    monthly_charges: chargesIncluded
                        ? 0
                        : parseEurosToCents(fd.get('monthly_charges'), 0),
                    advance_rent_months:
                        Number.isFinite(rawMonths) && rawMonths >= 1
                            ? Math.trunc(rawMonths)
                            : 1,
                    booking_mode:
                        fd.get('booking_mode') === 'instant'
                            ? 'instant'
                            : 'request',
                };
            }

            const rawMaxNights = String(fd.get('max_nights') ?? '').trim();
            return {
                ...current,
                price_per_night: parseEurosToCents(
                    fd.get('price_per_night'),
                    0,
                ),
                cleaning_fee: parseEurosToCents(fd.get('cleaning_fee'), 0),
                min_nights: Number(fd.get('min_nights') ?? current.min_nights),
                max_nights:
                    rawMaxNights !== '' && Number.isFinite(Number(rawMaxNights))
                        ? Number(rawMaxNights)
                        : null,
                check_in_time: String(
                    fd.get('check_in_time') ?? current.check_in_time,
                ),
                check_out_time: String(
                    fd.get('check_out_time') ?? current.check_out_time,
                ),
                cancellation_days: Number(
                    fd.get('cancellation_days') ?? current.cancellation_days ?? 7,
                ),
                booking_mode:
                    fd.get('booking_mode') === 'instant'
                        ? 'instant'
                        : 'request',
            };
        }
    }
}

function validateStep(
    step: WizardStepKey,
    values: PropertyWizardDraftValues,
    form: HTMLFormElement | null,
): FieldErrors | null {
    if (step === 'owner') {
        const res = adminOwnerSchema.safeParse({
            owner_mode: values.owner_mode,
            owner_id: values.owner_id,
            owner_name: values.owner_name,
            owner_email: values.owner_email,
            owner_password: values.owner_password,
            initial_status: values.initial_status,
        });
        return res.success ? null : zodToFieldErrors(res.error);
    }

    if (step === 'photos') {
        return null;
    }

    const fd = form ? new FormData(form) : null;
    const getStr = (key: string, fallback: unknown = ''): string => {
        if (!fd) {
            return typeof fallback === 'string'
                ? fallback
                : fallback == null
                  ? ''
                  : String(fallback);
        }
        const v = fd.get(key);
        return typeof v === 'string' ? v : '';
    };

    switch (step) {
        case 'details': {
            const res = detailsSchema.safeParse({
                rental_duration: getStr(
                    'rental_duration',
                    values.rental_duration,
                ),
                title: getStr('title', values.title),
                property_type_id: getStr(
                    'property_type_id',
                    values.property_type_id,
                ),
                custom_property_type: getStr(
                    'custom_property_type',
                    values.custom_property_type,
                ),
                description: getStr('description', values.description),
            });
            return res.success ? null : zodToFieldErrors(res.error);
        }
        case 'location': {
            const res = locationSchema.safeParse({
                city_id: fd ? fd.get('city_id') : values.city_id,
                address: getStr('address', values.address),
                postal_code: getStr('postal_code', values.postal_code),
                latitude: fd ? fd.get('latitude') : values.latitude,
                longitude: fd ? fd.get('longitude') : values.longitude,
            });
            return res.success ? null : zodToFieldErrors(res.error);
        }
        case 'capacity': {
            const res = capacitySchema.safeParse({
                max_guests: fd ? fd.get('max_guests') : values.max_guests,
                bedrooms: fd ? fd.get('bedrooms') : values.bedrooms,
                beds: fd ? fd.get('beds') : values.beds,
                bathrooms: fd ? fd.get('bathrooms') : values.bathrooms,
            });
            return res.success ? null : zodToFieldErrors(res.error);
        }
        case 'amenities': {
            const res = amenitiesSchema.safeParse({
                amenities: fd
                    ? fd.getAll('amenities[]').map((v) => Number(v))
                    : values.amenities,
            });
            return res.success ? null : zodToFieldErrors(res.error);
        }
        case 'pricing': {
            const res = pricingSchema.safeParse({
                rental_duration: getStr(
                    'rental_duration',
                    values.rental_duration,
                ) || values.rental_duration,
                price_per_night: fd
                    ? fd.get('price_per_night')
                    : values.price_per_night > 0
                      ? values.price_per_night / 100
                      : '',
                cleaning_fee: fd
                    ? fd.get('cleaning_fee')
                    : values.cleaning_fee / 100,
                visit_fee: fd
                    ? fd.get('visit_fee')
                    : values.visit_fee / 100,
                min_nights: fd ? fd.get('min_nights') : values.min_nights,
                max_nights: fd ? fd.get('max_nights') : values.max_nights,
                monthly_rent: fd
                    ? fd.get('monthly_rent')
                    : values.monthly_rent > 0
                      ? values.monthly_rent / 100
                      : '',
                security_deposit: fd
                    ? fd.get('security_deposit')
                    : values.security_deposit / 100,
                monthly_charges: fd
                    ? fd.get('monthly_charges')
                    : values.monthly_charges / 100,
                charges_included: fd
                    ? fd.get('charges_included')
                    : values.charges_included,
                advance_rent_months: fd
                    ? fd.get('advance_rent_months')
                    : values.advance_rent_months,
                check_in_time: fd
                    ? (fd.get('check_in_time') ?? values.check_in_time)
                    : values.check_in_time,
                check_out_time: fd
                    ? (fd.get('check_out_time') ?? values.check_out_time)
                    : values.check_out_time,
                cancellation_days: fd
                    ? Number(fd.get('cancellation_days') ?? values.cancellation_days)
                    : values.cancellation_days,
                booking_mode: getStr('booking_mode', values.booking_mode),
            });
            return res.success ? null : zodToFieldErrors(res.error);
        }
    }
}

export function PropertyWizard({
    mode,
    options,
    owners = [],
    currentUserId,
    initialDraft = null,
    defaultOwnerId = null,
}: {
    mode: 'host' | 'admin';
    options: HostFormOptions;
    owners?: AdminOwnerOption[];
    currentUserId?: number;
    initialDraft?: HostProperty | null;
    defaultOwnerId?: number | null;
}) {
    const { applyResult, pushToast } = useActionFeedback();
    const formRef = useRef<HTMLFormElement | null>(null);

    const stepKeys: WizardStepKey[] =
        mode === 'admin'
            ? [
                  'owner',
                  'details',
                  'location',
                  'capacity',
                  'amenities',
                  'pricing',
                  'photos',
              ]
            : [
                  'details',
                  'location',
                  'capacity',
                  'amenities',
                  'pricing',
                  'photos',
              ];

    const [values, setValues] = useState<PropertyWizardDraftValues>(() =>
        initialDraft
            ? draftToWizardValues(initialDraft, currentUserId)
            : {
                  ...DEFAULT_WIZARD_VALUES,
                  owner_id:
                      defaultOwnerId != null
                          ? String(defaultOwnerId)
                          : DEFAULT_WIZARD_VALUES.owner_id,
                  initial_status: mode === 'admin' ? 'published' : 'draft',
              },
    );
    const [ownerList, setOwnerList] = useState<AdminOwnerOption[]>(owners);
    const [typeOptions, setTypeOptions] = useState<Option[]>(options.types);
    const [ownerSearch, setOwnerSearch] = useState('');
    const [createdProperty, setCreatedProperty] = useState<HostProperty | null>(
        initialDraft,
    );
    const [currentStep, setCurrentStep] = useState<WizardStepKey>(() =>
        initialDraft ? 'photos' : stepKeys[0]!,
    );
    const [highestVisitedIndex, setHighestVisitedIndex] = useState<number>(
        initialDraft ? stepKeys.length - 1 : 0,
    );
    const [errors, setErrors] = useState<FieldErrors>({});
    const [generalError, setGeneralError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [finalizing, setFinalizing] = useState(false);

    const currentIndex = stepKeys.indexOf(currentStep);
    const stepMeta = ALL_WIZARD_STEPS[currentStep];
    const editableSlice = toEditablePropertySlice(values);

    const filteredOwners = ownerSearch.trim()
        ? ownerList.filter((owner) => {
              const q = ownerSearch.trim().toLowerCase();
              return (
                  owner.name.toLowerCase().includes(q) ||
                  owner.email.toLowerCase().includes(q)
              );
          })
        : ownerList;

    const selectedOwner = ownerList.find(
        (owner) => String(owner.id) === values.owner_id,
    );
    const selectedCityName =
        options.countries
            .flatMap((c) => c.cities.map((city) => `${city.name} (${c.name})`))
            .find((_, index) => {
                const flatCities = options.countries.flatMap((c) => c.cities);
                return String(flatCities[index]?.id) === values.city_id;
            }) ?? 'Non renseignée';

    const canSubmitPhotosRequirement =
        !options.cloudinaryDirectUpload ||
        (createdProperty?.images.filter((i) => i.is_processed).length ?? 0) >=
            options.minPhotos;

    async function persistDraftBeforePhotos(
        nextValues: PropertyWizardDraftValues,
    ): Promise<boolean> {
        setSaving(true);
        setGeneralError(null);
        setErrors({});

        try {
            const res = await saveWizardPropertyAction({
                mode,
                draftSlug: createdProperty?.slug ?? null,
                owner:
                    mode === 'admin'
                        ? {
                              owner_mode: nextValues.owner_mode,
                              owner_id: nextValues.owner_id,
                              owner_name: nextValues.owner_name,
                              owner_email: nextValues.owner_email,
                              owner_password: nextValues.owner_password,
                              initial_status: nextValues.initial_status,
                          }
                        : undefined,
                values: {
                    rental_duration: nextValues.rental_duration,
                    title: nextValues.title,
                    property_type_id: nextValues.property_type_id,
                    custom_property_type: nextValues.custom_property_type,
                    description: nextValues.description,
                    city_id: nextValues.city_id,
                    address: nextValues.address,
                    postal_code: nextValues.postal_code,
                    latitude: nextValues.latitude,
                    longitude: nextValues.longitude,
                    max_guests: nextValues.max_guests,
                    bedrooms: nextValues.bedrooms,
                    beds: nextValues.beds,
                    bathrooms: nextValues.bathrooms,
                    amenities: nextValues.amenities,
                    price_per_night:
                        nextValues.price_per_night > 0
                            ? nextValues.price_per_night / 100
                            : '',
                    cleaning_fee: nextValues.cleaning_fee / 100,
                    visit_fee: nextValues.visit_fee / 100,
                    min_nights: nextValues.min_nights,
                    max_nights: nextValues.max_nights ?? '',
                    monthly_rent:
                        nextValues.monthly_rent > 0
                            ? nextValues.monthly_rent / 100
                            : '',
                    security_deposit: nextValues.security_deposit / 100,
                    monthly_charges: nextValues.monthly_charges / 100,
                    charges_included: nextValues.charges_included,
                    advance_rent_months: nextValues.advance_rent_months,
                    check_in_time: nextValues.check_in_time,
                    check_out_time: nextValues.check_out_time,
                    cancellation_days: nextValues.cancellation_days,
                    booking_mode: nextValues.booking_mode,
                },
            });

            if (!res.ok) {
                if (res.fieldErrors) {
                    setErrors(res.fieldErrors);
                    const firstField = Object.keys(res.fieldErrors)[0];
                    const targetStep = firstField
                        ? FIELD_TO_STEP[firstField]
                        : undefined;
                    if (targetStep) {
                        setCurrentStep(targetStep);
                    }
                }
                if (res.error) {
                    setGeneralError(res.error);
                }
                return false;
            }

            if (res.data) {
                const { slug, property, ownerId } = res.data;
                setCreatedProperty(property);
                setValues((prev) => ({
                    ...prev,
                    property_type_id: String(property.property_type_id),
                    custom_property_type: '',
                }));

                if (
                    mode === 'admin' &&
                    nextValues.owner_mode === 'new' &&
                    !ownerList.some((o) => o.id === ownerId)
                ) {
                    setOwnerList((prev) => [
                        {
                            id: ownerId,
                            name: nextValues.owner_name,
                            email: nextValues.owner_email,
                            role: 'host',
                        },
                        ...prev,
                    ]);
                    setValues((prev) => ({
                        ...prev,
                        owner_mode: 'existing',
                        owner_id: String(ownerId),
                        owner_name: '',
                        owner_email: '',
                        owner_password: '',
                    }));
                }

                const baseUrl =
                    mode === 'admin'
                        ? '/admin/logements/nouveau'
                        : '/hote/logements/nouveau';
                if (typeof window !== 'undefined') {
                    window.history.replaceState(
                        null,
                        '',
                        `${baseUrl}?draft=${encodeURIComponent(slug)}`,
                    );
                }

                pushToast({
                    type: 'success',
                    message: createdProperty
                        ? 'Informations du logement mises à jour.'
                        : 'Logement enregistré ! Ajoutez maintenant vos photos.',
                });
            }

            return true;
        } finally {
            setSaving(false);
        }
    }

    async function goToStep(targetIndex: number) {
        const targetKey = stepKeys[targetIndex];
        if (!targetKey || saving || finalizing) {
            return;
        }

        const nextValues = formRef.current
            ? readStepValuesFromForm(currentStep, formRef.current, values)
            : values;

        // Going backwards doesn't force validation of an incomplete future step, just saves typed state
        if (targetIndex < currentIndex) {
            setValues(nextValues);
            setErrors({});
            setGeneralError(null);
            setCurrentStep(targetKey);
            return;
        }

        // Going forward: validate step cleanly
        const stepErrors = validateStep(
            currentStep,
            nextValues,
            formRef.current,
        );
        if (stepErrors && Object.keys(stepErrors).length > 0) {
            const firstError = Object.values(stepErrors).find(
                (msg) => typeof msg === 'string' && msg.trim() !== '',
            );
            setErrors(stepErrors);
            setGeneralError(
                firstError
                    ? `Impossible de passer à l’étape suivante : ${firstError}`
                    : 'Veuillez corriger les champs signalés avant de continuer.',
            );
            requestAnimationFrame(() => {
                const formEl = formRef.current;
                if (!formEl) {
                    return;
                }
                const invalidEl = formEl.querySelector<HTMLElement>(
                    '[aria-invalid="true"]',
                );
                if (invalidEl) {
                    invalidEl.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center',
                    });
                    invalidEl.focus?.();
                    return;
                }
                formEl
                    .querySelector<HTMLElement>('[role="alert"]')
                    ?.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center',
                    });
            });
            return;
        }

        setValues(nextValues);
        setErrors({});
        setGeneralError(null);

        if (targetKey === 'photos') {
            // Ensure all prior steps pass validation before saving to DB
            for (const stepKey of stepKeys.slice(0, targetIndex)) {
                const priorErrors = validateStep(stepKey, nextValues, null);
                if (priorErrors && Object.keys(priorErrors).length > 0) {
                    setErrors(priorErrors);
                    setCurrentStep(stepKey);
                    return;
                }
            }
            const ok = await persistDraftBeforePhotos(nextValues);
            if (!ok) {
                return;
            }
        }

        setHighestVisitedIndex((prev) => Math.max(prev, targetIndex));
        setCurrentStep(targetKey);
    }

    async function handleStepSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (currentIndex < stepKeys.length - 1) {
            await goToStep(currentIndex + 1);
        }
    }

    async function handleFinalize(
        targetStatus: 'draft' | 'pending' | 'published',
    ) {
        if (!createdProperty) {
            return;
        }
        setFinalizing(true);
        setGeneralError(null);
        try {
            const res = await finalizeWizardPropertyAction({
                slug: createdProperty.slug,
                targetStatus,
                isAdminContext: mode === 'admin',
            });
            if (!res.ok && res.error) {
                setGeneralError(res.error);
            }
            applyResult(res);
        } finally {
            setFinalizing(false);
        }
    }

    const cancelHref = mode === 'admin' ? '/admin/logements' : '/hote';

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-xs font-semibold tracking-wider text-primary-600 uppercase dark:text-primary-400">
                        Étape {currentIndex + 1} sur {stepKeys.length}
                    </p>
                    <h1 className="mt-1 text-2xl font-bold tracking-tight">
                        {mode === 'admin'
                            ? 'Créer un logement (Administration)'
                            : 'Créer un nouveau logement'}
                    </h1>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                        Remplissez l’ensemble du bien en un flux guidé continu :
                        {mode === 'admin'
                            ? ' attribution au propriétaire, caractéristiques complètes, tarifs et photos.'
                            : ' description, localisation GPS, capacité, équipements, tarifs et photos.'}
                    </p>
                </div>
                <Link
                    href={cancelHref}
                    className={buttonClasses({ variant: 'outline', size: 'sm' })}
                >
                    Retour à la liste
                </Link>
            </div>

            {/* Guided step progress bar */}
            <Card className="p-3 sm:p-4">
                <ol
                    aria-label="Progression de la création"
                    className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-7"
                >
                    {stepKeys.map((key, index) => {
                        const meta = ALL_WIZARD_STEPS[key];
                        const isActive = key === currentStep;
                        const isDone =
                            index < currentIndex ||
                            (key === 'photos' &&
                                (createdProperty?.images.length ?? 0) >=
                                    options.minPhotos);
                        const canJump =
                            index <= highestVisitedIndex ||
                            index === currentIndex + 1;

                        return (
                            <li key={key}>
                                <button
                                    type="button"
                                    disabled={!canJump || saving || finalizing}
                                    onClick={() => void goToStep(index)}
                                    aria-current={isActive ? 'step' : undefined}
                                    className={cn(
                                        'flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs font-medium transition-colors',
                                        isActive
                                            ? 'bg-primary-50 text-primary-700 ring-1 ring-primary-500/40 dark:bg-primary-950/60 dark:text-primary-300'
                                            : isDone
                                              ? 'bg-emerald-50/70 text-emerald-800 hover:bg-emerald-100/70 dark:bg-emerald-950/30 dark:text-emerald-300'
                                              : canJump
                                                ? 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800'
                                                : 'cursor-not-allowed text-zinc-400 opacity-60 dark:text-zinc-600',
                                    )}
                                >
                                    <span
                                        className={cn(
                                            'flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
                                            isActive
                                                ? 'bg-primary-600 text-white'
                                                : isDone
                                                  ? 'bg-emerald-600 text-white'
                                                  : 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
                                        )}
                                    >
                                        {isDone && !isActive ? '✓' : index + 1}
                                    </span>
                                    <span className="truncate">
                                        {meta.label}
                                    </span>
                                </button>
                            </li>
                        );
                    })}
                </ol>
            </Card>

            {generalError && <Alert tone="warning">{generalError}</Alert>}

            <Card className="p-6">
                <div className="border-b border-zinc-200 pb-4 dark:border-zinc-800">
                    <h2 className="text-lg font-semibold">{stepMeta.label}</h2>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                        {stepMeta.description}
                    </p>
                </div>

                {currentStep === 'photos' && createdProperty ? (
                    <div className="mt-6 space-y-6">
                        {/* Recap card so owner/admin sees all entered details at a glance */}
                        <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                        {createdProperty.title}
                                    </p>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                        {selectedCityName}
                                        {createdProperty.address
                                            ? ` · ${createdProperty.address}`
                                            : ''}
                                        {createdProperty.latitude !== null &&
                                        createdProperty.longitude !== null
                                            ? ` · GPS ${createdProperty.latitude}, ${createdProperty.longitude}`
                                            : ''}
                                    </p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    {mode === 'admin' && selectedOwner && (
                                        <Badge tone="secondary">
                                            Propriétaire : {selectedOwner.name}
                                        </Badge>
                                    )}
                                    <Badge tone="neutral">
                                        {RENTAL_DURATION_LABELS[
                                            createdProperty.rental_duration
                                        ] ?? createdProperty.rental_duration}
                                    </Badge>
                                    {createdProperty.rental_duration ===
                                    'long_term' ? (
                                        <Badge tone="primary">
                                            {formatPrice(
                                                createdProperty.monthly_rent,
                                            )}{' '}
                                            / mois · Total entrée{' '}
                                            {formatPrice(
                                                quoteLongTermUpfront({
                                                    monthlyRent:
                                                        createdProperty.monthly_rent,
                                                    securityDeposit:
                                                        createdProperty.security_deposit,
                                                    monthlyCharges:
                                                        createdProperty.monthly_charges,
                                                    chargesIncluded:
                                                        createdProperty.charges_included,
                                                    advanceRentMonths:
                                                        createdProperty.advance_rent_months,
                                                }).total_price,
                                            )}
                                        </Badge>
                                    ) : (
                                        <Badge tone="primary">
                                            {formatPrice(
                                                createdProperty.price_per_night,
                                            )}{' '}
                                            / nuit
                                        </Badge>
                                    )}
                                </div>
                            </div>
                            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                                {createdProperty.rental_duration === 'long_term'
                                    ? `${plural(createdProperty.bedrooms, 'chambre')} · Caution ${formatPrice(createdProperty.security_deposit)} (${createdProperty.charges_included ? 'charges comprises' : `charges ${formatPrice(createdProperty.monthly_charges)}/mois`}) · ${BOOKING_MODE_LABELS[createdProperty.booking_mode as BookingMode] ?? createdProperty.booking_mode}`
                                    : `${plural(createdProperty.max_guests, 'voyageur')} · ${plural(createdProperty.bedrooms, 'chambre')} · ${plural(createdProperty.beds, 'lit')} · ${plural(createdProperty.amenities.length, 'équipement')} · ${BOOKING_MODE_LABELS[createdProperty.booking_mode as BookingMode] ?? createdProperty.booking_mode} · Arrivée ${createdProperty.check_in_time} / Départ ${createdProperty.check_out_time}`}
                            </p>
                        </div>

                        <PhotoManager
                            property={createdProperty}
                            minPhotos={options.minPhotos}
                            maxPhotos={options.maxPhotos}
                            cloudinaryDirectUpload={
                                options.cloudinaryDirectUpload
                            }
                            onImagesChange={(images) =>
                                setCreatedProperty((prev) =>
                                    prev ? { ...prev, images } : prev,
                                )
                            }
                        />

                        <div className="flex flex-col gap-3 border-t border-zinc-200 pt-6 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800">
                            <Button
                                variant="outline"
                                disabled={finalizing}
                                onClick={() => void goToStep(currentIndex - 1)}
                            >
                                ← Modifier les informations
                            </Button>

                            <div className="flex flex-wrap items-center gap-2">
                                <Button
                                    variant="outline"
                                    loading={finalizing}
                                    onClick={() => void handleFinalize('draft')}
                                >
                                    Enregistrer en brouillon
                                </Button>

                                {mode === 'admin' ? (
                                    <>
                                        {values.initial_status === 'pending' && (
                                            <Button
                                                variant="secondary"
                                                loading={finalizing}
                                                onClick={() =>
                                                    void handleFinalize(
                                                        'pending',
                                                    )
                                                }
                                            >
                                                Mettre en validation
                                            </Button>
                                        )}
                                        <Button
                                            variant="primary"
                                            loading={finalizing}
                                            disabled={!canSubmitPhotosRequirement}
                                            title={
                                                canSubmitPhotosRequirement
                                                    ? undefined
                                                    : `Ajoutez au moins ${options.minPhotos} photos pour publier.`
                                            }
                                            onClick={() =>
                                                void handleFinalize('published')
                                            }
                                        >
                                            Publier le logement
                                        </Button>
                                    </>
                                ) : (
                                    <Button
                                        variant="primary"
                                        loading={finalizing}
                                        disabled={!canSubmitPhotosRequirement}
                                        title={
                                            canSubmitPhotosRequirement
                                                ? undefined
                                                : `Ajoutez au moins ${options.minPhotos} photos pour soumettre.`
                                        }
                                        onClick={() =>
                                            void handleFinalize('pending')
                                        }
                                    >
                                        Soumettre pour validation
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <form
                        ref={formRef}
                        key={currentStep}
                        onSubmit={(event) => void handleStepSubmit(event)}
                        noValidate
                        className="mt-6 flex flex-col gap-6"
                    >
                        {currentStep === 'owner' && (
                            <div className="space-y-6">
                                <fieldset className="grid gap-3 sm:grid-cols-2">
                                    <legend className="mb-1 text-sm font-medium">
                                        Attribution du bien
                                    </legend>
                                    <label
                                        className={cn(
                                            'flex cursor-pointer gap-3 rounded-xl border p-4 transition-colors',
                                            values.owner_mode === 'existing'
                                                ? 'border-primary-500 bg-primary-50/70 dark:bg-primary-950/40'
                                                : 'border-zinc-200 dark:border-zinc-700',
                                        )}
                                    >
                                        <input
                                            type="radio"
                                            name="owner_mode"
                                            value="existing"
                                            checked={
                                                values.owner_mode === 'existing'
                                            }
                                            onChange={() =>
                                                setValues((prev) => ({
                                                    ...prev,
                                                    owner_mode: 'existing',
                                                }))
                                            }
                                            className="mt-1 accent-primary-600"
                                        />
                                        <span>
                                            <span className="block font-medium">
                                                Compte existant
                                            </span>
                                            <span className="text-xs text-zinc-600 dark:text-zinc-400">
                                                Sélectionnez un hôte ou un client
                                                existant (sera promu hôte si
                                                besoin).
                                            </span>
                                        </span>
                                    </label>

                                    <label
                                        className={cn(
                                            'flex cursor-pointer gap-3 rounded-xl border p-4 transition-colors',
                                            values.owner_mode === 'new'
                                                ? 'border-primary-500 bg-primary-50/70 dark:bg-primary-950/40'
                                                : 'border-zinc-200 dark:border-zinc-700',
                                        )}
                                    >
                                        <input
                                            type="radio"
                                            name="owner_mode"
                                            value="new"
                                            checked={values.owner_mode === 'new'}
                                            onChange={() =>
                                                setValues((prev) => ({
                                                    ...prev,
                                                    owner_mode: 'new',
                                                }))
                                            }
                                            className="mt-1 accent-primary-600"
                                        />
                                        <span>
                                            <span className="block font-medium">
                                                Créer un compte propriétaire
                                            </span>
                                            <span className="text-xs text-zinc-600 dark:text-zinc-400">
                                                Créez son accès Hôte en même
                                                temps que le logement
                                                (conciergerie).
                                            </span>
                                        </span>
                                    </label>
                                </fieldset>

                                {values.owner_mode === 'existing' ? (
                                    <div className="space-y-3">
                                        {ownerList.length > 5 && (
                                            <Field
                                                label="Filtrer les comptes"
                                                htmlFor="owner_search"
                                            >
                                                <Input
                                                    id="owner_search"
                                                    type="search"
                                                    placeholder="Rechercher par nom ou e-mail…"
                                                    value={ownerSearch}
                                                    onChange={(event) =>
                                                        setOwnerSearch(
                                                            event.target.value,
                                                        )
                                                    }
                                                />
                                            </Field>
                                        )}
                                        <Field
                                            label="Propriétaire du logement"
                                            htmlFor="owner_id"
                                            error={errors.owner_id}
                                            action={
                                                currentUserId ? (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setValues(
                                                                (prev) => ({
                                                                    ...prev,
                                                                    owner_id:
                                                                        String(
                                                                            currentUserId,
                                                                        ),
                                                                }),
                                                            )
                                                        }
                                                        className="text-xs font-medium text-primary-600 hover:underline dark:text-primary-400"
                                                    >
                                                        M’attribuer ce bien
                                                    </button>
                                                ) : undefined
                                            }
                                        >
                                            <Select
                                                id="owner_id"
                                                name="owner_id"
                                                value={values.owner_id}
                                                onChange={(event) =>
                                                    setValues((prev) => ({
                                                        ...prev,
                                                        owner_id:
                                                            event.target.value,
                                                    }))
                                                }
                                                aria-invalid={Boolean(
                                                    errors.owner_id,
                                                )}
                                            >
                                                <option value="">
                                                    Choisir un propriétaire…
                                                </option>
                                                {filteredOwners.map((owner) => (
                                                    <option
                                                        key={owner.id}
                                                        value={owner.id}
                                                    >
                                                        {owner.name} ({owner.email}
                                                        ) —{' '}
                                                        {
                                                            USER_ROLE_LABELS[
                                                                owner.role
                                                            ]
                                                        }
                                                    </option>
                                                ))}
                                            </Select>
                                        </Field>
                                    </div>
                                ) : (
                                    <div className="grid gap-4 rounded-xl border border-zinc-200 p-4 sm:grid-cols-2 dark:border-zinc-800">
                                        <Field
                                            label="Nom complet"
                                            htmlFor="owner_name"
                                            error={errors.owner_name}
                                        >
                                            <Input
                                                id="owner_name"
                                                name="owner_name"
                                                value={values.owner_name}
                                                onChange={(event) =>
                                                    setValues((prev) => ({
                                                        ...prev,
                                                        owner_name:
                                                            event.target.value,
                                                    }))
                                                }
                                                aria-invalid={Boolean(
                                                    errors.owner_name,
                                                )}
                                            />
                                        </Field>
                                        <Field
                                            label="Adresse e-mail"
                                            htmlFor="owner_email"
                                            error={errors.owner_email}
                                        >
                                            <Input
                                                id="owner_email"
                                                name="owner_email"
                                                type="email"
                                                value={values.owner_email}
                                                onChange={(event) =>
                                                    setValues((prev) => ({
                                                        ...prev,
                                                        owner_email:
                                                            event.target.value,
                                                    }))
                                                }
                                                aria-invalid={Boolean(
                                                    errors.owner_email,
                                                )}
                                            />
                                        </Field>
                                        <Field
                                            label="Mot de passe initial"
                                            htmlFor="owner_password"
                                            error={errors.owner_password}
                                            hint="8 caractères minimum. Le compte sera immédiatement vérifié (rôle Hôte)."
                                            className="sm:col-span-2"
                                        >
                                            <Input
                                                id="owner_password"
                                                name="owner_password"
                                                type="password"
                                                value={values.owner_password}
                                                onChange={(event) =>
                                                    setValues((prev) => ({
                                                        ...prev,
                                                        owner_password:
                                                            event.target.value,
                                                    }))
                                                }
                                                aria-invalid={Boolean(
                                                    errors.owner_password,
                                                )}
                                            />
                                        </Field>
                                    </div>
                                )}

                                <Field
                                    label="Statut souhaité après ajout des photos"
                                    htmlFor="initial_status"
                                    error={errors.initial_status}
                                    hint="Vous pourrez confirmer ou changer ce choix à l’étape finale."
                                >
                                    <Select
                                        id="initial_status"
                                        name="initial_status"
                                        value={values.initial_status}
                                        onChange={(event) =>
                                            setValues((prev) => ({
                                                ...prev,
                                                initial_status: event.target
                                                    .value as
                                                    | 'draft'
                                                    | 'pending'
                                                    | 'published',
                                            }))
                                        }
                                    >
                                        <option value="published">
                                            Publier directement dans le
                                            catalogue
                                        </option>
                                        <option value="draft">
                                            Enregistrer en brouillon
                                        </option>
                                        <option value="pending">
                                            En attente de validation
                                        </option>
                                    </Select>
                                </Field>
                            </div>
                        )}

                        {currentStep === 'details' && (
                            <PropertyDetailsFields
                                errors={errors}
                                types={typeOptions}
                                property={editableSlice}
                                onRentalDurationChange={(duration) =>
                                    setValues((prev) => ({
                                        ...prev,
                                        rental_duration: duration,
                                    }))
                                }
                                onTypeAdded={(option) =>
                                    setTypeOptions((prev) =>
                                        prev.some(
                                            (t) => t.value === option.value,
                                        )
                                            ? prev
                                            : [...prev, option],
                                    )
                                }
                            />
                        )}

                        {currentStep === 'location' && (
                            <LocationFields
                                errors={errors}
                                property={editableSlice}
                                countries={options.countries}
                            />
                        )}

                        {currentStep === 'capacity' && (
                            <CapacityFields
                                errors={errors}
                                property={editableSlice}
                            />
                        )}

                        {currentStep === 'amenities' && (
                            <AmenitiesFields
                                errors={errors}
                                property={editableSlice}
                                amenities={options.amenities}
                                isOptional={
                                    values.rental_duration === 'long_term'
                                }
                            />
                        )}

                        {currentStep === 'pricing' && (
                            <PricingFields
                                errors={errors}
                                property={editableSlice}
                                bookingModes={options.bookingModes}
                            />
                        )}

                        <div className="flex items-center justify-between gap-3 border-t border-zinc-200 pt-6 dark:border-zinc-800">
                            {currentIndex > 0 ? (
                                <Button
                                    variant="outline"
                                    disabled={saving}
                                    onClick={() =>
                                        void goToStep(currentIndex - 1)
                                    }
                                >
                                    ← Précédent
                                </Button>
                            ) : (
                                <span />
                            )}

                            <Button type="submit" loading={saving}>
                                {stepKeys[currentIndex + 1] === 'photos'
                                    ? createdProperty
                                        ? 'Mettre à jour et passer aux photos →'
                                        : 'Enregistrer et ajouter les photos →'
                                    : 'Continuer →'}
                            </Button>
                        </div>
                    </form>
                )}
            </Card>
        </div>
    );
}

