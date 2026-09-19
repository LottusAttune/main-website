/**
 * Shapes and constants shared by the studio's server queries and its client
 * panels. Kept out of `lib/studio.ts` because that module is `server-only` and
 * the panels are Client Components.
 */

import { toTorontoDateIso } from '@/lib/site';

/** Kanban stages, in order. A lead's `status` is one of these keys. */
export const STAGES = [
  { key: 'new_enquiry', label: 'New enquiry' },
  { key: 'contacted', label: 'Contacted' },
  { key: 'proposal_sent', label: 'Invoice sent' },
  { key: 'booked', label: 'Booked' },
  { key: 'complete', label: 'Complete' },
] as const;

export type StageKey = (typeof STAGES)[number]['key'];

export const STAGE_KEYS = STAGES.map((stage) => stage.key);

export type Lead = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  /** What the client wrote in the booking form's message box. */
  message: string | null;
  participants: number;
  sessionDate: string | null;
  sessionTime: string | null;
  /** Split sessions (groups over 12) run a second time slot the same day. */
  sessionDate2: string | null;
  sessionTime2: string | null;
  teamAddon: boolean;
  isPackage: boolean;
  isCorporateIntro: boolean;
  discountCode: string | null;
  gratuity: number;
  total: number;
  /** A cancelled booking keeps its record but drops off the Kanban board -
   *  it is not one of the pipeline `STAGES`. */
  status: StageKey | 'cancelled';
  createdAt: string;
  type: string;
  venue: string;
  calendarEventId: string | null;
  calendarEventId2: string | null;
  /** A card saved through Stripe, usable for the balance or a late fee. */
  cardOnFile: boolean;
  confirmationSentAt: string | null;
  reminderSentAt: string | null;
  balanceChargedAt: string | null;
  balanceRequestedAt: string | null;
  termsAcceptedAt: string | null;
  /** The client's private booking page. */
  portalUrl: string | null;
  cancellationFeeChargedAt: string | null;
};

export type PaymentRow = {
  id: string;
  documentId: string | null;
  bookingId: string | null;
  giftId: string | null;
  amount: number;
  method: string;
  kind: string;
  note: string | null;
  createdAt: string;
};

export type BookingRow = Lead;

export type GiftCard = {
  id: string;
  recipientName: string;
  recipientEmail: string | null;
  buyerName: string | null;
  buyerEmail: string;
  format: string;
  sessions: number | null;
  participants: number | null;
  teamAddon: boolean;
  code: string | null;
  total: number;
  gratuity: number;
  status: string;
  createdAt: string;
};

export type ReviewRow = {
  id: string;
  name: string;
  meta: string;
  body: string;
  isPublished: boolean;
};

export type Client = {
  /** Lower-cased email: the key everything about a person is grouped by. */
  key: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  /** Booked or completed sessions. */
  sessions: number;
  /** Every booking request they ever made, whatever became of it. */
  requests: number;
  totalParticipants: number;
  /** Ever booked the team-building add-on, across any of their sessions. */
  teamAddon: boolean;
  /** Quoted value of booked or completed sessions. */
  lifetimeValue: number;
  /** Money actually received, across all their invoices. */
  paidValue: number;
  /** Still owed on open invoices. */
  outstanding: number;
  lastSession: string | null;
  nextSession: string | null;
  firstSeen: string;
  cardOnFile: boolean;
  termsAcceptedAt: string | null;
  giftCardsBought: number;
  discoveryCalls: number;
  /** Ids of their bookings, newest first, for the card's history. */
  leadIds: string[];
};

/** Human labels for the activity feed, shared by every panel. */
export const ACTIVITY_LABELS: Record<string, string> = {
  received: 'Request received',
  stage: 'Stage',
  note: 'Note',
  proposal_created: 'Proposal drafted',
  proposal_sent: 'Proposal sent',
  proposal_accepted: 'Proposal accepted',
  proposal_declined: 'Proposal declined',
  proposal_void: 'Proposal voided',
  invoice_created: 'Invoice drafted',
  invoice_sent: 'Invoice sent',
  invoice_paid: 'Invoice paid',
  invoice_void: 'Invoice voided',
  deposit_paid: 'Deposit paid',
  balance_requested: 'Balance requested',
  terms_accepted: 'Terms accepted',
  addon_added: 'Add-on added',
  confirmation_sent: 'Confirmation sent',
  reminder_sent: 'Reminder sent',
  cancelled: 'Cancelled',
  cancellation_fee_charged: 'Cancellation fee charged',
  payment_on_void: '⚠ Payment on a void invoice',
  record_failed: '⚠ Payment not recorded',
  email_failed: '⚠ Email failed',
  charge_failed: '⚠ Card charge failed',
};

