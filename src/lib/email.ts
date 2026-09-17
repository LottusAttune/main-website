import 'server-only';

import { Resend } from 'resend';

import { FAQS } from '@/data/content';
import { buildDiscoveryCallIcs, buildGoogleCalendarLink } from '@/lib/ics';
import type { DocumentKind, DocumentRow } from '@/lib/pipeline';
import type { BusinessSettings } from '@/lib/settings';
import { formatStudioDate } from '@/lib/pipeline';
import { money, SITE } from '@/lib/site';

/**
 * Permanent Google Meet room, reused for every discovery call rather than
 * generating a fresh link per booking. Update here (and redeploy) if it
 * ever changes - it deliberately lives server-side only, never in a file a
 * client component imports, so it is never shipped in the browser bundle.
 */
export const DISCOVERY_CALL_MEET_LINK = 'https://meet.google.com/eyu-jxag-asc';

const GIFT_CANCELLATION_POLICY = (() => {
  const faq = FAQS.find((f) => f.q === 'Cancellation Policy');
  if (!faq) throw new Error('"Cancellation Policy" FAQ not found in FAQS');
  return faq;
})();

const FROM = 'Lotus Attune <info@lotusattune.com>';
// PNG, not the site's usual WebP - many email clients (older Outlook among
// them) don't render WebP at all. Flattened onto the same cream background
// as the email itself (no transparency) since Gmail's dark-mode processing
// mangles anti-aliased edges on a transparent logo into a blurry mess.
// Cropped straight from the original source-assets/footer-lockup-combo.png
// (not the site's lossy .webp derivative, and not a fresh photo) so the fine
// gold linework survives Gmail's own image recompression without blurring.
// Cache-busted so Gmail's own image proxy - which caches by URL - can't
// keep serving a stale, pre-fix copy of this file to past recipients.
const LOGO_URL = `${SITE.url}/assets/email-logo.png?v=2`;
// Small monochrome glyphs so the footer's two contact methods are visually
// distinguishable at a glance - same flatten-to-cream treatment as the logo.
const MAIL_ICON_URL = `${SITE.url}/assets/email-icon-mail.png`;
const WHATSAPP_ICON_URL = `${SITE.url}/assets/email-icon-whatsapp.png`;

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export function isEmailConfigured(): boolean {
  return resend !== null;
}

export type EmailResult = { ok: boolean; error?: string };

type Attachment = { filename: string; content: Buffer };

/**
 * One send, one honest answer. The dashboard shows `error` verbatim, so a
 * missing key or an unverified domain reads as exactly that rather than as
 * a proposal that quietly never left.
 */
