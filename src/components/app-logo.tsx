import { cn } from '@/lib/utils';

/**
 * Logo complet : version couleur en mode clair, version blanche en mode sombre.
 */
export function AppLogo({ className }: { className?: string }) {
    return (
        <picture>
            <source
                srcSet="/images/logos/logo-light.svg"
                media="(prefers-color-scheme: dark)"
            />
            <img
                src="/images/logos/logo.svg"
                alt="GuestHoster"
                width={1066}
                height={419}
                className={cn('h-9 w-auto', className)}
            />
        </picture>
    );
}

