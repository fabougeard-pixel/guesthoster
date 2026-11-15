/**
 * Regex de détection des mots-clés relatifs aux paiements et coordonnées bancaires
 * dans les conversations entre voyageurs et hôtes/propriétaires.
 */
export const PAYMENT_KEYWORDS_REGEX =
    /\b(paiement|paiements|payer|paye|payez|payerons|reglement|regler|virement|virements|carte|cb|especes|espece|cash|acompte|solde|caution|remboursement|rembourser|rib|iban|bic|swift|paypal|lydia|paylib|western\s*union|moneygram|crypto|bitcoin|usdt|mandat|frais\s*bancaires|en\s*dehors|hors\s*plateforme)\b/i;
