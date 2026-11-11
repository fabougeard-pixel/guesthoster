import { Form, Head } from '@inertiajs/react';
import { Button } from '@/components/button';
import { Field, Input } from '@/components/form';
import { SectionCard } from '@/components/section-card';
import { update } from '@/routes/user-password';

export default function Password() {
    return (
        <>
            <Head title="Mot de passe" />

            <SectionCard
                title="Modifier le mot de passe"
                description="Choisissez un mot de passe long et unique."
            >
                <Form
                    {...update.form()}
                    options={{ preserveScroll: true }}
                    resetOnSuccess
                    resetOnError={[
                        'password',
                        'password_confirmation',
                        'current_password',
                    ]}
                    className="flex flex-col gap-5"
                >
                    {({ errors, processing }) => (
                        <>
                            <Field
                                label="Mot de passe actuel"
                                htmlFor="current_password"
                                error={errors.current_password}
                            >
                                <Input
                                    id="current_password"
                                    type="password"
                                    name="current_password"
                                    required
                                    autoComplete="current-password"
                                    aria-invalid={!!errors.current_password}
                                />
                            </Field>

                            <Field
                                label="Nouveau mot de passe"
                                htmlFor="password"
                                error={errors.password}
                            >
                                <Input
                                    id="password"
                                    type="password"
                                    name="password"
                                    required
                                    autoComplete="new-password"
                                    aria-invalid={!!errors.password}
                                />
                            </Field>

                            <Field
                                label="Confirmation du nouveau mot de passe"
                                htmlFor="password_confirmation"
                                error={errors.password_confirmation}
                            >
                                <Input
                                    id="password_confirmation"
                                    type="password"
                                    name="password_confirmation"
                                    required
                                    autoComplete="new-password"
                                />
                            </Field>

                            <div>
                                <Button type="submit" loading={processing}>
                                    Mettre à jour
                                </Button>
                            </div>
                        </>
                    )}
                </Form>
            </SectionCard>
        </>
    );
}
