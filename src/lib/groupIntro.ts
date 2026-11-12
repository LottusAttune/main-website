import 'server-only';

import { sql } from '@/lib/db';

/**
 * Group Introductory is for a booker's first group booking. These compare a
 * new request against earlier ones, so the same person is recognised even when
 * the details are typed a little differently.
 */

/** Lower-cased, without a "+tag", and without the dots Gmail ignores -
 *  Jane.Doe+1@gmail.com and janedoe@gmail.com are the same inbox. */
export function normalizeEmail(email: string): string {
  const [rawLocal = '', rawDomain = ''] = email.trim().toLowerCase().split('@');
  const domain = rawDomain === 'googlemail.com' ? 'gmail.com' : rawDomain;
  let local = rawLocal.split('+')[0];
  if (domain === 'gmail.com') local = local.replace(/\./g, '');
  return `${local}@${domain}`;
}

/** Digits only, without a leading North American "1". Too short to be a
 *  real number gives null, so two blank or junk entries never match. */
export function normalizePhone(phone: string | null | undefined): string | null {
  const digits = (phone ?? '').replace(/\D/g, '');
  const national = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
  return national.length >= 7 ? national : null;
}

/**
 * True when this email or phone already has a group booking (2 or more
 * people) that went ahead. Private sessions don't count, and neither do
 * cancelled or never-paid requests. A name is never enough on its own.
 */
export async function hasEarlierGroupBooking(booker: {
  email: string;
  phone: string | null | undefined;
}): Promise<boolean> {
  const email = normalizeEmail(booker.email);
  const phone = normalizePhone(booker.phone);
  const earlier = await sql`
    SELECT email, phone FROM bookings
    WHERE participants >= 2 AND status IN ('booked', 'complete')
  `;
  return earlier.rows.some(
    (row) =>
      normalizeEmail(String(row.email ?? '')) === email ||
      (phone !== null && normalizePhone(row.phone ? String(row.phone) : null) === phone)
  );
}
