/**
 * Le temps réel (Reverb) n'est actif que si sa clé est fournie au build ;
 * sinon les écrans concernés se rafraîchissent périodiquement.
 */
export const realtimeEnabled = Boolean(import.meta.env.VITE_REVERB_APP_KEY);
