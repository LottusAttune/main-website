'use client';

import Image from 'next/image';

import { asset } from '@/lib/images';
import {
  balanceDue,
  formatShortDate,
  formatStudioDate,
  isOverdue,
  relativeDays,
  type ActivityEntry,
  type StudioData,
} from '@/lib/pipeline';
import { money } from '@/lib/site';
import type { ViewKey } from '../StudioShell';
import styles from '../studio.module.css';
import local from './Today.module.css';

type Props = { data: StudioData; onNavigate: (view: ViewKey) => void };

/** One row of the "Needs you" list. Only rows with a count > 0 are shown. */
type ActionItem = {
  key: string;
  label: string;
  count: number;
  view: ViewKey;
  urgent: boolean;
};

/** A session or discovery call in the "Coming up" list. */
type UpcomingItem = {
  key: string;
  sortKey: string;
  title: string;
  sub: string;
  value: string | null;
};

const DAY_MS = 86_400_000;

function greeting(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/** The ISO date `days` after `iso`, stepped at UTC noon so DST cannot shift it. */
function shiftIso(iso: string, days: number): string {
  const base = new Date(`${iso}T12:00:00Z`).getTime();
  return new Date(base + days * DAY_MS).toISOString().slice(0, 10);
}

/** "1 invoice" / "3 invoices". */
function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** Date + time as a sortable string; null dates sort last. */
function whenKey(date: string | null, time: string | null): string {
  return `${date ?? '9999-99-99'} ${time ?? ''}`;
}

const ACTIVITY_LABELS: Record<string, string> = {
  received: 'New request',
  proposal_sent: 'Proposal sent',
  proposal_accepted: 'Proposal accepted',
  invoice_sent: 'Invoice sent',
  invoice_paid: 'Invoice paid',
  deposit_paid: 'Deposit paid',
  balance_requested: 'Balance requested',
  terms_accepted: 'Terms accepted',
  addon_added: 'Add-on added',
  confirmation_sent: 'Confirmation sent',
  reminder_sent: 'Reminder sent',
  email_failed: '⚠ Email failed',
  charge_failed: 'Card charge failed',
};

function activityLabel(kind: string): string {
  return ACTIVITY_LABELS[kind] ?? kind.replace(/_/g, ' ');
}

function ActivityBody({ entry, name }: { entry: ActivityEntry; name: string | null }) {
  const prefix = name ? `${name} · ` : '';

  if (entry.kind === 'note') {
    return (
      <div className={styles.timelineBody}>
        {prefix}Note
        {entry.body ? (
          <span className={`${styles.timelineNote} ${local.noteBlock}`}>{entry.body}</span>
        ) : null}
      </div>
    );
  }

  if (entry.kind === 'stage') {
    return (
      <div className={styles.timelineBody}>
        {prefix}
        {entry.body ?? 'Stage changed'}
      </div>
    );
  }

  return (
    <div className={styles.timelineBody}>
      {prefix}
      {activityLabel(entry.kind)}
      {entry.body ? ` — ${entry.body}` : ''}
    </div>
  );
}

export function Today({ data, onNavigate }: Props) {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const weekEnd = shiftIso(today, 7);
  const threeDaysOut = shiftIso(today, 3);
  const month = today.slice(0, 7);
  const mark = asset('logo-circle');

  /* ---- Work out what needs her ------------------------------------- */

  const invoices = data.documents.filter((d) => d.kind === 'invoice');
  const proposals = data.documents.filter((d) => d.kind === 'proposal');

  const overdue = invoices.filter((d) => isOverdue(d, now));
  const overdueDue = overdue.reduce((sum, d) => sum + balanceDue(d), 0);

  const newEnquiries = data.leads.filter((l) => l.status === 'new_enquiry');
  const staleEnquiry = newEnquiries.some(
    (l) => now.getTime() - new Date(l.createdAt).getTime() > 2 * DAY_MS
  );

  const invoicedLeadIds = new Set(
    invoices
      .filter((d) => d.status === 'sent' || d.status === 'paid')
      .map((d) => d.bookingId)
  );
  const withoutInvoice = data.leads.filter(
    (l) =>
      (l.status === 'new_enquiry' || l.status === 'contacted') &&
      !invoicedLeadIds.has(l.id)
  );

  const awaitingAnswer = proposals.filter((d) => d.status === 'sent');
  const oldestSentAt =
    awaitingAnswer
      .map((d) => d.sentAt)
      .filter((s): s is string => Boolean(s))
      .sort()[0] ?? null;

  const draftInvoices = invoices.filter((d) => d.status === 'draft');
  const unpaid = invoices.filter(
    (d) => d.status === 'sent' && !isOverdue(d, now) && balanceDue(d) > 0
  );
  const unpaidDue = unpaid.reduce((sum, d) => sum + balanceDue(d), 0);

  const booked = data.bookings.filter((b) => b.status === 'booked');
  const unconfirmed = booked.filter(
    (b) => b.sessionDate !== null && b.sessionDate >= today && !b.confirmationSentAt
  );
  const sessionsThisWeek = booked
    .filter((b) => b.sessionDate !== null && b.sessionDate >= today && b.sessionDate <= weekEnd)
    .sort((a, b) =>
      whenKey(a.sessionDate, a.sessionTime).localeCompare(whenKey(b.sessionDate, b.sessionTime))
    );
  const toMarkComplete = booked.filter((b) => b.sessionDate !== null && b.sessionDate < today);

  const giftsToIssue = data.giftCards.filter((g) => g.status === 'requested');

  const liveCalls = data.discoveryCalls.filter((c) => c.status !== 'cancelled');
  const callsSoon = liveCalls.filter((c) => c.callDate >= today && c.callDate <= threeDaysOut);
  const callsThisWeek = liveCalls.filter((c) => c.callDate >= today && c.callDate <= weekEnd);

  const allActions: ActionItem[] = [
    {
      key: 'overdue',
      view: 'invoices',
      urgent: true,
      count: overdue.length,
      label: `${plural(overdue.length, 'invoice', 'invoices')} overdue · ${money(overdueDue)}`,
    },
    {
      key: 'enquiries',
      view: 'leads',
      urgent: staleEnquiry,
      count: newEnquiries.length,
      label: `${plural(newEnquiries.length, 'new enquiry', 'new enquiries')} waiting for a reply`,
    },
    {
      key: 'invoices-to-send-leads',
      view: 'leads',
      urgent: false,
      count: withoutInvoice.length,
      label: `${plural(withoutInvoice.length, 'lead', 'leads')} without an invoice sent`,
    },
    {
      key: 'proposals-awaiting',
      view: 'leads',
      urgent: false,
      count: awaitingAnswer.length,
      label:
        `${plural(awaitingAnswer.length, 'proposal', 'proposals')} awaiting the client's answer` +
        (oldestSentAt ? ` · oldest ${relativeDays(oldestSentAt, now)}` : ''),
    },
    {
      key: 'invoices-to-send',
      view: 'invoices',
      urgent: false,
      count: draftInvoices.length,
      label: `${plural(draftInvoices.length, 'invoice', 'invoices')} to send`,
    },
    {
      key: 'unpaid',
      view: 'invoices',
      urgent: false,
      count: unpaid.length,
      label: `${plural(unpaid.length, 'invoice', 'invoices')} sent, ${money(unpaidDue)} outstanding`,
    },
    {
      key: 'confirmations',
      view: 'bookings',
      urgent: false,
      count: unconfirmed.length,
      label: `${plural(unconfirmed.length, 'confirmation', 'confirmations')} to send`,
    },
    {
      key: 'sessions-week',
      view: 'bookings',
      urgent: false,
      count: sessionsThisWeek.length,
      label: `${plural(sessionsThisWeek.length, 'session', 'sessions')} in the next 7 days`,
    },
    {
      key: 'gifts',
      view: 'gifts',
      urgent: false,
      count: giftsToIssue.length,
      label: `${plural(giftsToIssue.length, 'gift card', 'gift cards')} to issue`,
    },
    {
      key: 'calls',
      view: 'calls',
      urgent: false,
      count: callsSoon.length,
      label: `${plural(callsSoon.length, 'discovery call', 'discovery calls')} in the next 3 days`,
    },
    {
      key: 'complete',
      view: 'bookings',
      urgent: false,
      count: toMarkComplete.length,
      label: `${plural(toMarkComplete.length, 'session', 'sessions')} to mark complete`,
    },
  ];
  const actions = allActions.filter((item) => item.count > 0);

  /* ---- Welcome line ------------------------------------------------- */

  const nextSession =
    booked
      .filter((b) => b.sessionDate !== null && b.sessionDate >= today)
      .sort((a, b) =>
        whenKey(a.sessionDate, a.sessionTime).localeCompare(whenKey(b.sessionDate, b.sessionTime))
      )[0] ?? null;

  const needsLine =
    actions.length === 0
      ? 'Nothing is waiting on you.'
      : `${actions.length} ${actions.length === 1 ? 'thing needs' : 'things need'} you today.`;
  const nextLine = nextSession
    ? `Next session: ${nextSession.name} on ${formatShortDate(nextSession.sessionDate)}.`
    : 'No sessions are booked yet.';

  /* ---- Integrations ------------------------------------------------- */

  const integrationItems: Array<{ label: string; on: boolean }> = [
    { label: 'Email', on: data.integrations.email },
    { label: 'PDFs', on: data.integrations.pdf },
    { label: 'Card payments', on: data.integrations.stripe },
    { label: 'Calendar', on: data.integrations.calendar },
  ];
  const anyOff = integrationItems.some((item) => !item.on);

  /* ---- Stat tiles --------------------------------------------------- */

  const openLeads = data.leads.filter(
    (l) => l.status === 'new_enquiry' || l.status === 'contacted'
  );
  const bookedThisMonth = data.bookings.filter(
    (b) =>
      (b.status === 'booked' || b.status === 'complete') &&
      b.sessionDate !== null &&
      b.sessionDate.startsWith(month)
  );
  const bookedThisMonthValue = bookedThisMonth.reduce((sum, b) => sum + b.total, 0);
  const openInvoices = invoices.filter((d) => d.status !== 'void' && d.status !== 'paid');
  const outstanding = openInvoices.reduce((sum, d) => sum + balanceDue(d), 0);
  const receivedRows = data.payments.filter(
    (p) =>
      p.createdAt.slice(0, 7) === month &&
      p.kind !== 'refund' &&
      p.kind !== 'cancellation_fee'
  );
  const received = receivedRows.reduce((sum, p) => sum + p.amount, 0);

  const stats = [
    { label: 'Open leads', value: String(openLeads.length), note: 'Awaiting your reply' },
    {
      label: 'Booked this month',
      value: String(bookedThisMonth.length),
      note: money(bookedThisMonthValue),
    },
    {
      label: 'Outstanding',
      value: money(outstanding),
      note: plural(openInvoices.length, 'invoice', 'invoices'),
    },
    {
      label: 'Received this month',
      value: money(received),
      note: plural(receivedRows.length, 'payment', 'payments'),
    },
  ];

  /* ---- Coming up ---------------------------------------------------- */

  const upcoming: UpcomingItem[] = [
    ...sessionsThisWeek.map((b) => ({
      key: `session-${b.id}`,
      sortKey: whenKey(b.sessionDate, b.sessionTime),
      title: `${formatStudioDate(b.sessionDate)}${b.sessionTime ? ` · ${b.sessionTime}` : ''}`,
      sub: [
        b.name + (b.company ? ` · ${b.company}` : ''),
        b.participants === 1 ? 'One-on-one' : `${b.participants} participants`,
        b.venue,
      ].join(' · '),
      value: money(b.total),
    })),
    ...callsThisWeek.map((c) => ({
      key: `call-${c.id}`,
      sortKey: whenKey(c.callDate, c.callTime),
      title: `${formatStudioDate(c.callDate)} · ${c.callTime} · Discovery call`,
      sub: c.name + (c.company ? ` · ${c.company}` : ''),
      value: null,
    })),
  ].sort((a, b) => a.sortKey.localeCompare(b.sortKey));

  /* ---- Recent activity ---------------------------------------------- */

  const namesByBooking = new Map<string, string>();
  for (const lead of data.leads) namesByBooking.set(lead.id, lead.name);
  for (const booking of data.bookings) namesByBooking.set(booking.id, booking.name);

  const recent = [...data.activity]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 12);

  /* ---- Render ------------------------------------------------------- */

  return (
    <>
      <div className={styles.welcome}>
        <Image
          src={mark.src}
          alt=""
          width={64}
          height={64}
          className={styles.welcomeMark}
        />
        <div style={{ minWidth: 0 }}>
          <div className={styles.welcomeDate}>
            {now.toLocaleDateString('en-CA', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </div>
          <h2 className={styles.welcomeGreeting}>
            {greeting(now.getHours())}, Silvana
          </h2>
          <p className={styles.welcomeLine}>
            {needsLine} {nextLine}
          </p>
        </div>
      </div>

      <div className={styles.integrations}>
        {integrationItems.map((item) => (
          <span
            key={item.label}
            className={`${styles.integration} ${item.on ? '' : styles.integrationOff}`}
          >
            <span className={styles.integrationDot} aria-hidden="true" />
            {item.on ? item.label : `${item.label} off`}
          </span>
        ))}
      </div>
      {anyOff ? (
        <p className={styles.priceNote}>
          Off items need their API key added in Vercel → Settings → Environment
          Variables (see Settings tab for which).
        </p>
      ) : null}

      <h3 className={styles.subhead}>Needs you</h3>
      <div className={styles.actionList}>
        {actions.length === 0 ? (
          <div className={`${styles.actionItem} ${styles.actionItemDone}`}>
            <span className={local.actionLabel}>Nothing needs you right now.</span>
          </div>
        ) : (
          actions.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`${styles.actionItem} ${item.urgent ? styles.actionItemUrgent : ''}`}
              onClick={() => onNavigate(item.view)}
            >
              <span className={local.actionLabel}>{item.label}</span>
              <span
                className={`${styles.actionCount} ${item.urgent ? styles.actionCountUrgent : ''}`}
              >
                {item.count}
              </span>
              <span className={styles.actionArrow} aria-hidden="true">
                ›
              </span>
            </button>
          ))
        )}
      </div>

      <div className={styles.statGrid}>
        {stats.map((stat) => (
          <div key={stat.label} className={`card ${styles.stat}`}>
            <div className={styles.statLabel}>{stat.label}</div>
            <div className={styles.statValue}>{stat.value}</div>
            <div className={styles.statNote}>{stat.note}</div>
          </div>
        ))}
      </div>

      <h3 className={styles.subhead}>Coming up</h3>
      {upcoming.length === 0 ? (
        <div className={styles.empty}>Nothing scheduled in the next 7 days.</div>
      ) : (
        <div className={styles.cardList}>
          {upcoming.map((item) => (
            <div key={item.key} className={styles.recordCard}>
              <div className={local.recordRow}>
                <div className={local.recordText}>
                  <div className={styles.recordTitle}>{item.title}</div>
                  <div className={styles.recordSub}>{item.sub}</div>
                </div>
                {item.value ? <div className={styles.recordValue}>{item.value}</div> : null}
              </div>
            </div>
          ))}
        </div>
      )}

      <h3 className={styles.subhead}>Recent activity</h3>
      {recent.length === 0 ? (
        <div className={styles.empty}>No activity yet.</div>
      ) : (
        <div className={styles.timeline}>
          {recent.map((entry) => (
            <div key={entry.id} className={styles.timelineItem}>
              <div className={styles.timelineWhen}>{formatShortDate(entry.createdAt)}</div>
              <ActivityBody
                entry={entry}
                name={entry.bookingId ? namesByBooking.get(entry.bookingId) ?? null : null}
              />
            </div>
          ))}
        </div>
      )}
    </>
  );
}
