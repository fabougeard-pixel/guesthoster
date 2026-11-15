import { describe, expect, it } from 'vitest';
import { extractComfortItems, getComfortBadge } from '@/components/amenity-icons';

describe('Comfort & Leisure amenities helper', () => {
    it('generates appropriate badges for comfort items', () => {
        expect(getComfortBadge('jacuzzi', 'Jacuzzi')).toContain('Spa & Bain à remous');
        expect(getComfortBadge('pool', 'Piscine')).toContain('Baignade');
        expect(getComfortBadge('sauna', 'Sauna')).toContain('Détente thermique');
        expect(getComfortBadge('foosball', 'Baby-foot')).toContain('conviviaux');
        expect(getComfortBadge('board-games', 'Jeux de société')).toContain('Jeux conviviaux');
    });

    it('extracts comfort items from categorized amenities', () => {
        const amenities = [
            {
                category: 'Confort',
                items: [
                    { slug: 'jacuzzi', name: 'Jacuzzi / Spa de relaxation' },
                    { slug: 'tv', name: 'Télévision' },
                ],
            },
            {
                category: 'Extérieur',
                items: [
                    { slug: 'pool', name: 'Piscine' },
                    { slug: 'parking', name: 'Parking gratuit' },
                ],
            },
            {
                category: 'Essentiels',
                items: [
                    { slug: 'wifi', name: 'Wi-Fi' },
                    { slug: 'air-conditioning', name: 'Climatisation' },
                ],
            },
        ];

        const comfort = extractComfortItems(amenities);

        const slugs = comfort.map((c) => c.slug);
        expect(slugs).toContain('jacuzzi');
        expect(slugs).toContain('tv');
        expect(slugs).toContain('pool');
        expect(slugs).toContain('air-conditioning');
        expect(slugs).not.toContain('wifi');
        expect(slugs).not.toContain('parking');

        const jacuzziItem = comfort.find((c) => c.slug === 'jacuzzi');
        expect(jacuzziItem?.highlight).toBe(true);
    });

    it('supplements comfort items from description keywords when not in amenities', () => {
        const amenities = [
            {
                category: 'Essentiels',
                items: [{ slug: 'wifi', name: 'Wi-Fi' }],
            },
        ];

        const comfort = extractComfortItems(
            amenities,
            'Superbe maison avec spa de nage et babyfoot pour des soirées conviviales.',
            'Maison de charme'
        );

        const slugs = comfort.map((c) => c.slug);
        expect(slugs).toContain('jacuzzi');
        expect(slugs).toContain('foosball');
    });
});