export async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
  attachments?: Attachment[];
  replyTo?: string;
}): Promise<EmailResult> {
  if (!resend) {
    return {
      ok: false,
      error:
        'Email is not connected yet - RESEND_API_KEY is not set on the server.',
    };
  }
  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: input.to,
      replyTo: input.replyTo ?? SITE.email,
      subject: input.subject,
      html: input.html,
      attachments: input.attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
      })),
    });
    if (error) {
      console.error('[email] send failed:', error);
      return { ok: false, error: error.message ?? 'Resend rejected the email.' };
    }
    return { ok: true };
  } catch (error) {
    console.error('[email] send failed:', error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'The email could not be sent.',
    };
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

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
 *
 * The two dark (#241b14) boxes are plain inset tables that live inside this
 * padded body column, so they sit flush with the body text's own margins
 * rather than bleeding to the card's outer edge.
 */
function wrapperHtml(bodyHtml: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:32px 16px;background:#eae6df;font-family:Georgia,'Times New Roman',serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#fffdfa;border:1px solid rgba(59,46,36,0.14);">
      <tr>
        <td style="padding:16px 40px 12px;text-align:center;">
          <img src="${LOGO_URL}" width="208" height="105" alt="Lotus Attune" style="display:block;margin:0 auto;border:0;" />
          <div style="font-family:Arial,Helvetica,sans-serif;font-size:10.5px;letter-spacing:0.18em;text-transform:uppercase;color:#8b6d31;margin-top:6px;">Immersive Soma Sound Experience</div>
        </td>
      </tr>
      <tr>
        <td style="padding:18px 40px 26px;border-top:1px solid rgba(59,46,36,0.14);font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:#5c4c40;">
          ${bodyHtml}
        </td>
      </tr>
      <tr>
        <td style="padding:18px 40px 26px;border-top:1px solid rgba(59,46,36,0.14);font-family:Arial,Helvetica,sans-serif;font-size:12.5px;line-height:1.8;color:#5c4c40;text-align:center;">
          Questions?
          <img src="${MAIL_ICON_URL}" width="13" height="13" alt="" style="vertical-align:middle;margin:0 3px 2px 6px;border:0;" />
          <a href="mailto:${SITE.email}" style="color:#7c5b3b;">${SITE.email}</a>
          &nbsp;&middot;&nbsp;
          <img src="${WHATSAPP_ICON_URL}" width="13" height="13" alt="" style="vertical-align:middle;margin:0 3px 2px 0;border:0;" />
          <a href="${SITE.whatsappHref}" style="color:#7c5b3b;">${SITE.phone}</a><br />
          Toronto Downtown
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/** `withLabel` is who the recipient is meeting - the client's name on
 *  Silvana's own notification copy. Omitted on the client's copy, where a
 *  "With Silvana" data row read as cold; the join-link sentence names her
 *  there instead. */
function callDetailsHtml(
  withLabel: string | null,
  dayLabel: string,
  callTime: string
): string {
  const withRow = withLabel
    ? `
      <tr>
        <td style="font-family:Arial,Helvetica,sans-serif;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:rgba(239,230,218,0.55);padding-bottom:4px;">With</td>
        <td style="text-align:right;font-family:Arial,Helvetica,sans-serif;font-size:14.5px;color:#f6efe5;padding-bottom:4px;">${withLabel}</td>
      </tr>`
    : '';
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#241b14;margin:16px 0;">
      <tr>
        <td style="padding:22px 28px;">
          <div style="font-family:Arial,Helvetica,sans-serif;font-size:10.5px;letter-spacing:0.28em;text-transform:uppercase;color:#c6a97a;margin-bottom:12px;">Discovery Call</div>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${withRow}
            <tr>
              <td style="font-family:Arial,Helvetica,sans-serif;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:rgba(239,230,218,0.55);padding:10px 0 4px;">Date</td>
              <td style="text-align:right;font-family:Arial,Helvetica,sans-serif;font-size:14.5px;color:#f6efe5;padding:10px 0 4px;">${dayLabel}</td>
            </tr>
            <tr>
              <td style="font-family:Arial,Helvetica,sans-serif;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:rgba(239,230,218,0.55);padding:10px 0 0;">Time</td>
              <td style="text-align:right;font-family:Arial,Helvetica,sans-serif;font-size:14.5px;color:#f6efe5;padding:10px 0 0;">${callTime}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>`;
}

function mottoHtml(): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#241b14;margin:18px 0 0;">
      <tr>
        <td style="padding:24px 28px;text-align:center;">
          <div style="font-family:Arial,Helvetica,sans-serif;font-size:10px;letter-spacing:0.28em;text-transform:uppercase;color:#c6a97a;margin-bottom:10px;">Lotus Attune</div>
          <div style="font-family:Georgia,'Times New Roman',serif;font-size:24px;color:#f6efe5;margin-bottom:8px;">Reset. Align. Thrive</div>
          <div style="font-family:Arial,Helvetica,sans-serif;font-size:12.5px;line-height:1.6;color:rgba(239,230,218,0.75);">Create space to recharge, renew and reconnect from within</div>
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
  const rescheduleUrl = `${SITE.url}/discovery-call/reschedule?token=${input.rescheduleToken}`;
  const googleCalendarUrl = buildGoogleCalendarLink({
    callDate: input.callDate,
    callTime: input.callTime,
    meetLink: DISCOVERY_CALL_MEET_LINK,
    organizerEmail: SITE.email,
    whatsappLink: SITE.whatsappHref,
  });

  const clientHtml = wrapperHtml(`
    <p style="margin:0 0 10px;">Hi ${input.name},</p>
    <p style="margin:0;">Your discovery call with Lotus Attune is ${verb}. We'll meet over Google Meet at the time below.</p>
    ${callDetailsHtml(null, dayLabel, input.callTime)}
    <p style="margin:18px 0 0;">
      Join Silvana with this link when it's time: <a href="${DISCOVERY_CALL_MEET_LINK}" style="color:#7c5b3b;">${DISCOVERY_CALL_MEET_LINK}</a>
    </p>
    <p style="margin:18px 0 0;">
      <a href="${googleCalendarUrl}" style="color:#7c5b3b;">Add to Google Calendar</a>, or open the attached invite for Outlook, Apple Calendar and others.
    </p>
    <p style="margin:18px 0 0;">
      Need a different time? <a href="${rescheduleUrl}" style="color:#7c5b3b;">Reschedule your call</a>
    </p>
    ${mottoHtml()}
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
    ${mottoHtml()}
  `);

  const icsContent = buildDiscoveryCallIcs({
    rescheduleToken: input.rescheduleToken,
    clientName: input.name,
    clientEmail: input.email,
    organizerEmail: SITE.email,
    whatsappLink: SITE.whatsappHref,
    callDate: input.callDate,
    callTime: input.callTime,
    meetLink: DISCOVERY_CALL_MEET_LINK,
  });

  const results = await Promise.allSettled([
    resend.emails.send({
      from: FROM,
      to: input.email,
      subject: `Your discovery call is ${verb} - ${dayLabel} at ${input.callTime}`,
      html: clientHtml,
      attachments: [
        {
          filename: 'discovery-call.ics',
          content: Buffer.from(icsContent, 'utf-8'),
          contentType: 'text/calendar; charset=utf-8; method=REQUEST',
        },
      ],
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

// ---------------------------------------------------------------------------
// Documents: proposals, invoices, gift certificates
// ---------------------------------------------------------------------------

/**
 * The document's line items as an email-safe table, so the email stands on
 * its own even when no PDF could be attached.
 */
export function emailBodyHtml(doc: DocumentRow, business: BusinessSettings): string {
  const rows = doc.lines
    .map(
      (line) => `
      <tr>
        <td style="font-family:Arial,Helvetica,sans-serif;font-size:13.5px;color:#f6efe5;padding:7px 0;border-bottom:1px solid rgba(239,230,218,0.12);">${escapeHtml(line.label)}</td>
        <td style="text-align:right;white-space:nowrap;font-family:Arial,Helvetica,sans-serif;font-size:13.5px;color:#f6efe5;padding:7px 0 7px 16px;border-bottom:1px solid rgba(239,230,218,0.12);">${line.amount < 0 ? '−' : ''}${money(Math.abs(line.amount))}</td>
      </tr>`
    )
    .join('');
  const tax =
    doc.taxRate > 0
      ? `<tr>
          <td style="font-family:Arial,Helvetica,sans-serif;font-size:12.5px;color:rgba(239,230,218,0.7);padding:6px 0 0;">${escapeHtml(business.taxLabel)} ${doc.taxRate}%</td>
          <td style="text-align:right;font-family:Arial,Helvetica,sans-serif;font-size:12.5px;color:rgba(239,230,218,0.7);padding:6px 0 0;">${money(doc.tax)}</td>
        </tr>`
      : '';
  const title =
    doc.kind === 'proposal' ? 'Proposal' : doc.kind === 'invoice' ? 'Invoice' : 'Gift certificate';
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#241b14;margin:16px 0;">
      <tr><td style="padding:22px 28px;">
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:10.5px;letter-spacing:0.28em;text-transform:uppercase;color:#c6a97a;margin-bottom:4px;">${title}</div>
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:rgba(239,230,218,0.6);margin-bottom:12px;">${escapeHtml(doc.number)}</div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${rows}
          ${tax}
          <tr>
            <td style="font-family:Georgia,'Times New Roman',serif;font-size:20px;color:#f6efe5;padding:12px 0 0;">Total</td>
            <td style="text-align:right;font-family:Georgia,'Times New Roman',serif;font-size:20px;color:#f6efe5;padding:12px 0 0;">${money(doc.total)} <span style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:rgba(239,230,218,0.6);">CAD</span></td>
          </tr>
        </table>
      </td></tr>
    </table>`;
}

const BUTTON = (href: string, label: string) => `
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:18px 0 6px;">
    <tr><td style="background:#241b14;border-radius:999px;">
      <a href="${href}" style="display:inline-block;padding:14px 32px;font-family:Arial,Helvetica,sans-serif;font-size:11.5px;letter-spacing:0.22em;text-transform:uppercase;color:#f6efe5;text-decoration:none;">${label}</a>
    </td></tr>
  </table>`;

export async function sendDocumentEmail(input: {
  kind: DocumentKind;
  to: string;
  name: string;
  number: string;
  total: number;
  dueOn: string | null;
  summaryHtml: string;
  viewUrl: string;
  pdf: Buffer | null;
  /** Pre-rendered "how to pay" block for invoices (e-transfer, card links). */
  paymentHtml: string;
  giftCode: string | null;
  /** Optional overrides for the invoice email's subject and opening line. */
  subject?: string;
  introHtml?: string;
}): Promise<EmailResult> {
  const first = input.name.split(' ')[0] || input.name;
  let subject: string;
  let body: string;

  if (input.kind === 'proposal') {
    subject = `Your Lotus Attune proposal, ${input.number}`;
    body = `
      <p style="margin:0 0 10px;">Hi ${escapeHtml(first)},</p>
      <p style="margin:0;">Thank you for your booking request. Your proposal is below${input.pdf ? ' and attached as a PDF' : ''}. When you're ready, accept it online and Silvana will confirm your date.</p>
      ${input.summaryHtml}
      ${input.dueOn ? `<p style="margin:0 0 6px;font-size:13px;color:#6f5f52;">This proposal is valid until ${formatStudioDate(input.dueOn)}.</p>` : ''}
      ${BUTTON(input.viewUrl, 'View & accept proposal')}
      <p style="margin:12px 0 0;font-size:13px;">Questions or changes? Just reply to this email.</p>
      ${mottoHtml()}`;
  } else if (input.kind === 'invoice') {
    subject = input.subject ?? `Invoice ${input.number} from Lotus Attune: ${money(input.total)}`;
    body = `
      <p style="margin:0 0 10px;">Hi ${escapeHtml(first)},</p>
      <p style="margin:0;">${input.introHtml ?? `Please find your invoice below${input.pdf ? ' and attached as a PDF' : ''}.${input.dueOn ? ` Payment is due by <strong>${formatStudioDate(input.dueOn)}</strong>.` : ''}`}</p>
      ${input.summaryHtml}
      <div style="margin:0 0 6px;"><div style="font-family:Arial,Helvetica,sans-serif;font-size:10.5px;letter-spacing:0.22em;text-transform:uppercase;color:#7c5b3b;margin-bottom:6px;">How to pay</div><div style="font-size:14px;">${input.paymentHtml.replace(/<a /g, '<a style="color:#7c5b3b;" ')}</div></div>
      ${BUTTON(input.viewUrl, 'View invoice')}
      ${mottoHtml()}`;
  } else {
    subject = input.subject ?? `A Lotus Attune gift certificate for you`;
    body = `
      <p style="margin:0 0 10px;">Hi ${escapeHtml(first)},</p>
      <p style="margin:0;">${input.introHtml ?? `Someone thought of you. Your Lotus Attune gift certificate is ${input.pdf ? 'attached' : 'below'}: a two-hour immersive sound experience in downtown Toronto, ready whenever you are.`}</p>
      ${input.summaryHtml}
      ${input.giftCode ? `<p style="margin:0 0 6px;">Your redemption code: <strong style="letter-spacing:0.12em;">${escapeHtml(input.giftCode)}</strong></p>` : ''}
      <p style="margin:0;">To redeem, book at <a href="${SITE.url}/book" style="color:#7c5b3b;">lotusattune.com/book</a> and enter your code.</p>
      ${BUTTON(input.viewUrl, 'View certificate')}
      <p style="margin:14px 0 0;font-size:12.5px;color:#8a7a63;">${escapeHtml(GIFT_CANCELLATION_POLICY.a)}</p>
      ${mottoHtml()}`;
  }

  return sendEmail({
    to: input.to,
    subject,
    html: wrapperHtml(body),
    attachments: input.pdf
      ? [{ filename: `${input.number}.pdf`, content: input.pdf }]
      : undefined,
  });
}

export async function sendOwnerNotification(input: {
  subject: string;
  html: string;
}): Promise<EmailResult> {
  return sendEmail({
    to: SITE.email,
    subject: input.subject,
    html: wrapperHtml(`${input.html}${mottoHtml()}`),
  });
}

// ---------------------------------------------------------------------------
// Booking request received
// ---------------------------------------------------------------------------

/**
 * A new request needs no email to the client: they go straight from the
 * form to Stripe, and the client only ever hears from us once payment
 * actually lands (see sendBookingConfirmationEmail). This is Silvana's own
 * heads-up that a request came in, with the invoice/deposit it produced.
 */
export async function sendNewBookingOwnerNotification(input: {
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  message: string | null;
  participants: number;
  sessionDate: string;
  sessionTime: string;
  sessionDate2: string | null;
  sessionTime2: string | null;
  total: number;
  venue: string;
  studioUrl: string;
  invoice: { number: string; total: number; deposit: number | null } | null;
}): Promise<EmailResult> {
  const inv = input.invoice;
  const rows: Array<[string, string]> = [
    ['Date', formatStudioDate(input.sessionDate)],
    ['Time', input.sessionTime],
  ];
  if (input.sessionDate2) {
    rows.push(['Second session', `${formatStudioDate(input.sessionDate2)} · ${input.sessionTime2 ?? ''}`]);
  }
  rows.push(
    ['Participants', input.participants === 1 ? 'One-on-one' : String(input.participants)],
    ['Venue', input.venue],
    inv ? ['Invoice total', money(inv.total)] : ['Estimated total', money(input.total)]
  );
  const details = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#241b14;margin:16px 0;">
      <tr><td style="padding:22px 28px;">
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:10.5px;letter-spacing:0.28em;text-transform:uppercase;color:#c6a97a;margin-bottom:12px;">Your request</div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${rows
            .map(
              ([k, v]) => `<tr>
              <td style="font-family:Arial,Helvetica,sans-serif;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:rgba(239,230,218,0.55);padding:8px 0 2px;">${escapeHtml(k)}</td>
              <td style="text-align:right;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#f6efe5;padding:8px 0 2px;">${escapeHtml(v)}</td>
            </tr>`
            )
            .join('')}
        </table>
      </td></tr>
    </table>`;

  return sendEmail({
    to: SITE.email,
    subject: `New booking request: ${input.name}, ${formatStudioDate(input.sessionDate)}, ${money(input.total)}`,
    html: wrapperHtml(`
      <p style="margin:0 0 10px;">A new booking request just landed in the studio.${inv ? ` Invoice ${escapeHtml(inv.number)} is ready${inv.deposit !== null ? ` (${money(inv.deposit)} deposit to confirm)` : ''} — the client is on their way to pay it now.` : ''}</p>
      ${details}
      <p style="margin:0 0 6px;"><strong>${escapeHtml(input.name)}</strong>${input.company ? ` · ${escapeHtml(input.company)}` : ''}</p>
      <p style="margin:0 0 6px;"><a href="mailto:${escapeHtml(input.email)}" style="color:#7c5b3b;">${escapeHtml(input.email)}</a>${input.phone ? ` · ${escapeHtml(input.phone)}` : ''}</p>
      ${input.message ? `<p style="margin:12px 0 0;padding:12px 16px;background:#f6efe5;border-left:3px solid #c6a97a;">${escapeHtml(input.message).replace(/\n/g, '<br />')}</p>` : ''}
      ${BUTTON(input.studioUrl, 'Open in studio')}
      ${mottoHtml()}`),
  });
}

// ---------------------------------------------------------------------------
// Booking confirmed / reminder / receipt
// ---------------------------------------------------------------------------

export type SessionEmailInput = {
  name: string;
  email: string;
  participants: number;
  sessionDate: string;
  sessionTime: string;
  sessionDate2: string | null;
  sessionTime2: string | null;
  venue: string;
  venueCopy: readonly string[];
  venueDetails: string;
  cancellationPolicy: string;
  faqs: ReadonlyArray<{ q: string; a: string }>;
  googleCalendarUrl: string;
  ics: string;
  amountPaid: number;
  balanceDue: number;
  balanceChargeDate: string | null;
  portalUrl: string | null;
  /** Set when this confirmation is also the receipt for the payment that
   *  triggered it — folds "payment received" and "you're confirmed" into
   *  one email instead of two. */
  paymentJustReceived?: { amount: number; method: string; kind: string } | null;
  invoiceNumber?: string | null;
  invoicePdf?: Buffer | null;
};

function paymentKindLabel(kind: string): string {
  switch (kind) {
    case 'deposit':
      return 'your deposit';
    case 'balance':
      return 'the remaining balance';
    case 'cancellation_fee':
      return 'the cancellation fee';
    default:
      return 'your payment';
  }
}

/** "Your booking page": the countdown, the details, add-ons and the invoice, all in one link. */
function portalSection(url: string): string {
  return `
    ${sectionTitle('Your booking page')}
    <p style="margin:0 0 4px;">Everything for the day in one place: a countdown to your session, the details, your invoice, calendar links, and extras you can add to your experience.</p>
    ${BUTTON(url, 'Open your booking page')}`;
}

function sessionBoxHtml(input: SessionEmailInput, eyebrow: string): string {
  const rows: Array<[string, string]> = [
    ['Date', formatStudioDate(input.sessionDate)],
    ['Time', input.sessionTime],
  ];
  if (input.sessionDate2) {
    rows.push(['Second session', `${formatStudioDate(input.sessionDate2)} · ${input.sessionTime2 ?? ''}`]);
  }
  rows.push(
    ['Participants', input.participants === 1 ? 'One-on-one' : String(input.participants)],
    ['Venue', input.venue]
  );
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#241b14;margin:16px 0;">
      <tr><td style="padding:22px 28px;">
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:10.5px;letter-spacing:0.28em;text-transform:uppercase;color:#c6a97a;margin-bottom:12px;">${eyebrow}</div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${rows
            .map(
              ([k, v]) => `<tr>
              <td style="font-family:Arial,Helvetica,sans-serif;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:rgba(239,230,218,0.55);padding:8px 0 2px;">${escapeHtml(k)}</td>
              <td style="text-align:right;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#f6efe5;padding:8px 0 2px;">${escapeHtml(v)}</td>
            </tr>`
            )
            .join('')}
        </table>
      </td></tr>
    </table>`;
}

function sectionTitle(text: string): string {
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:10.5px;letter-spacing:0.22em;text-transform:uppercase;color:#7c5b3b;margin:22px 0 8px;">${text}</div>`;
}

function venueSection(input: SessionEmailInput): string {
  return `
    ${sectionTitle('Getting there')}
    ${input.venueCopy.map((p) => `<p style="margin:0 0 8px;">${escapeHtml(p)}</p>`).join('')}
    ${input.venueDetails ? `<p style="margin:0 0 8px;">${escapeHtml(input.venueDetails).replace(/\n/g, '<br />')}</p>` : ''}
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:10px 0 4px;"><tr>
      <td style="background:#241b14;border-radius:999px;"><a href="${input.googleCalendarUrl}" style="display:inline-block;padding:12px 24px;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#f6efe5;text-decoration:none;">Add to Google Calendar</a></td>
    </tr></table>
    <p style="margin:0;font-size:12.5px;color:#6f5f52;">Apple or Outlook? Open the attached calendar file.</p>`;
}

export async function sendBookingConfirmationEmail(input: SessionEmailInput): Promise<EmailResult> {
  const first = input.name.split(' ')[0] || input.name;
  const received = input.paymentJustReceived;
  const intro = received
    ? `Thank you, we received ${paymentKindLabel(received.kind)} of <strong>${money(received.amount)}</strong> by ${escapeHtml(received.method)}${input.invoiceNumber ? ` against ${escapeHtml(input.invoiceNumber)}` : ''}. Your date is confirmed - everything you need is below.`
    : 'Your Lotus Attune experience is confirmed. Everything you need is below.';
  const payment =
    input.balanceDue > 0
      ? `<p style="margin:0 0 8px;">Remaining balance: <strong>${money(input.balanceDue)}</strong>${input.balanceChargeDate ? ` will be charged to your card on ${formatStudioDate(input.balanceChargeDate)}` : ' due before your session'}.</p>`
      : input.amountPaid > 0
        ? `<p style="margin:0 0 8px;">Paid in full. Nothing more to do.</p>`
        : '';
  const html = wrapperHtml(`
    <p style="margin:0 0 10px;">Hi ${escapeHtml(first)},</p>
    <p style="margin:0;">${intro}</p>
    ${sessionBoxHtml(input, 'Your session')}
    ${payment}
    ${input.portalUrl ? portalSection(input.portalUrl) : ''}
    ${venueSection(input)}
    ${sectionTitle('Good to know')}
    ${input.faqs
      .map(
        (f) => `<p style="margin:0 0 10px;"><strong>${escapeHtml(f.q)}</strong><br />${escapeHtml(f.a)}</p>`
      )
      .join('')}
    ${input.cancellationPolicy ? `${sectionTitle('Cancellation policy')}<p style="margin:0 0 16px;">${escapeHtml(input.cancellationPolicy).replace(/\n/g, '<br />')}</p>` : ''}
    <p style="margin:0;">We're looking forward to welcoming you and creating space for a truly restorative reset.</p>
    ${mottoHtml()}`);

  return sendEmail({
    to: input.email,
    subject: `Confirmed: your Lotus Attune experience on ${formatStudioDate(input.sessionDate)}`,
    html,
    attachments: [
      { filename: 'lotus-attune-session.ics', content: Buffer.from(input.ics, 'utf8') },
      ...(input.invoicePdf && input.invoiceNumber
        ? [{ filename: `${input.invoiceNumber}.pdf`, content: input.invoicePdf }]
        : []),
    ],
  });
}

export async function sendReminderEmail(input: SessionEmailInput): Promise<EmailResult> {
  const first = input.name.split(' ')[0] || input.name;
  const html = wrapperHtml(`
    <p style="margin:0 0 10px;">Hi ${escapeHtml(first)},</p>
    <p style="margin:0;">A gentle reminder - your Lotus Attune experience is coming up. Comfortable clothing and socks are all you need; everything else is provided.</p>
    ${sessionBoxHtml(input, 'Coming up')}
    ${input.portalUrl ? portalSection(input.portalUrl) : ''}
    ${venueSection(input)}
    ${input.balanceDue > 0 ? `<p style="margin:16px 0 0;">Balance outstanding: <strong>${money(input.balanceDue)}</strong>.</p>` : ''}
    ${input.cancellationPolicy ? `${sectionTitle('Cancellation policy')}<p style="margin:0;">${escapeHtml(input.cancellationPolicy).replace(/\n/g, '<br />')}</p>` : ''}
    ${mottoHtml()}`);

  return sendEmail({
    to: input.email,
    subject: `See you soon: ${formatStudioDate(input.sessionDate)} at ${input.sessionTime}`,
    html,
    attachments: [{ filename: 'lotus-attune-session.ics', content: Buffer.from(input.ics, 'utf8') }],
  });
}

/** Sent N days before the session when the rest of the invoice is still owed and there is no card to charge. */
export async function sendBalanceRequestEmail(input: {
  name: string;
  email: string;
  number: string;
  balance: number;
  sessionDate: string;
  sessionTime: string | null;
  dueOn: string | null;
  paymentHtml: string;
  viewUrl: string;
}): Promise<EmailResult> {
  const first = input.name.split(' ')[0] || input.name;
  const html = wrapperHtml(`
    <p style="margin:0 0 10px;">Hi ${escapeHtml(first)},</p>
    <p style="margin:0 0 12px;">Your Lotus Attune experience is coming up on <strong>${formatStudioDate(input.sessionDate)}</strong>${input.sessionTime ? ` at ${escapeHtml(input.sessionTime)}` : ''}. The remaining balance of <strong>${money(input.balance)}</strong> on invoice ${escapeHtml(input.number)} is now due${input.dueOn ? `, by ${formatStudioDate(input.dueOn)}` : ''}.</p>
    <div style="margin:0 0 6px;">${sectionTitle('How to pay')}<div style="font-size:14px;">${input.paymentHtml.replace(/<a /g, '<a style="color:#7c5b3b;" ')}</div></div>
    ${BUTTON(input.viewUrl, 'View invoice')}
    <p style="margin:12px 0 0;font-size:13px;">Already sent it? Thank you, please ignore this note.</p>
    ${mottoHtml()}`);
  return sendEmail({
    to: input.email,
    subject: `Balance due: ${money(input.balance)} for your Lotus Attune session on ${formatStudioDate(input.sessionDate)}`,
    html,
  });
}

export async function sendReceiptEmail(input: {
  name: string;
  email: string;
  number: string;
  amount: number;
  method: string;
  kind: string;
  balanceDue: number;
  viewUrl: string;
  /** The invoice as it stands after this payment. */
  pdf?: Buffer | null;
}): Promise<EmailResult> {
  const first = input.name.split(' ')[0] || input.name;
  return sendEmail({
    to: input.email,
    subject: `Payment received: ${money(input.amount)} for ${input.number}`,
    html: wrapperHtml(`
      <p style="margin:0 0 10px;">Hi ${escapeHtml(first)},</p>
      <p style="margin:0;">Thank you, we received ${paymentKindLabel(input.kind)} of <strong>${money(input.amount)}</strong> by ${escapeHtml(input.method)} against ${escapeHtml(input.number)}.${input.balanceDue > 0 ? ` The remaining balance is ${money(input.balanceDue)}.` : ' Your account is settled.'}${input.pdf ? ' The updated invoice is attached.' : ''}</p>
      ${BUTTON(input.viewUrl, 'View invoice')}
      ${mottoHtml()}`),
    attachments: input.pdf ? [{ filename: `${input.number}.pdf`, content: input.pdf }] : undefined,
  });
}
