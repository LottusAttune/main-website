import 'server-only';

import { sql } from '@vercel/postgres';

/**
 * True once a Postgres store is linked in Vercel (or pulled locally with
 * `vercel env pull .env.local`).
 *
 * Until then the public site still renders from the defaults in `lib/site.ts`,
 * and any write is refused loudly rather than silently dropped.
 */
export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.POSTGRES_URL);
}

export class DatabaseNotConfiguredError extends Error {
  constructor() {
    super(
      'No Postgres store is linked. Add one in the Vercel dashboard, then run the migration in db/schema.sql.'
    );
    this.name = 'DatabaseNotConfiguredError';
  }
}

/** Use before any write. Reads should degrade to defaults instead. */
export function requireDatabase(): void {
  if (!isDatabaseConfigured()) throw new DatabaseNotConfiguredError();
}

export { sql };