/**
 * Everyone the business has dealt with, one card per email: booking
 * requests (any stage), gift-card buyers and discovery calls, with the
 * money side worked out from invoices and payments. Derived, not stored.
 */
export function buildContacts(input: {
  leads: Lead[];
  documents: DocumentRow[];
  payments: PaymentRow[];
  giftCards: GiftCard[];
  discoveryCalls: DiscoveryCallRow[];
}): Client[] {
  const today = new Date().toISOString().slice(0, 10);
  const byKey = new Map<string, Client>();
  const keyOf = (email: string) => email.trim().toLowerCase();

  const ensure = (email: string, name: string, phone: string | null, company: string | null, seen: string): Client => {
    const key = keyOf(email);
    let c = byKey.get(key);
    if (!c) {
      c = {
        key, name, email, phone, company,
        sessions: 0, requests: 0, totalParticipants: 0, teamAddon: false,
        lifetimeValue: 0, paidValue: 0, outstanding: 0,
        lastSession: null, nextSession: null, firstSeen: seen,
        cardOnFile: false, termsAcceptedAt: null, giftCardsBought: 0, discoveryCalls: 0, leadIds: [],
      };
      byKey.set(key, c);
    } else {
      if (seen < c.firstSeen) c.firstSeen = seen;
      if (phone && !c.phone) c.phone = phone;
      if (company && !c.company) c.company = company;
    }
    return c;
  };

  const paidByDocument = new Map<string, number>();
  for (const p of input.payments) {
    if (!p.documentId || p.kind === 'refund' || p.kind === 'cancellation_fee') continue;
    paidByDocument.set(p.documentId, (paidByDocument.get(p.documentId) ?? 0) + p.amount);
  }

  const sortedLeads = [...input.leads].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  for (const lead of sortedLeads) {
    const c = ensure(lead.email, lead.name, lead.phone, lead.company, lead.createdAt);
    c.requests += 1;
    c.leadIds.push(lead.id);
    if (lead.cardOnFile) c.cardOnFile = true;
    if (lead.termsAcceptedAt && (!c.termsAcceptedAt || lead.termsAcceptedAt > c.termsAcceptedAt)) c.termsAcceptedAt = lead.termsAcceptedAt;
    const live = lead.status === 'booked' || lead.status === 'complete';
    if (live) {
      c.sessions += 1;
      c.totalParticipants += lead.participants;
      c.lifetimeValue += lead.total;
      if (lead.teamAddon) c.teamAddon = true;
      if (lead.sessionDate) {
        if (lead.sessionDate < today && (!c.lastSession || lead.sessionDate > c.lastSession)) c.lastSession = lead.sessionDate;
        if (lead.sessionDate >= today && (!c.nextSession || lead.sessionDate < c.nextSession)) c.nextSession = lead.sessionDate;
      }
    }
  }

  for (const doc of input.documents) {
    if (doc.kind !== 'invoice' || doc.status === 'void') continue;
    const c = byKey.get(keyOf(doc.clientEmail));
    if (!c) continue;
    const paid = Math.max(doc.paidAmount, paidByDocument.get(doc.id) ?? 0);
    c.paidValue += paid;
    if (doc.status !== 'paid') c.outstanding += Math.max(0, doc.total - paid);
  }

  for (const gift of input.giftCards) {
    const c = ensure(gift.buyerEmail, gift.buyerName ?? gift.buyerEmail, null, null, gift.createdAt);
    c.giftCardsBought += 1;
  }

  for (const call of input.discoveryCalls) {
    const c = ensure(call.email, call.name, call.phone, call.company, call.createdAt);
    c.discoveryCalls += 1;
  }

  return [...byKey.values()].sort((a, b) => {
    if (b.lifetimeValue !== a.lifetimeValue) return b.lifetimeValue - a.lifetimeValue;
    return a.firstSeen < b.firstSeen ? 1 : -1;
  });
}

export type DiscoveryCallRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  callDate: string;
  callTime: string;
  message: string | null;
  status: string;
  createdAt: string;
};

export type DocumentKind = 'proposal' | 'invoice' | 'certificate';

export type DocumentStatus =
  | 'draft'
  | 'sent'
  | 'accepted'
  | 'declined'
  | 'paid'
  | 'void';

export type DocumentLine = { label: string; amount: number };

