import { Resend } from 'resend';
import { env } from '@/lib/env';

let resendClient: Resend | null = null;

function getResendClient(): Resend | null {
    const apiKey = env.resendApiKey;
    if (!apiKey) {
        return null;
    }

    if (!resendClient) {
        resendClient = new Resend(apiKey);
    }

    return resendClient;
}

function escapeHtml(text: string): string {
    return text
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

export function renderEmailHtml({
    greeting,
    lines,
    actionLabel,
    actionUrl,
}: {
    greeting: string;
    lines: string[];
    actionLabel?: string;
    actionUrl?: string;
}): string {
    const paragraphs = lines
        .map(
            (line) =>
                `<p style="margin:0 0 16px;color:#3f3f46;font-size:15px;line-height:1.6;">${escapeHtml(line)}</p>`,
        )
        .join('');

    const cta =
        actionLabel && actionUrl
            ? `<p style="margin:24px 0;"><a href="${escapeHtml(actionUrl)}" style="display:inline-block;background:#c94400;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 20px;border-radius:8px;">${escapeHtml(actionLabel)}</a></p>`
            : '';

    return `<!doctype html>
<html lang="fr">
<body style="margin:0;padding:24px;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;border:1px solid #e4e4e7;overflow:hidden;">
    <tr>
      <td style="padding:24px 28px;border-bottom:1px solid #e4e4e7;">
        <strong style="font-size:18px;color:#3a0ca3;">GuestHoster</strong>
      </td>
    </tr>
    <tr>
      <td style="padding:28px;">
        <p style="margin:0 0 16px;color:#18181b;font-size:16px;font-weight:600;">${escapeHtml(greeting)}</p>
        ${paragraphs}
        ${cta}
      </td>
    </tr>
    <tr>
      <td style="padding:16px 28px;background:#fafafa;border-top:1px solid #e4e4e7;color:#71717a;font-size:12px;">
        © ${new Date().getFullYear()} GuestHoster · Tous droits réservés.
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendEmail({
    to,
    subject,
    greeting,
    lines,
    actionLabel,
    actionUrl,
}: {
    to: string;
    subject: string;
    greeting: string;
    lines: string[];
    actionLabel?: string;
    actionUrl?: string;
}): Promise<boolean> {
    const client = getResendClient();
    const html = renderEmailHtml({ greeting, lines, actionLabel, actionUrl });
    const text = [
        greeting,
        '',
        ...lines,
        ...(actionLabel && actionUrl ? ['', `${actionLabel} : ${actionUrl}`] : []),
    ].join('\n');

    if (!client) {
        if (!env.isProduction) {
            console.info(`[MAIL DEV] To: ${to} | Subject: ${subject}\n${text}`);
        } else {
            console.warn('RESEND_API_KEY manquante : email non envoyé à', to);
        }
        return false;
    }

    const { error } = await client.emails.send({
        from: env.mailFrom,
        to,
        subject,
        html,
        text,
    });

    if (error) {
        console.error('Échec d’envoi Resend:', error);
        return false;
    }

    return true;
}

