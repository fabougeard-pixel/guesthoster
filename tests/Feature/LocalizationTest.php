<?php

use Illuminate\Support\Facades\Validator;

test('the application uses French by default', function () {
    expect(app()->getLocale())->toBe('fr');
});

test('validation messages and attributes are translated to French', function () {
    $validator = Validator::make(['email' => 'pas-un-email'], [
        'name' => ['required'],
        'email' => ['email'],
    ]);

    expect($validator->errors()->first('name'))->toBe('Le champ nom est obligatoire.')
        ->and($validator->errors()->first('email'))->toBe('Le champ adresse e-mail doit être une adresse e-mail valide.');
});