export type DocumentRow = {
  id: string;
  kind: DocumentKind;
  number: string;
  bookingId: string | null;
  giftId: string | null;
  clientName: string;
  clientEmail: string;
  clientCompany: string | null;
  status: DocumentStatus;
  lines: DocumentLine[];
  subtotal: number;
  taxRate: number;
  tax: number;
  total: number;
  issuedOn: string;
  dueOn: string | null;
  notes: string | null;
  token: string;
  hasPdf: boolean;
  /** Dollars received so far (deposit or full). */
  paidAmount: number;
  /** 'full' | 'deposit' once the client has chosen by paying. */
  paymentPlan: string | null;
  payFullUrl: string | null;
  payDepositUrl: string | null;
  /** Outstanding amount the full-payment link charges; null when no link. */
  linkAmount: number | null;
  /** Typed name from the e-signature when a proposal was accepted online. */
  signerName: string | null;
  sentAt: string | null;
  sentTo: string | null;
  viewedAt: string | null;
  acceptedAt: string | null;
  paidAt: string | null;
  paidMethod: string | null;
  voidedAt: string | null;
  createdAt: string;
};

/** An ad-hoc Stripe payment link made from the studio. */
export type PaymentLinkRow = {
  id: string;
  description: string;
  amount: number;
  clientName: string | null;
  clientEmail: string | null;
  url: string;
  isActive: boolean;
  paidAt: string | null;
  paidCount: number;
  createdAt: string;
};

export type ActivityEntry = {
  id: string;
  bookingId: string | null;
  giftId: string | null;
  documentId: string | null;
  /** Set on notes written on the client's card rather than on one booking. */
  clientEmail: string | null;
  kind: string;
  body: string | null;
  createdAt: string;
};

/** Which integrations are live, so the dashboard can say so plainly. */
export type Integrations = {
  database: boolean;
  email: boolean;
  pdf: boolean;
  calendar: boolean;
  stripe: boolean;
};

/** Balance still owed on an invoice. */
export function balanceDue(doc: DocumentRow): number {
  return Math.max(0, doc.total - doc.paidAmount);
}

/** A human status for an invoice, including the partially-paid case. */
export function documentStatusLabel(doc: DocumentRow, today = new Date()): string {
  if (doc.status === 'void') return 'Void';
  if (doc.status === 'paid') return 'Paid';
  if (doc.status === 'declined') return 'Declined';
  if (doc.status === 'accepted') return 'Accepted';
  if (doc.kind === 'invoice' && doc.paidAmount > 0) return 'Deposit paid';
  if (isOverdue(doc, today)) return 'Overdue';
  if (doc.status === 'sent') return doc.viewedAt ? 'Viewed' : 'Sent';
  return 'Draft';
}

const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec',
];

/**
 * "Sept 05, 2026 (Monday)" instead of a raw ISO string - unambiguous for a
 * reader, unlike 2026-09-05 which can read as day-first at a glance.
 */
export function formatStudioDate(iso: string | null): string {
  if (!iso) return '—';
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
  return `${MONTHS_SHORT[month - 1]} ${String(day).padStart(2, '0')}, ${year} (${weekday})`;
}

/** "Sept 05" - for tight spaces such as cards and lists. */
export function formatShortDate(iso: string | null): string {
  if (!iso) return '—';
  const [, month, day] = iso.slice(0, 10).split('-').map(Number);
  return `${MONTHS_SHORT[month - 1]} ${String(day).padStart(2, '0')}`;
}

/** "3 days ago" / "today" / "in 2 days", from an ISO date or timestamp. */
export function relativeDays(iso: string | null, now = new Date()): string {
  if (!iso) return '';
  const then = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  const days = Math.round((then.getTime() - now.getTime()) / 86_400_000);
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days === -1) return 'yesterday';
  if (days < 0) return `${-days} days ago`;
  return `in ${days} days`;
}

/** An invoice that is sent, unpaid and past its due date. */
export function isOverdue(doc: DocumentRow, today = new Date()): boolean {
  if (doc.kind !== 'invoice' || doc.status !== 'sent' || !doc.dueOn) return false;
  return doc.dueOn < toTorontoDateIso(today);
}

export type StudioData = {
  leads: Lead[];
  bookings: BookingRow[];
  giftCards: GiftCard[];
  reviews: ReviewRow[];
  clients: Client[];
  discoveryCalls: DiscoveryCallRow[];
  documents: DocumentRow[];
  payments: PaymentRow[];
  paymentLinks: PaymentLinkRow[];
  activity: ActivityEntry[];
  integrations: Integrations;
};
