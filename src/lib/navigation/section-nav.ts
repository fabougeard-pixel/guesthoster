export type SectionNavIconName =
    | 'dashboard'
    | 'home'
    | 'plus'
    | 'calendar'
    | 'users'
    | 'globe'
    | 'map-pin'
    | 'sparkles'
    | 'tag'
    | 'message'
    | 'settings'
    | 'shield';

export type SectionLink = {
    label: string;
    href: string;
    exact?: boolean;
    matchPrefixes?: string[];
    excludePaths?: string[];
    icon?: SectionNavIconName;
};

export type SectionNavGroup = {
    heading?: string;
    links: SectionLink[];
};

export function isSectionLinkActive(
    pathname: string,
    link: SectionLink,
): boolean {
    if (
        link.excludePaths?.some(
            (excluded) =>
                pathname === excluded || pathname.startsWith(`${excluded}/`),
        )
    ) {
        return false;
    }

    if (link.exact) {
        if (pathname === link.href) {
            return true;
        }
    } else if (
        pathname === link.href ||
        pathname.startsWith(`${link.href}/`)
    ) {
        return true;
    }

    return Boolean(
        link.matchPrefixes?.some(
            (prefix) =>
                pathname === prefix || pathname.startsWith(`${prefix}/`),
        ),
    );
}

