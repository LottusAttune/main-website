/** Business facts that appear across the site and in structured data. */

export const SITE = {
  name: 'Lotus Attune',
  tagline: 'Immersive Soma Sound',
  motto: 'Reset. Align. Thrive',
  email: 'info@LotusAttune.com',
  // Non-breaking hyphens (‑, not -) so the number never splits across a
  // line break - it can otherwise wrap mid-number on a narrow container.
  phone: '416‑871‑5610',
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
 * The expandable nav menu's grouped view: each top-level page alongside the
 * sections a visitor can jump straight to on it. Hashes point at anchors
 * that already exist on each page (see the `id`/`aria-labelledby` on the
 * matching section in that page's file).
 */
export const NAV_SECTIONS = [
  {
    label: 'Home',
    href: '/',
    sections: [
      { label: 'Your Guide', hash: '#guide' },
      { label: 'Watch', hash: '#watch-heading' },
      { label: 'Your Path', hash: '#paths' },
      { label: 'Reviews', hash: '#reviews' },
      { label: 'Frequently Asked', hash: '#faq-heading' },
    ],
  },
  {
    label: 'The Experience',
    href: '/experience',
    sections: [
      { label: 'Journey', hash: '#experience-heading' },
      { label: 'Benefits', hash: '#benefits' },
      { label: "What's Included", hash: '#included' },
    ],
  },
  {
    label: 'Founder',
    href: '/founder',
    sections: [
      { label: 'About', hash: '#founder-heading' },
      { label: 'Training & Credentials', hash: '#training-credentials' },
      { label: 'My Sounds', hash: '#sounds' },
    ],
  },
  {
    label: 'Offerings',
    href: '/offerings',
    sections: [],
  },
] as const;

/**
 * Default pricing. These are overridden at request time by whatever Silvana has
 * published from the studio dashboard — see `lib/pricing.ts`.
 */
export const DEFAULT_PRICING = {
  privateSession: 350,
  privatePackage: 1200,
  perParticipant: 250,
  teamAddon: 500,
  deposit: 500,
} as const;

export const DEFAULT_SLOTS = {
  midday: true,
  evening: true,
} as const;

/** Calendar days between today and the earliest bookable date. */
export const DEFAULT_LEAD_TIME = 6;

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

/**
 * The one place this formula is computed - both the quote engine
 * (src/lib/quote.ts) and the Book page's tier-choice cards call this, so a
 * displayed price can never drift from what's actually charged.
 */
export function corporateIntroPriceFor(participants: number): number {
  return (
    CORPORATE_INTRO_BASE_PRICE +
    Math.max(0, participants - CORPORATE_INTRO_MIN_PARTICIPANTS) *
      CORPORATE_INTRO_PER_PARTICIPANT
  );
}

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
  '4:00 pm',
  '5:00 pm',
  '6:00 pm',
] as const;

export const TIME_SLOTS = [
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

export type SessionSlot = { date: string; time: string; participants: number };
export type BookedCall = { date: string; time: string };

export function venueForParticipants(participants: number): 'lounge' | 'signature' {
  return participants <= LOUNGE_MAX ? 'lounge' : 'signature';
}

const SESSION_START_MINUTES: Record<SlotKey, number> = {
  midday: 12 * 60,
  evening: 18 * 60,
};

/** Silvana needs to be at the venue an hour ahead of a session to set up and
 *  welcome people 15 minutes before it starts - a discovery call any closer
 *  than this to a session's start time doesn't leave room for that. */
export const CALL_EVENT_BUFFER_MINUTES = 3 * 60;

function parseClockMinutes(label: string): number {
  const match = /^(\d+):(\d+)\s*(am|pm)$/i.exec(label.trim());
  if (!match) return NaN;
  let hour = Number(match[1]) % 12;
  if (match[3].toLowerCase() === 'pm') hour += 12;
  return hour * 60 + Number(match[2]);
}

/** Session time-slot labels too close to an already-booked discovery call
 *  that day to be safe - see CALL_EVENT_BUFFER_MINUTES. */
function slotsBlockedByCalls(date: string, bookedCalls: readonly BookedCall[]): Set<string> {
  const callMinutes = bookedCalls
    .filter((c) => c.date === date)
    .map((c) => parseClockMinutes(c.time));
  const blocked = new Set<string>();
  for (const slot of TIME_SLOTS) {
    const start = SESSION_START_MINUTES[slot.key];
    if (callMinutes.some((m) => Math.abs(m - start) <= CALL_EVENT_BUFFER_MINUTES)) {
      blocked.add(slot.label);
    }
  }
  return blocked;
}

/**
 * Whole days to grey out on the booking calendar for a party of this size.
 * The Signature Venue can host more than one session a day, in different
 * time slots, since the room is already held for the day either way - once
 * every slot that day is taken (by another session, or by sitting too close
 * to an already-booked discovery call), the day closes too. The Wellness
 * Lounge is capped at one session a day (a 3-hour daily rental), and can
 * never share a day with a Signature session in either direction - mixing
 * the two venues in one day isn't something Silvana can manage.
 */
export function blockedDatesFor(
  participants: number,
  bookedSlots: readonly SessionSlot[],
  bookedCalls: readonly BookedCall[],
  manualBlocked: readonly string[],
  openSlotLabels: readonly string[]
): string[] {
  const venue = venueForParticipants(participants);
  const byDate = new Map<string, SessionSlot[]>();
  for (const slot of bookedSlots) {
    if (!byDate.has(slot.date)) byDate.set(slot.date, []);
    byDate.get(slot.date)!.push(slot);
  }
  const candidateDates = new Set([...byDate.keys(), ...bookedCalls.map((c) => c.date)]);

  const blocked = new Set(manualBlocked);
  for (const date of candidateDates) {
    const daySlots = byDate.get(date) ?? [];
    const hasLounge = daySlots.some((s) => venueForParticipants(s.participants) === 'lounge');
    if (daySlots.length > 0 && (hasLounge || venue === 'lounge')) {
      // A lounge day is fully spoken for either way, and a lounge request
      // can't share a day that already has a signature session on it.
      blocked.add(date);
      continue;
    }
    const takenTimes = blockedTimesFor(date, participants, bookedSlots, bookedCalls);
    if (openSlotLabels.every((label) => takenTimes.has(label))) {
      blocked.add(date);
    }
  }
  return [...blocked];
}

/** Time labels already spoken for on this date, for a party of this size -
 *  either another session already holds it, or a discovery call sits too
 *  close to it. */
export function blockedTimesFor(
  date: string,
  participants: number,
  bookedSlots: readonly SessionSlot[],
  bookedCalls: readonly BookedCall[]
): Set<string> {
  const venue = venueForParticipants(participants);
  const callBlocked = slotsBlockedByCalls(date, bookedCalls);
  if (venue === 'lounge') {
    // blockedDatesFor already keeps a lounge request off any date that
    // already has a session booked, so only the call buffer applies here.
    return callBlocked;
  }
  const daySlots = bookedSlots.filter((s) => s.date === date);
  const venueBlocked = daySlots
    .filter((s) => venueForParticipants(s.participants) === 'signature')
    .map((s) => s.time);
  return new Set([...venueBlocked, ...callBlocked]);
}

/** The same check, run server-side before a booking is saved - never trust
 *  the calendar the client saw, since another request may have landed since. */
export function isSlotAvailable(
  date: string,
  time: string,
  participants: number,
  bookedSlots: readonly SessionSlot[],
  bookedCalls: readonly BookedCall[]
): boolean {
  const venue = venueForParticipants(participants);
  const daySlots = bookedSlots.filter((s) => s.date === date);
  if (daySlots.some((s) => venueForParticipants(s.participants) === 'lounge')) return false;
  if (venue === 'lounge' && daySlots.length > 0) return false;
  if (daySlots.some((s) => venueForParticipants(s.participants) === 'signature' && s.time === time)) {
    return false;
  }
  return !slotsBlockedByCalls(date, bookedCalls).has(time);
}

export function money(amount: number): string {
  return `$${amount.toLocaleString('en-CA')}`;
}

/** The venue address field is often two lines: the street address, then a
 *  second line with buzzer/entry info. Split so each gets its own bold
 *  "Location" / "Arrival instructions" heading, without depending on
 *  whatever words the text itself happens to start with. */
/** A stored timestamp's calendar date in Toronto, not UTC - `.slice(0, 10)`
 *  on an ISO timestamp reads the UTC date, which is already tomorrow from
 *  as early as 8pm EDT / 7pm EST, showing payments as received a day late. */
export function toTorontoDateIso(timestamp: string | Date): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto' }).format(date);
}

export function splitVenueDetails(text: string): { location: string; arrival: string | null } {
  const parts = text
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
  return { location: parts[0] ?? '', arrival: parts.length > 1 ? parts.slice(1).join('\n') : null };
}

/** For a calendar app's own Location field specifically - just the street
 *  address (the first sentence), not any trailing descriptive sentence
 *  ("Just south of Bloor Street East"), since a phone's calendar app
 *  auto-links any recognizable street name found anywhere inside that
 *  field as a second, separate address, which is exactly the confusing
 *  double-link the client reported. The rest still isn't lost - it moves
 *  into the event description instead, as plain (non-geocoded) text. */
export function splitAddressForCalendar(location: string): { mapLocation: string; extra: string | null } {
  const match = location.match(/^([^.]+\.)\s*([\s\S]*)$/);
  if (!match) return { mapLocation: location.trim(), extra: null };
  const [, first, rest] = match;
  return { mapLocation: first.trim(), extra: rest.trim() || null };
}
