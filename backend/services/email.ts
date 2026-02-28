import { Resend } from 'resend';
import type { EmailSendParams, EmailSendResult } from '../types/index';
import { ServiceError } from '../middleware/errorHandler';

// ── Logo URL ──────────────────────────────────────────────────────────────────
// Email clients (Gmail, Outlook, Apple Mail) block base64/data-URI images.
// Use a direct public URL instead. Override via PUBLIC_LOGO_URL env var if needed.
// Set PUBLIC_LOGO_URL on Vercel backend env vars → point to frontend URL /logo_resized.png
const LOGO_URL = process.env.PUBLIC_LOGO_URL ?? '';
// â”€â”€ Email HTML â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function buildEmailHtml(name: string, score: number, tier: string, pdfFilename: string): string {
  const tierColors: Record<string, string> = {
    'Peace Champion':  '#22C55E',
    'On Your Way':     '#4A90D9',
    'Getting Clarity': '#E8651A',
    'Starting Fresh':  '#A855F7',
  };
  const tierColor = tierColors[tier] ?? '#1B2A4A';
  const logoHtml = LOGO_URL
    ? `<img src="${LOGO_URL}" alt="ENDevo" width="150" style="max-width:150px;height:auto;display:block;margin:0 auto 14px;" />`
    : `<p style="margin:0 0 14px;color:#E8651A;font-size:13px;letter-spacing:2px;font-weight:bold;text-transform:uppercase;">ENDevo</p>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your 7-Day Digital Readiness Plan from Jesse</title>
</head>
<body style="margin:0;padding:0;background:#F0F4F8;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F0F4F8;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10);">

          <!-- Header -->
          <tr>
            <td style="background:#1B2A4A;padding:36px 40px 28px;text-align:center;">
              ${logoHtml}
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:bold;letter-spacing:0.5px;">Jesse</h1>
              <p style="margin:6px 0 0;color:#94A3B8;font-size:13px;">Your Digital Readiness Guide Â· ENDevo</p>
            </td>
          </tr>

          <!-- Orange accent bar -->
          <tr><td style="background:#E8651A;height:4px;font-size:0;line-height:0;">&nbsp;</td></tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 20px;font-size:17px;color:#1B2A4A;font-weight:bold;">Hi ${name},</p>

              <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.75;">
                Jesse has reviewed your answers and built your personalised
                <strong style="color:#1B2A4A;">7-Day Digital Readiness Plan</strong>.
                Your full plan is attached to this email as a PDF.
              </p>

              <!-- Score card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;border-radius:10px;border:1px solid #E2E8F0;margin:0 0 28px;">
                <tr>
                  <td style="padding:28px;text-align:center;">
                    <p style="margin:0 0 8px;font-size:12px;color:#64748B;text-transform:uppercase;letter-spacing:1.5px;">Your Readiness Score</p>
                    <p style="margin:0;font-size:58px;font-weight:bold;color:#1B2A4A;line-height:1;">${score}<span style="font-size:26px;color:#94A3B8;">/100</span></p>
                    <p style="margin:14px 0 0;display:inline-block;background:${tierColor};color:#ffffff;font-size:13px;font-weight:bold;padding:6px 22px;border-radius:20px;letter-spacing:0.5px;">${tier}</p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.75;">
                Open the attached PDF to see your full 7-Day Action Plan â€” specific, achievable steps chosen for your exact situation.
              </p>

              <p style="margin:0 0 32px;font-size:14px;color:#94A3B8;">
                Can't see the attachment? Check your spam folder. The file is named <strong>${pdfFilename}</strong>.
              </p>

              <p style="margin:0;font-size:15px;color:#475569;line-height:1.75;">
                Warm regards,<br />
                <strong style="color:#1B2A4A;">Jesse</strong><br />
                <span style="color:#94A3B8;font-size:13px;">Digital Readiness Guide Â· ENDevo</span>
              </p>
            </td>
          </tr>

          <!-- CTA button -->
          <tr>
            <td style="padding:0 40px 36px;text-align:center;">
              <a href="https://endevo.life" style="display:inline-block;background:#E8651A;color:#ffffff;font-size:14px;font-weight:bold;padding:13px 32px;border-radius:8px;text-decoration:none;letter-spacing:0.5px;">
                Visit ENDevo &rarr;
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#F8FAFC;border-top:1px solid #E2E8F0;padding:24px 40px;text-align:center;">
              <p style="margin:0 0 6px;font-size:13px;color:#1B2A4A;font-weight:bold;">
                ENDevo â€” Plan. Protect. Peace.
              </p>
              <p style="margin:0 0 10px;font-size:13px;color:#64748B;">
                <a href="https://endevo.life" style="color:#E8651A;text-decoration:none;font-weight:bold;">endevo.life</a>
              </p>
              <p style="margin:0;font-size:11px;color:#CBD5E1;line-height:1.6;">
                This is an educational plan. Not legal or financial advice.<br />Free of charge â€” no spam, ever.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// â”€â”€ Send email via Resend â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function sendPlanEmail({ name, email, score, tier, pdfBuffer }: EmailSendParams): Promise<EmailSendResult> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey || apiKey === 'your_resend_api_key_here') {
    console.log('[Email] No Resend API key â€” skipping email send');
    return { skipped: true };
  }

  const resend = new Resend(apiKey);

  const now      = new Date();
  const mm       = String(now.getMonth() + 1).padStart(2, '0');
  const dd       = String(now.getDate()).padStart(2, '0');
  const yyyy     = now.getFullYear();
  const safeName    = name.replace(/[^a-zA-Z0-9 _-]/g, '').trim().replace(/\s+/g, '-');
  const pdfFilename = `${safeName}-7DayReadinessPlan-${mm}-${dd}-${yyyy}.pdf`;

  const maskedEmail = email.replace(/(.{2}).*(@.*)/, '$1***$2');
  console.log(`[Email] Sending to ${maskedEmail} â€” file: ${pdfFilename}`);

  const { data, error } = await resend.emails.send({
    from:     process.env.EMAIL_FROM     || 'hello@endevo.life',
    to:       email,
    reply_to: process.env.EMAIL_REPLY_TO || 'hello@endevo.life',
    subject:  'Your 7-Day Digital Readiness Plan from Jesse',
    html:     buildEmailHtml(name, score, tier, pdfFilename),
    attachments: [
      {
        filename:     pdfFilename,
        content:      pdfBuffer.toString('base64'),
        content_type: 'application/pdf',
      },
    ],
  });

  if (error) {
    console.error('[Email] Resend error:', error);
    throw new ServiceError(`Email delivery failed: ${error.message}`, 'EMAIL_DELIVERY_FAILED');
  }

  console.log('[Email] Sent successfully, id:', data?.id);
  return { id: data?.id };
}
