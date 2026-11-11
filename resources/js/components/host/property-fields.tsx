import { Checkbox, Field, Input, Select, Textarea } from '@/components/form';
import type { HostFormOptions, HostProperty, Option } from '@/types';

type Errors = Partial<Record<string, string>>;

export function PropertyDetailsFields({
    errors,
    types,
    property,
}: {
    errors: Errors;
    types: Option[];
    property?: HostProperty;
}) {
    return (
        <>
            <Field
                label="Titre de l’annonce"
                htmlFor="title"
                error={errors.title}
                hint="Entre 10 et 120 caractères, par exemple « Appartement lumineux près du Vieux-Port »."
            >
                <Input
                    id="title"
                    name="title"
                    required
                    maxLength={120}
                    defaultValue={property?.title}
                    aria-invalid={Boolean(errors.title)}
                />
            </Field>
            <Field
                label="Type de logement"
                htmlFor="property_type_id"
                error={errors.property_type_id}
            >
                <Select
                    id="property_type_id"
                    name="property_type_id"
                    required
                    defaultValue={property?.property_type_id ?? ''}
                    aria-invalid={Boolean(errors.property_type_id)}
                >
                    <option value="" disabled>
                        Choisir…
                    </option>
                    {types.map((type) => (
                        <option key={type.value} value={type.value}>
                            {type.label}
                        </option>
                    ))}
                </Select>
            </Field>
            <Field
                label="Description"
                htmlFor="description"
                error={errors.description}
                hint="Au moins 80 caractères : l’ambiance, le quartier, ce qui rend votre logement unique."
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
    property: HostProperty;
    countries: HostFormOptions['countries'];
}) {
    return (
        <>
            <Field label="Ville" htmlFor="city_id" error={errors.city_id}>
                <Select
                    id="city_id"
                    name="city_id"
                    required
                    defaultValue={property.city_id ?? ''}
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
                hint="Elle n’est communiquée au voyageur qu’après confirmation de sa réservation."
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
        </>
    );
}

export function CapacityFields({
    errors,
    property,
}: {
    errors: Errors;
    property: HostProperty;
}) {
    const fields = [
        { name: 'max_guests', label: 'Voyageurs maximum', min: 1, max: 30 },
        { name: 'bedrooms', label: 'Chambres', min: 0, max: 30 },
        { name: 'beds', label: 'Lits', min: 1, max: 50 },
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
}: {
    errors: Errors;
    property: HostProperty;
    amenities: HostFormOptions['amenities'];
}) {
    return (
        <div className="grid gap-8 sm:grid-cols-2">
            {amenities.map((group) => (
                <fieldset key={group.category} className="flex flex-col gap-2">
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
    );
}

export function PricingFields({
    errors,
    property,
    bookingModes,
}: {
    errors: Errors;
    property: HostProperty;
    bookingModes: Option[];
}) {
    return (
        <>
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
            </div>
            <fieldset className="flex flex-col gap-3">
                <legend className="mb-1 text-sm font-medium">
                    Mode de réservation
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
                                    ? 'Les voyageurs réservent et paient directement, sans attendre votre accord.'
                                    : 'Vous acceptez ou refusez chaque demande avant que le voyageur ne paie.'}
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
