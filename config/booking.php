<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Frais de service
    |--------------------------------------------------------------------------
    |
    | Part ajoutée au prix du séjour (nuits + ménage), payée par le voyageur.
    |
    */

    'service_fee_rate' => (float) env('BOOKING_SERVICE_FEE_RATE', 0.10),

    /*
    |--------------------------------------------------------------------------
    | Délais
    |--------------------------------------------------------------------------
    |
    | Une demande sans réponse de l'hôte, ou une réservation non payée, expire
    | au bout de ces délais (et au plus tard le jour d'arrivée).
    |
    */

    'host_response_hours' => (int) env('BOOKING_HOST_RESPONSE_HOURS', 48),

    'instant_payment_minutes' => (int) env('BOOKING_INSTANT_PAYMENT_MINUTES', 60),

    'approved_payment_hours' => (int) env('BOOKING_APPROVED_PAYMENT_HOURS', 24),

    /*
    |--------------------------------------------------------------------------
    | Remboursements
    |--------------------------------------------------------------------------
    |
    | Annulation par l'hôte ou un admin : remboursement intégral. Annulation
    | par le voyageur : intégral jusqu'à `full_refund_days` jours avant
    | l'arrivée, puis `late_refund_rate` du montant payé.
    |
    */

    'full_refund_days' => (int) env('BOOKING_FULL_REFUND_DAYS', 7),

    'late_refund_rate' => (float) env('BOOKING_LATE_REFUND_RATE', 0.5),

    /*
    |--------------------------------------------------------------------------
    | Avis
    |--------------------------------------------------------------------------
    |
    | Le voyageur peut noter un séjour terminé pendant `review_window_days`
    | jours après son départ.
    |
    */

    'review_window_days' => (int) env('BOOKING_REVIEW_WINDOW_DAYS', 30),

];
