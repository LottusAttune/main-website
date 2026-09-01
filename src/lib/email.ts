import 'server-only';

import { Resend } from 'resend';

import { SITE } from '@/lib/site';

/**
 * Permanent Google Meet room, reused for every discovery call rather than
 * generating a fresh link per booking. Update here (and redeploy) if it
 * ever changes - it deliberately lives server-side only, never in a file a
 * client component imports, so it is never shipped in the browser bundle.
 */
const DISCOVERY_CALL_MEET_LINK = 'https://meet.google.com/eyu-jxag-asc';

const FROM = 'Lotus Attune <info@lotusattune.com>';
// PNG, not the site's usual WebP - many email clients (older Outlook among
// them) don't render WebP at all, showing a broken image where the logo
// should be. Derived once from footer-lockup-combo.webp, not a fresh photo,
// so it doesn't go through the normal source-assets pipeline.
const LOGO_URL = `${SITE.url}/assets/email-logo.png`;

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

function formatCallDay(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-CA', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Email-client-safe HTML: no CSS grid/flexbox, no web fonts (most inboxes
 * strip or block both), a table for layout, and colors as literal hex since
 * design tokens are a build-time-only concept the email never sees.
 */
function wrapperHtml(bodyHtml: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:32px 16px;background:#eae6df;font-family:Georgia,'Times New Roman',serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#fffdfa;border:1px solid rgba(59,46,36,0.14);">
      <tr>
        <td style="padding:26px 40px 18px;text-align:center;border-bottom:1px solid rgba(59,46,36,0.14);">
          <img src="${LOGO_URL}" width="220" height="171" alt="Lotus Attune" style="display:block;margin:0 auto;border:0;" />
        </td>
      </tr>
      <tr>
        <td style="padding:22px 40px 8px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:#5c4c40;">
          ${bodyHtml}
        </td>
      </tr>
      <tr>
        <td style="padding:26px 40px 34px;border-top:1px solid rgba(59,46,36,0.14);font-family:Arial,Helvetica,sans-serif;font-size:12.5px;line-height:1.8;color:#5c4c40;text-align:center;">
          <div style="font-family:Georgia,'Times New Roman',serif;font-size:15px;color:#3b2e24;margin-bottom:6px;">Lotus Attune</div>
          Questions? <a href="mailto:${SITE.email}" style="color:#7c5b3b;">${SITE.email}</a>
          &nbsp;&middot;&nbsp; ${SITE.phone}<br />
          ${SITE.area}
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function callDetailsHtml(name: string, dayLabel: string, callTime: string): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#241b14;margin:14px 0;">
      <tr>
        <td style="padding:22px 26px;font-family:Arial,Helvetica,sans-serif;color:#efe6da;">
          <div style="font-size:10.5px;letter-spacing:0.28em;text-transform:uppercase;color:#c6a97a;margin-bottom:12px;">Discovery Call</div>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:rgba(239,230,218,0.55);padding-bottom:4px;">With</td>
              <td style="text-align:right;font-size:14.5px;color:#f6efe5;padding-bottom:4px;">${name}</td>
            </tr>
            <tr>
              <td style="font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:rgba(239,230,218,0.55);padding:10px 0 4px;">Date</td>
              <td style="text-align:right;font-size:14.5px;color:#f6efe5;padding:10px 0 4px;">${dayLabel}</td>
            </tr>
            <tr>
              <td style="font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:rgba(239,230,218,0.55);padding:10px 0 0;">Time</td>
              <td style="text-align:right;font-size:14.5px;color:#f6efe5;padding:10px 0 0;">${callTime}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>`;
}

/**
 * Sends both discovery-call emails. Best-effort: a delivery failure is
 * logged but never thrown, since the request is already saved in the
 * database and that record is the source of truth, not the email.
 */
export async function sendDiscoveryCallEmails(input: {
  name: string;
  email: string;
  company?: string | null;
  callDate: string;
  callTime: string;
  rescheduleToken: string;
  /** True when this is a client-initiated change to an existing call. */
  rescheduled?: boolean;
}): Promise<void> {
  if (!resend) {
    console.error('[email] RESEND_API_KEY is not set - skipping send');
    return;
  }

  const dayLabel = formatCallDay(input.callDate);
  const verb = input.rescheduled ? 'rescheduled' : 'confirmed';
  const rescheduleUrl = `${SITE.url}/v1/discovery-call/reschedule?token=${input.rescheduleToken}`;

  const clientHtml = wrapperHtml(`
    <p style="margin:0 0 10px;">Hi ${input.name},</p>
    <p style="margin:0 0 10px;">Your discovery call with Lotus Attune is ${verb}. We'll meet over Google Meet at the time below.</p>
    ${callDetailsHtml(input.name, dayLabel, input.callTime)}
    <p style="margin:18px 0 0;">
      Join with this link when it's time: <a href="${DISCOVERY_CALL_MEET_LINK}" style="color:#7c5b3b;">${DISCOVERY_CALL_MEET_LINK}</a>
    </p>
    <p style="margin:18px 0 0;">
      Need a different time? <a href="${rescheduleUrl}" style="color:#7c5b3b;">Reschedule your call</a> — no need to email us.
    </p>
  `);

  const teamHtml = wrapperHtml(`
    <p style="margin:0 0 10px;">A discovery call was ${verb}.</p>
    ${callDetailsHtml(input.name, dayLabel, input.callTime)}
    <p style="margin:18px 0 0;">
      Client email: <a href="mailto:${input.email}" style="color:#7c5b3b;">${input.email}</a>
      ${input.company ? `<br />Company: ${input.company}` : ''}
    </p>
    <p style="margin:18px 0 0;">
      Join with this link when it's time: <a href="${DISCOVERY_CALL_MEET_LINK}" style="color:#7c5b3b;">${DISCOVERY_CALL_MEET_LINK}</a>
    </p>
  `);

  const results = await Promise.allSettled([
    resend.emails.send({
      from: FROM,
      to: input.email,
      subject: `Your discovery call is ${verb} - ${dayLabel} at ${input.callTime}`,
      html: clientHtml,
    }),
    resend.emails.send({
      from: FROM,
      to: SITE.email,
      subject: `Discovery call ${verb}: ${input.name} - ${dayLabel} at ${input.callTime}`,
      html: teamHtml,
    }),
  ]);

  for (const result of results) {
    if (result.status === 'rejected') {
      console.error('[email] discovery call send failed:', result.reason);
    }
  }
}
