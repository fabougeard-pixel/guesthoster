<?php

namespace App\Mail;

use Illuminate\Support\Facades\Http;
use Symfony\Component\Mailer\Exception\TransportException;
use Symfony\Component\Mailer\SentMessage;
use Symfony\Component\Mailer\Transport\AbstractTransport;
use Symfony\Component\Mime\Address;
use Symfony\Component\Mime\Email;
use Symfony\Component\Mime\MessageConverter;

class ResendApiTransport extends AbstractTransport
{
    /**
     * @var list<string>
     */
    private const array EXCLUDED_HEADERS = [
        'date',
        'mime-version',
        'message-id',
        'from',
        'sender',
        'reply-to',
        'to',
        'cc',
        'bcc',
        'subject',
        'content-type',
        'content-transfer-encoding',
    ];

    public function __construct(private readonly string $apiKey)
    {
        parent::__construct();
    }

    public function __toString(): string
    {
        return 'resend';
    }

    protected function doSend(SentMessage $message): void
    {
        $email = MessageConverter::toEmail($message->getOriginalMessage());
        $from = $email->getFrom()[0] ?? null;

        if ($from === null) {
            throw new TransportException('Le message email ne contient pas d’adresse d’expéditeur.');
        }

        $payload = $this->buildPayload($email, $from);

        $response = Http::withToken($this->apiKey)
            ->acceptJson()
            ->timeout(10)
            ->post('https://api.resend.com/emails', $payload);

        if ($response->failed()) {
            $errorMessage = $response->json('message');
            $detail = is_string($errorMessage) && $errorMessage !== ''
                ? $errorMessage
                : $response->body();

            throw new TransportException(
                sprintf('Échec d’envoi Resend (%d): %s', $response->status(), $detail),
                $response->status(),
            );
        }

        $messageId = $response->json('id');
        if (is_string($messageId) && $messageId !== '') {
            $message->setMessageId($messageId);
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function buildPayload(Email $email, Address $from): array
    {
        $payload = [
            'from' => $from->toString(),
            'to' => $this->formatAddresses($email->getTo()),
            'subject' => $email->getSubject() ?? '',
        ];

        $cc = $this->formatAddresses($email->getCc());
        if ($cc !== []) {
            $payload['cc'] = $cc;
        }

        $bcc = $this->formatAddresses($email->getBcc());
        if ($bcc !== []) {
            $payload['bcc'] = $bcc;
        }

        $replyTo = $this->formatAddresses($email->getReplyTo());
        if ($replyTo !== []) {
            $payload['reply_to'] = $replyTo;
        }

        $html = $this->readBody($email->getHtmlBody());
        if ($html !== null) {
            $payload['html'] = $html;
        }

        $text = $this->readBody($email->getTextBody());
        if ($text !== null) {
            $payload['text'] = $text;
        }

        $attachments = $this->formatAttachments($email);
        if ($attachments !== []) {
            $payload['attachments'] = $attachments;
        }

        $headers = $this->extractCustomHeaders($email);
        if ($headers !== []) {
            $payload['headers'] = $headers;
        }

        return $payload;
    }

    /**
     * @param  list<Address>  $addresses
     * @return list<string>
     */
    private function formatAddresses(array $addresses): array
    {
        return array_values(array_map(
            static fn (Address $address): string => $address->toString(),
            $addresses,
        ));
    }

    private function readBody(mixed $body): ?string
    {
        if (is_string($body)) {
            return $body;
        }

        if (is_resource($body)) {
            rewind($body);
            $contents = stream_get_contents($body);

            return is_string($contents) ? $contents : null;
        }

        return null;
    }

    /**
     * @return list<array{filename: string, content: string, content_type: string}>
     */
    private function formatAttachments(Email $email): array
    {
        $attachments = [];

        foreach ($email->getAttachments() as $attachment) {
            $attachments[] = [
                'filename' => $attachment->getFilename() ?? 'attachment',
                'content' => base64_encode($attachment->getBody()),
                'content_type' => $attachment->getMediaType().'/'.$attachment->getMediaSubtype(),
            ];
        }

        return $attachments;
    }

    /**
     * @return array<string, string>
     */
    private function extractCustomHeaders(Email $email): array
    {
        $headers = [];

        foreach ($email->getHeaders()->all() as $header) {
            $name = strtolower($header->getName());

            if (in_array($name, self::EXCLUDED_HEADERS, true)) {
                continue;
            }

            $headers[$header->getName()] = $header->getBodyAsString();
        }

        return $headers;
    }
}

