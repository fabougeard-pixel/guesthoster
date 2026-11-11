<?php

use Inertia\Testing\AssertableInertia as Assert;

test('a missing page renders the Inertia error page when debug is off', function () {
    config(['app.debug' => false]);

    $this->get('/page-qui-nexiste-pas')
        ->assertNotFound()
        ->assertInertia(fn (Assert $page) => $page
            ->component('error')
            ->where('status', 404)
            ->where('name', config('app.name'))
        );
});

test('errors fall back to the default renderer when debug is on', function () {
    config(['app.debug' => true]);

    $this->get('/page-qui-nexiste-pas')
        ->assertNotFound()
        ->assertHeaderMissing('X-Inertia');
});
