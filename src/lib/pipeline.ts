/**
 * Shapes and constants shared by the studio's server queries and its client
 * panels. Kept out of `lib/studio.ts` because that module is `server-only` and
 * the panels are Client Components.
 */

/** Kanban stages, in order. A lead's `status` is one of these keys. */
export const STAGES = [
  { key: 'new_enquiry', label: 'New enquiry' },
  { key: 'contacted', label: 'Contacted' },
  { key: 'proposal_sent', label: 'Proposal sent' },
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
  participants: number;
  sessionDate: string | null;
  sessionTime: string | null;
  /** Split sessions (groups over 12) run a second time slot the same day. */
  sessionDate2: string | null;
  sessionTime2: string | null;
  teamAddon: boolean;
  total: number;
  /** A cancelled booking keeps its record but drops off the Kanban board -
   *  it is not one of the pipeline `STAGES`. */
  status: StageKey | 'cancelled';
  createdAt: string;
  type: string;
  calendarEventId: string | null;
  calendarEventId2: string | null;
};

export type BookingRow = Lead & { venue: string };

export type GiftCard = {
  id: string;
  recipientName: string;
  recipientEmail: string | null;
  buyerEmail: string;
  format: string;
  total: number;
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
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  sessions: number;
  totalParticipants: number;
  /** Ever booked the team-building add-on, across any of their sessions. */
  teamAddon: boolean;
  lifetimeValue: number;
  lastSession: string | null;
};

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

export type StudioData = {
  leads: Lead[];
  bookings: BookingRow[];
  giftCards: GiftCard[];
  reviews: ReviewRow[];
  clients: Client[];
  discoveryCalls: DiscoveryCallRow[];
};
