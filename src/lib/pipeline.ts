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
  total: number;
  status: StageKey;
  createdAt: string;
  type: string;
};

export type BookingRow = Lead & { venue: string };

export type GiftCard = {
  id: string;
  recipientName: string;
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
  sessions: number;
  lifetimeValue: number;
  lastSession: string | null;
};

export type StudioData = {
  leads: Lead[];
  bookings: BookingRow[];
  giftCards: GiftCard[];
  reviews: ReviewRow[];
  clients: Client[];
};
