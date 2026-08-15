import 'server-only';

import postgres from 'postgres';

/**
 * Postgres connection (Supabase).
 *
 * Supabase exposes a pooled connection string. Use the **Transaction pooler**
 * (port 6543) for a serverless deployment: each request gets a connection from
 * the pool rather than opening its own, which is what stops a busy moment from
 * exhausting the database's connection limit.
 *
 * The environment variable may be called either name depending on how the
 * integration was set up, so both are accepted.
 */
function connectionString(): string | undefined {
  return process.env.POSTGRES_URL || process.env.DATABASE_URL || undefined;
}

/**
 * True once the database is connected.
 *
 * Until then the public site still renders from the defaults in `lib/site.ts`,
 * and any write is refused loudly rather than silently dropped.
 */
export function isDatabaseConfigured(): boolean {
  return Boolean(connectionString());
}

export class DatabaseNotConfiguredError extends Error {
  constructor() {
    super(
      'No database is connected. Add the Supabase connection string as POSTGRES_URL, then run the migration in db/schema.sql.'
    );
    this.name = 'DatabaseNotConfiguredError';
  }
}

/** Use before any write. Reads should degrade to defaults instead. */
export function requireDatabase(): void {
  if (!isDatabaseConfigured()) throw new DatabaseNotConfiguredError();
}

const url = connectionString();

const client = url
  ? postgres(url, {
      // The transaction pooler does not support prepared statements.
      prepare: false,
      // Serverless functions are short-lived; one connection each is plenty and
      // keeps the pool from being held open by idle invocations.
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
    })
  : null;

type Row = Record<string, unknown>;

/**
 * Tagged-template query returning `{ rows }`.
 *
 * postgres.js returns an array directly; wrapping it preserves the shape every
 * call site already uses, so swapping the driver touched only this file.
 * Values interpolated into the template are still sent as bound parameters —
 * never concatenated — so this is not an injection surface.
 */
export async function sql(
  strings: TemplateStringsArray,
  ...values: unknown[]
): Promise<{ rows: Row[] }> {
  if (!client) throw new DatabaseNotConfiguredError();
  const result = await (
    client as unknown as (
      s: TemplateStringsArray,
      ...v: unknown[]
    ) => Promise<Row[]>
  )(strings, ...values);
  return { rows: Array.from(result) };
}
