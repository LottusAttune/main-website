import 'server-only';

import { createPool, sql as defaultSql } from '@vercel/postgres';

/**
 * Postgres connection.
 *
 * Vercel no longer offers a first-party Postgres; the store is created through
 * the marketplace (Neon), whose integration sets `DATABASE_URL` and, depending
 * on the version, `POSTGRES_URL` too. Accept either rather than making a
 * non-technical setup hinge on which name the integration happened to write.
 */
function connectionString(): string | undefined {
  return process.env.POSTGRES_URL || process.env.DATABASE_URL || undefined;
}

/**
 * True once a Postgres store is linked (or pulled locally with
 * `vercel env pull .env.local`).
 *
 * Until then the public site still renders from the defaults in `lib/site.ts`,
 * and any write is refused loudly rather than silently dropped.
 */
export function isDatabaseConfigured(): boolean {
  return Boolean(connectionString());
}

/**
 * `@vercel/postgres` reads POSTGRES_URL from the environment on its own, so the
 * default export is used when that is present. Otherwise a pool is built
 * explicitly from whatever connection string we did find.
 */
const pool = process.env.POSTGRES_URL
  ? null
  : connectionString()
    ? createPool({ connectionString: connectionString() })
    : null;

export const sql = pool ? pool.sql.bind(pool) : defaultSql;

export class DatabaseNotConfiguredError extends Error {
  constructor() {
    super(
      'No Postgres store is linked. Create one from Vercel → Storage (Neon), then run the migration in db/schema.sql.'
    );
    this.name = 'DatabaseNotConfiguredError';
  }
}

/** Use before any write. Reads should degrade to defaults instead. */
export function requireDatabase(): void {
  if (!isDatabaseConfigured()) throw new DatabaseNotConfiguredError();
}
