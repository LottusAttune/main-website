/**
 * Applies db/schema.sql to the connected Supabase database.
 *
 * Usually unnecessary — pasting the file into Supabase's SQL Editor does the
 * same thing. This exists so the migration can be re-run from a terminal.
 *
 *   POSTGRES_URL="postgres://…" npm run db:migrate
 *
 * The schema is idempotent, so re-running it is safe.
 */
import { readFile } from 'node:fs/promises';
import postgres from 'postgres';

async function main() {
  // Load .env.local without adding a dependency.
  try {
    const env = await readFile('.env.local', 'utf8');
    for (const line of env.split('\n')) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\n]*)"?\s*$/);
      if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
    }
  } catch {
    // No .env.local — fall back to whatever is already in the environment.
  }

  const url = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!url) {
    console.error(
      'No connection string found.\n' +
        'Set POSTGRES_URL to the Supabase connection string (Project Settings →\n' +
        'Database → Connection string → Transaction pooler), or paste\n' +
        'db/schema.sql into the Supabase SQL Editor instead.'
    );
    process.exitCode = 1;
    return;
  }

  const sql = postgres(url, { prepare: false, max: 1 });

  try {
    const schema = await readFile('db/schema.sql', 'utf8');
    // The whole file runs as one script, so statements stay in order.
    await sql.unsafe(schema);
    console.log('Applied db/schema.sql');
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
