<?php

test('production robots.txt hides private areas and points to the sitemap', function () {
    app()['env'] = 'production';

    $this->get('/robots.txt')
        ->assertOk()
        ->assertHeader('Content-Type', 'text/plain; charset=UTF-8')
        ->assertSee('Disallow: /admin')
        ->assertSee('Disallow: /logements/*/reserver')
        ->assertSee('Sitemap: '.route('sitemap'))
        ->assertDontSee("Disallow: /\n", false);
});

test('robots.txt blocks everything outside production', function () {
    $this->get('/robots.txt')
        ->assertOk()
        ->assertSee("Disallow: /\n", false)
        ->assertDontSee('Sitemap:');
});
