/** Business facts that appear across the site and in structured data. */

export const SITE = {
  name: 'Lotus Attune',
  tagline: 'Immersive Soma Sound',
  motto: 'Reset. Align. Thrive',
  email: 'info@LotusAttune.com',
  phone: '416-871-5610',
  phoneHref: 'tel:4168715610',
  whatsappHref: 'https://wa.me/14168715610',
  area: 'Toronto & the GTA',
  description:
    'An immersive wellness experience designed to support relaxation, nervous system regulation and deep inner connection. Two-hour sessions in downtown Toronto for 1 to 24 people.',
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://lotusattune.com',
} as const;

/** Social handles are placeholders until the client confirms the real ones. */
export const SOCIAL = [
  { label: 'LinkedIn', href: 'https://www.linkedin.com/company/lotusattune' },
  { label: 'Instagram', href: 'https://www.instagram.com/lotusattune' },
  { label: 'Facebook', href: 'https://www.facebook.com/lotusattune' },
  { label: 'YouTube', href: 'https://www.youtube.com/@lotusattune' },
] as const;

export const NAV_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'The Experience', href: '/experience' },
  { label: 'Founder', href: '/founder' },
  { label: 'Offerings', href: '/offerings' },
] as const;

/**
 * Default pricing. These are overridden at request time by whatever Silvana has
 * published from the studio dashboard — see `lib/pricing.ts`.
 */
export const DEFAULT_PRICING = {
  privateSession: 340,
  privatePackage: 1200,
  perParticipant: 280,
  teamAddon: 500,
  refreshments: 20,
  deposit: 500,
} as const;

export const DEFAULT_SLOTS = {
  morning: true,
  midday: true,
  evening: true,
} as const;

/** Calendar days between today and the earliest bookable date. */
export const DEFAULT_LEAD_TIME = 5;

/** Groups above this size are split across two sessions. */
export const TWO_SESSION_THRESHOLD = 12;

/** At or below this headcount the session runs in the Private Wellness Lounge. */
export const LOUNGE_MAX = 6;

export const MIN_PARTICIPANTS = 2;
export const MAX_PARTICIPANTS = 24;

/** Corporate Introductory Experience: first-time organizational clients only. */
export const CORPORATE_INTRO_MIN_PARTICIPANTS = 7;
export const CORPORATE_INTRO_BASE_PRICE = 1300;
export const CORPORATE_INTRO_PER_PARTICIPANT = 100;

/** The team-building add-on doesn't make sense for a small group. */
export const TEAM_ADDON_MIN_PARTICIPANTS = 7;

/** Group & Corporate: $250/participant up to 10, then $100 per participant beyond. */
export const GROUP_BASE_RATE = 250;
export const GROUP_BASE_TIER_MAX = 10;
export const GROUP_INCREMENT_RATE = 100;

export function groupPriceFor(participants: number): number {
  const base = Math.min(participants, GROUP_BASE_TIER_MAX) * GROUP_BASE_RATE;
  const extra =
    Math.max(0, participants - GROUP_BASE_TIER_MAX) * GROUP_INCREMENT_RATE;
  return base + extra;
}

/** Calendar days between today and the earliest bookable discovery call. */
export const DISCOVERY_CALL_LEAD_DAYS = 2;

/** Fixed times offered for a discovery call - shorter and more specific than
 *  the two-hour session windows above, since a call only runs 15-20 minutes. */
export const DISCOVERY_CALL_TIMES = [
  '9:00 am',
  '10:00 am',
  '11:00 am',
  '1:00 pm',
  '2:00 pm',
  '3:00 pm',
  '4:00 pm',
  '5:00 pm',
  '6:00 pm',
] as const;

export const TIME_SLOTS = [
  { key: 'morning', label: '8 – 10 am', note: 'Morning reset' },
  { key: 'midday', label: '12 – 2 pm', note: 'Midday pause' },
  { key: 'evening', label: '6 – 8 pm', note: 'Evening unwind' },
] as const;

export type SlotKey = (typeof TIME_SLOTS)[number]['key'];

export const VENUE_NOTE = {
  lounge:
    'Wellness Lounge — an intimate space with exclusive access to both the Arrival Lounge and the Experience Room. Venue rental included.',
  signature:
    'Premium Signature Venue — an ample, high-end space with three private gender-inclusive washrooms and kitchen. Venue rental included.',
} as const;

export function venueNoteFor(participants: number): string {
  return participants <= LOUNGE_MAX ? VENUE_NOTE.lounge : VENUE_NOTE.signature;
}

export function money(amount: number): string {
  return `$${amount.toLocaleString('en-CA')}`;
}
