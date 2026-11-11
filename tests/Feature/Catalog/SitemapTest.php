<?php

use App\Models\Property;

test('the sitemap lists published listings only', function () {
    $published = Property::factory()->published()->create();
    $draft = Property::factory()->create();

    $this->get(route('sitemap'))
        ->assertOk()
        ->assertHeader('Content-Type', 'application/xml; charset=UTF-8')
        ->assertSee(route('properties.show', $published), false)
        ->assertDontSee($draft->slug, false);
});
