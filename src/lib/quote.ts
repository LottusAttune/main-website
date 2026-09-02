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
  gratuity: number;
};

export type BookingInput = {
  participants: number;
  /** Private bookings only: a package of four rather than a single session. */
  isPackage?: boolean;
  /** First-time organizational clients only, minimum 7 participants. */
  isCorporateIntro?: boolean;
  teamAddon?: boolean;
  refreshments?: boolean;
  /** A code is either percent-off or a flat amount-off, never both -
   *  already validated as active and meeting its own participant minimum. */
  percentOff?: number;
  amountOff?: number;
  discountLabel?: string;
  /** The applied code's own minimum - defaults to MIN_GROUP_SIZE so an
   *  unset value doesn't loosen the requirement. */
  discountMinParticipants?: number;
  /** One of the quick-pick percentages (0/10/15/18/20). A flat dollar
   *  amount in `gratuityAmount` takes priority when both are set. */
  gratuityPercent?: number;
  gratuityAmount?: number;
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

  const discountMin = input.discountMinParticipants ?? MIN_GROUP_SIZE;
  if ((input.percentOff || input.amountOff) && people >= discountMin) {
    if (input.amountOff) {
      // Never let a flat discount exceed the subtotal it's applied to.
      discountApplied = Math.min(input.amountOff, subtotal);
      lines.push({
        label: `${input.discountLabel ?? 'Discount'} — ${money(input.amountOff)} off`,
        value: `−${money(discountApplied)}`,
      });
    } else if (input.percentOff) {
      discountApplied = Math.round((subtotal * input.percentOff) / 100);
      lines.push({
        label: `${input.discountLabel ?? 'Discount'} — ${input.percentOff}% off`,
        value: `−${money(discountApplied)}`,
      });
    }
    total = subtotal - discountApplied;
  }

  // Gratuity is optional and calculated on top of everything above - a flat
  // amount always wins over a percentage when both happen to be present.
  let gratuity = 0;
  if (people >= 1) {
    if (typeof input.gratuityAmount === 'number' && input.gratuityAmount > 0) {
      gratuity = Math.round(input.gratuityAmount);
      lines.push({ label: 'Gratuity', value: money(gratuity) });
    } else if (input.gratuityPercent) {
      gratuity = Math.round((total * input.gratuityPercent) / 100);
      if (gratuity > 0) {
        lines.push({
          label: `Gratuity — ${input.gratuityPercent}%`,
          value: money(gratuity),
        });
      }
    }
  }
  total += gratuity;

  return { lines, subtotal, total, discountApplied, gratuity };
}

export type GiftInput = {
  format: 'private' | 'group';
  sessions: number;
  participants: number;
  addons: Record<string, boolean>;
  /** One of the quick-pick percentages (0/10/15/18/20). A flat dollar
   *  amount in `gratuityAmount` takes priority when both are set. */
  gratuityPercent?: number;
  gratuityAmount?: number;
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
  }

  let total = subtotal;

  // Gratuity is optional and calculated on top of everything above - a flat
  // amount always wins over a percentage when both happen to be present.
  let gratuity = 0;
  if (typeof input.gratuityAmount === 'number' && input.gratuityAmount > 0) {
    gratuity = Math.round(input.gratuityAmount);
    lines.push({ label: 'Gratuity', value: money(gratuity) });
  } else if (input.gratuityPercent) {
    gratuity = Math.round((total * input.gratuityPercent) / 100);
    if (gratuity > 0) {
      lines.push({
        label: `Gratuity — ${input.gratuityPercent}%`,
        value: money(gratuity),
      });
    }
  }
  total += gratuity;

  return { lines, subtotal, total, discountApplied: 0, gratuity };
}
