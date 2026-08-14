/**
 * Applies db/schema.sql to the linked Postgres store.
 *
 * Local:  vercel env pull .env.local   then   npm run db:migrate
 * The schema is idempotent, so re-running it is safe.
 */
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

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

  if (!process.env.POSTGRES_URL) {
    console.error(
      'POSTGRES_URL is not set.\n' +
        'Link a Postgres store in the Vercel dashboard, then run:\n' +
        '  vercel env pull .env.local'
    );
    process.exitCode = 1;
    return;
  }

  const { sql } = require('@vercel/postgres');
  const schema = await readFile('db/schema.sql', 'utf8');

  // Split on statement boundaries, ignoring comment-only chunks.
  const statements = schema
    .split(/;\s*$/m)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.split('\n').every((l) => l.trim().startsWith('--')));

  for (const statement of statements) {
    await sql.query(statement);
  }

  console.log(`Applied ${statements.length} statements from db/schema.sql`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
