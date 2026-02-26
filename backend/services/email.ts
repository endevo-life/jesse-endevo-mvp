import { Resend } from 'resend';
import type { EmailSendParams, EmailSendResult } from '../types/index';
import { ServiceError } from '../middleware/errorHandler';

// ── Email HTML template ───────────────────────────────────────────────────────
function buildEmailHtml(name: string, score: number, tier: string, pdfFilename: string): string {
  const tierColors: Record<string, string> = {
    'Peace Champion':  '#22C55E',
    'On Your Way':     '#4A90D9',
    'Getting Clarity': '#E8651A',
    'Starting Fresh':  '#A855F7',
  };
  const tierColor = tierColors[tier] ?? '#1B2A4A';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your 7-Day Digital Readiness Plan from Jesse</title>
</head>
<body style="margin:0;padding:0;background:#F5F5F5;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F5F5;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:#1B2A4A;padding:36px 40px;text-align:center;">
              <p style="margin:0;color:#E8651A;font-size:13px;letter-spacing:2px;font-weight:bold;text-transform:uppercase;">ENDevo</p>
              <h1 style="margin:8px 0 0;color:#ffffff;font-size:28px;font-weight:bold;">Jesse</h1>
              <p style="margin:6px 0 0;color:#94A3B8;font-size:14px;">Your Digital Readiness Guide</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 24px;font-size:16px;color:#1B2A4A;">Hi ${name},</p>

              <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.7;">
                Jesse has reviewed your answers and built your personalized <strong>7-Day Digital Readiness Plan</strong>. Your full plan is attached to this email as a PDF.
              </p>

              <!-- Score card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;border-radius:10px;border:1px solid #E2E8F0;margin:0 0 28px;">
                <tr>
                  <td style="padding:28px;text-align:center;">
                    <p style="margin:0 0 8px;font-size:13px;color:#64748B;text-transform:uppercase;letter-spacing:1px;">Your Readiness Score</p>
                    <p style="margin:0;font-size:56px;font-weight:bold;color:#1B2A4A;line-height:1;">${score}<span style="font-size:28px;color:#94A3B8;">/100</span></p>
                    <p style="margin:12px 0 0;display:inline-block;background:${tierColor};color:#ffffff;font-size:14px;font-weight:bold;padding:6px 20px;border-radius:20px;">${tier}</p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.7;">
                Open the attached PDF to see your full 7-Day Action Plan — specific, achievable steps chosen for your exact situation.
              </p>

              <p style="margin:0 0 28px;font-size:14px;color:#94A3B8;">
                Can't see the attachment? Check your spam folder. The file is named <strong>${pdfFilename}</strong>.
              </p>

              <p style="margin:0;font-size:15px;color:#475569;line-height:1.7;">
                Warm regards,<br />
                <strong style="color:#1B2A4A;">Jesse</strong><br />
                <span style="color:#94A3B8;font-size:14px;">Your Digital Readiness Guide · ENDevo</span>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#F8FAFC;border-top:1px solid #E2E8F0;padding:24px 40px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#94A3B8;">
                ENDevo — Plan. Protect. Peace. &nbsp;|&nbsp;
                <a href="https://endevo.life" style="color:#E8651A;text-decoration:none;">endevo.life</a>
              </p>
              <p style="margin:8px 0 0;font-size:11px;color:#CBD5E1;">
                This is an educational plan. Not legal or financial advice. Free of charge — no spam, ever.
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

// ── Send email via Resend ─────────────────────────────────────────────────────
export async function sendPlanEmail({ name, email, score, tier, pdfBuffer }: EmailSendParams): Promise<EmailSendResult> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey || apiKey === 'your_resend_api_key_here') {
    console.log('[Email] No Resend API key — skipping email send');
    return { skipped: true };
  }

  const resend = new Resend(apiKey);

  // TODO: Replace hardcoded test email with dynamic `email` parameter once
  // Resend domain verification + API key are confirmed working end-to-end.
  // Production: const recipientEmail = email;
  const recipientEmail = 'bluesproutagency@gmail.com'; // endevo-life admin test address

  // Build filename: "Jesse Test - 7Day Plan - 2026-02-25.pdf"
  const dateStr    = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const safeName   = name.replace(/[^a-zA-Z0-9 _-]/g, '').trim();
  const pdfFilename = `${safeName} - 7Day Plan - ${dateStr}.pdf`;

  const { data, error } = await resend.emails.send({
    from:     process.env.EMAIL_FROM    || 'hello@endevo.life',
    to:       recipientEmail,
    reply_to: process.env.EMAIL_REPLY_TO || 'hello@endevo.life',
    subject:  'Your 7-Day Digital Readiness Plan from Jesse',
    html:     buildEmailHtml(name, score, tier, pdfFilename),
    attachments: [
      {
        filename: pdfFilename,
        content:  pdfBuffer.toString('base64'),
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
