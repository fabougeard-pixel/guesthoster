import { describe, expect, it } from 'vitest';
import { PAYMENT_KEYWORDS_REGEX } from '@/lib/actions/inquiries';
import {
    SUPPORT_CATEGORIES,
    SUPPORT_CATEGORY_DESCRIPTIONS,
    SUPPORT_CATEGORY_ICONS,
} from '@/lib/domain/enums';

describe('Support Chat & Payment Mention Detection', () => {
    it('detects terms related to payment, cash, bank transfer, and caution', () => {
        const positiveSamples = [
            'Comment puis-je effectuer le paiement du loyer ?',
            'Est-ce que je peux payer en espèces à l’arrivée ?',
            'Quel est votre RIB ou IBAN pour le virement ?',
            'Je souhaite régler l’acompte et le solde par carte bancaire.',
            'Acceptez-vous un règlement via PayPal ou Western Union ?',
            'Quelle est la caution ou le dépôt de garantie ?',
            'Pouvez-vous me rembourser les frais ?',
            'Peut-on payer hors plateforme en direct ?',
            'Paiements acceptés sur place ?',
            'Paiement par chèque ou virement bancaire ?',
        ];

        for (const sample of positiveSamples) {
            expect(PAYMENT_KEYWORDS_REGEX.test(sample)).toBe(true);
        }
    });

    it('does not trigger false positives on standard greetings and questions', () => {
        const negativeSamples = [
            'Bonjour, le logement est-il disponible du 12 au 18 août ?',
            'Y a-t-il une machine à laver et un lave-vaisselle ?',
            'Quelle est l’heure d’arrivée maximale en soirée ?',
            'Nous sommes une famille avec deux enfants.',
            'Merci beaucoup pour votre accueil et votre disponibilité.',
            'L’appartement est très lumineux et propre.',
        ];

        for (const sample of negativeSamples) {
            expect(PAYMENT_KEYWORDS_REGEX.test(sample)).toBe(false);
        }
    });

    it('validates the 4 required support categories with icons and descriptions', () => {
        expect(SUPPORT_CATEGORIES).toEqual([
            "Demandes d'information",
            'Paiements',
            'Réservations',
            'Prise de rendez-vous',
        ]);

        for (const cat of SUPPORT_CATEGORIES) {
            expect(SUPPORT_CATEGORY_ICONS[cat]).toBeDefined();
            expect(SUPPORT_CATEGORY_DESCRIPTIONS[cat]).toBeDefined();
            expect(typeof SUPPORT_CATEGORY_ICONS[cat]).toBe('string');
            expect(typeof SUPPORT_CATEGORY_DESCRIPTIONS[cat]).toBe('string');
        }
    });
});
