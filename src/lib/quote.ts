import type { Pricing } from '@/lib/settings';
import {
  CORPORATE_INTRO_BASE_PRICE,
  CORPORATE_INTRO_MIN_PARTICIPANTS,
  CORPORATE_INTRO_PER_PARTICIPANT,
  groupPriceFor,
  TEAM_ADDON_MIN_PARTICIPANTS,
} from '@/lib/site';

/**
 * Pure pricing maths, shared by the configurators, the booking summary and the
 * server-side validation of a submitted request. The client's number and the
 * server's number come from the same function so they cannot drift.
 */

export type QuoteLine = {
  label: string;
  value: string;
};

export type BookingQuote = {
  lines: QuoteLine[];
  subtotal: number;
  total: number;
  discountApplied: number;
};

export type BookingInput = {
  participants: number;
  /** Private bookings only: a package of four rather than a single session. */
  isPackage?: boolean;
  /** First-time organizational clients only, minimum 7 participants. */
  isCorporateIntro?: boolean;
  teamAddon?: boolean;
  refreshments?: boolean;
  /** Percentage off, already validated as active and group-eligible. */
  percentOff?: number;
  discountLabel?: string;
};

export const MIN_GROUP_SIZE = 2;

function money(amount: number): string {
  return `$${amount.toLocaleString('en-CA')}`;
}

export function quoteFor(
  input: BookingInput,
  pricing: Pricing
): BookingQuote {
  const lines: QuoteLine[] = [];
  const people = Number(input.participants) || 0;
  let subtotal = 0;

  if (people === 1) {
    if (input.isPackage) {
      subtotal = pricing.privatePackage;
      lines.push({
        label: 'Package of four sessions',
        value: money(pricing.privatePackage),
      });
    } else {
      subtotal = pricing.privateSession;
      lines.push({
        label: 'One private session',
        value: money(pricing.privateSession),
      });
    }
  } else if (
    input.isCorporateIntro &&
    people >= CORPORATE_INTRO_MIN_PARTICIPANTS
  ) {
    subtotal =
      CORPORATE_INTRO_BASE_PRICE +
      (people - CORPORATE_INTRO_MIN_PARTICIPANTS) * CORPORATE_INTRO_PER_PARTICIPANT;
    lines.push({
      label: `Corporate introductory experience — ${people} participants`,
      value: money(subtotal),
    });
  } else if (people >= MIN_GROUP_SIZE) {
    subtotal = groupPriceFor(people);
    lines.push({
      label: `${people} participants`,
      value: money(subtotal),
    });
  }

  // The team-building add-on doesn't make sense for a small group.
  if (people >= TEAM_ADDON_MIN_PARTICIPANTS && input.teamAddon) {
    subtotal += pricing.teamAddon;
    lines.push({
      label: 'Team-building add-on',
      value: money(pricing.teamAddon),
    });
  }

  if (people >= MIN_GROUP_SIZE && input.refreshments) {
    const amount = pricing.refreshments * people;
    subtotal += amount;
    lines.push({
      label: `Refreshments — ${money(pricing.refreshments)} pp`,
      value: money(amount),
    });
  }

  let total = subtotal;
  let discountApplied = 0;

  if (input.percentOff && people >= MIN_GROUP_SIZE) {
    discountApplied = Math.round((subtotal * input.percentOff) / 100);
    total = subtotal - discountApplied;
    lines.push({
      label: `${input.discountLabel ?? 'Discount'} — ${input.percentOff}% off`,
      value: `−${money(discountApplied)}`,
    });
  }

  return { lines, subtotal, total, discountApplied };
}

export type GiftInput = {
  format: 'private' | 'group';
  sessions: number;
  participants: number;
  addons: Record<string, boolean>;
};

export function giftQuoteFor(
  input: GiftInput,
  pricing: Pricing
): BookingQuote {
  const lines: QuoteLine[] = [];
  let subtotal = 0;

  if (input.format === 'private') {
    if (Number(input.sessions) === 4) {
      subtotal = pricing.privatePackage;
      lines.push({
        label: 'Package of four sessions',
        value: money(pricing.privatePackage),
      });
    } else {
      subtotal = pricing.privateSession;
      lines.push({
        label: '1 private session',
        value: money(pricing.privateSession),
      });
    }
    if (input.addons.refresh) {
      subtotal += pricing.refreshments;
      lines.push({
        label: 'Organic tea, snacks and refreshments',
        value: money(pricing.refreshments),
      });
    }
  } else {
    const people = Number(input.participants) || 0;
    subtotal = groupPriceFor(people);
    lines.push({
      label: `${people} participants`,
      value: money(subtotal),
    });
    if (people >= TEAM_ADDON_MIN_PARTICIPANTS && input.addons.team) {
      subtotal += pricing.teamAddon;
      lines.push({
        label: 'Mindful team-building activity',
        value: money(pricing.teamAddon),
      });
    }
    if (input.addons.refresh) {
      const amount = pricing.refreshments * people;
      subtotal += amount;
      lines.push({
        label: 'Organic tea, snacks and refreshments',
        value: money(amount),
      });
    }
  }

  return { lines, subtotal, total: subtotal, discountApplied: 0 };
}
