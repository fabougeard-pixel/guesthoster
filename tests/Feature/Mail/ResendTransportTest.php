<?php

use Illuminate\Http\Client\Request;
use Illuminate\Mail\Message;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Symfony\Component\Mailer\Exception\TransportException;

test('resend transport posts email payload via HTTP API', function (): void {
    config()->set('services.resend.key', 're_test_secret');
    config()->set('mail.default', 'resend');
    config()->set('mail.from', [
        'address' => 'noreply@guesthoster.test',
        'name' => 'GuestHoster',
    ]);

    Http::fake([
        'https://api.resend.com/emails' => Http::response(['id' => 'email_123'], 200),
    ]);

    Mail::raw('Bonjour GuestHoster', function (Message $message): void {
        $message->to('client@example.com')->subject('Confirmation');
    });

    Http::assertSent(function (Request $request): bool {
        return $request->url() === 'https://api.resend.com/emails'
            && $request->hasHeader('Authorization', 'Bearer re_test_secret')
            && $request['from'] === 'GuestHoster <noreply@guesthoster.test>'
            && $request['to'] === ['client@example.com']
            && $request['subject'] === 'Confirmation'
            && $request['text'] === 'Bonjour GuestHoster';
    });
});

test('resend transport forwards html bodies and base64 attachments', function (): void {
    config()->set('services.resend.key', 're_test_secret');
    config()->set('mail.default', 'resend');
    config()->set('mail.from', [
        'address' => 'noreply@guesthoster.test',
        'name' => 'GuestHoster',
    ]);

    Http::fake([
        'https://api.resend.com/emails' => Http::response(['id' => 'email_456'], 200),
    ]);

    Mail::html('<p>Votre reçu</p>', function (Message $message): void {
        $message->to('client@example.com')
            ->subject('Reçu')
            ->attachData('pdf-content', 'recu.pdf', ['mime' => 'application/pdf']);
    });

    Http::assertSent(function (Request $request): bool {
        $attachments = $request['attachments'] ?? [];

        return $request['html'] === '<p>Votre reçu</p>'
            && is_array($attachments)
            && count($attachments) === 1
            && $attachments[0]['filename'] === 'recu.pdf'
            && $attachments[0]['content'] === base64_encode('pdf-content')
            && $attachments[0]['content_type'] === 'application/pdf';
    });
});

test('resend transport throws a TransportException when the API fails', function (): void {
    config()->set('services.resend.key', 're_bad_key');
    config()->set('mail.default', 'resend');
    config()->set('mail.from', [
        'address' => 'noreply@guesthoster.test',
        'name' => 'GuestHoster',
    ]);

    Http::fake([
        'https://api.resend.com/emails' => Http::response(['message' => 'Invalid API key'], 401),
    ]);

    expect(fn () => Mail::raw('Test', function (Message $message): void {
        $message->to('client@example.com')->subject('Test');
    }))->toThrow(TransportException::class, 'Invalid API key');
});

test('resend transport requires RESEND_API_KEY', function (): void {
    config()->set('services.resend.key', null);
    config()->set('mail.default', 'resend');

    expect(fn () => Mail::mailer('resend'))
        ->toThrow(RuntimeException::class);
});
