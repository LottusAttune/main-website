import 'server-only';

import postgres from 'postgres';

/**
 * Postgres connection (Supabase).
 *
 * Prefer a pooled connection string: serverless functions open many short
 * connections, and the pooler is what stops a busy moment from exhausting the
 * database's connection limit.
 *
 * The Supabase–Vercel connector writes several variables and which ones appear
 * varies by version, so every name it might use is accepted. Pooled URLs are
 * tried first; the direct connection is a last resort rather than a silent
 * default, because it is the one that runs out of connections under load.
 */
const POOLED_VARS = [
  'POSTGRES_URL',
  'POSTGRES_PRISMA_URL',
  'DATABASE_URL',
] as const;

const DIRECT_VARS = [
  'POSTGRES_URL_NON_POOLING',
  'DATABASE_URL_UNPOOLED',
] as const;

function connectionString(): string | undefined {
  for (const name of [...POOLED_VARS, ...DIRECT_VARS]) {
    const value = process.env[name];
    if (value) return value;
  }
  return undefined;
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
 * `connect_timeout` only bounds opening a fresh socket to the pooler — it does
 * not bound Supavisor queuing a request while its backend pool is saturated,
 * which is a silent hang rather than a connection error. Every query gets its
 * own ceiling so a starved pool degrades callers (falling back to defaults)
 * instead of hanging the request.
 */
const QUERY_TIMEOUT_MS = 8000;

export class DatabaseTimeoutError extends Error {
  constructor() {
    super(`Database query did not respond within ${QUERY_TIMEOUT_MS}ms.`);
    this.name = 'DatabaseTimeoutError';
  }
}

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
  const query = (
    client as unknown as (
      s: TemplateStringsArray,
      ...v: unknown[]
    ) => Promise<Row[]>
  )(strings, ...values);

  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new DatabaseTimeoutError()), QUERY_TIMEOUT_MS);
  });

  const result = await Promise.race([query, timeout]);
  return { rows: Array.from(result) };
}
