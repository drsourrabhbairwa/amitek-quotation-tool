// supabase/schema.test.js
// Runs the real schema.sql against an in-memory Postgres (PGlite) and
// exercises increment_counter's actual numeric behavior. Task 1's original
// "test" only grepped schema.sql for expected substrings — it never
// called the function — which is how a real off-by-one bug (see the
// second test below) shipped to production undetected.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';

const __dirname = dirname(fileURLToPath(import.meta.url));
const schemaSql = readFileSync(join(__dirname, 'schema.sql'), 'utf8');

/* schema.sql's RLS policies call auth.role(), a function Supabase's
 * GoTrue extension provides in real projects. PGlite is plain Postgres,
 * so we stub just enough of the `auth` schema for the *real* schema.sql
 * file to run completely unmodified (maximum fidelity to what's actually
 * deployed). The stub only needs to make `create policy` parse — RLS
 * enforcement itself is verified elsewhere (Task 1's schema read plus a
 * live anon-key request against production; see the execution ledger),
 * not by this file. */
async function freshDb() {
  const db = new PGlite();
  await db.exec(`
    create schema if not exists auth;
    create or replace function auth.role() returns text language sql as $$ select 'authenticated'::text $$;
  `);
  await db.exec(schemaSql);
  return db;
}

describe('increment_counter', () => {
  let db;

  beforeAll(async () => {
    db = await freshDb();
  });

  afterAll(async () => {
    await db.close();
  });

  it('starts a brand-new key at 1, then counts up sequentially', async () => {
    const next = async () =>
      (await db.query(`select increment_counter($1, $2, $3) as n`, ['sf', 'quotation', 2030])).rows[0].n;
    expect(await next()).toBe(1);
    expect(await next()).toBe(2);
    expect(await next()).toBe(3);
  });

  it('issues exactly what next_number already promises for a migrated row, never next_number + 1', async () => {
    // Mirrors what scripts/backup-to-sql.mjs writes after a real
    // migration: next_number is already "the next number to hand out"
    // (5 existing quotations numbered 001-005 -> next_number = 6), not
    // "the last number issued". The very first save after migration
    // must receive 6, not 7 -- a skipped number on a real client
    // document can't be taken back once it's gone out.
    await db.exec(
      `insert into counters (division_key, doc_type, year, next_number) values ('wp', 'quotation', 2031, 6)`
    );
    const first = (await db.query(`select increment_counter($1, $2, $3) as n`, ['wp', 'quotation', 2031])).rows[0].n;
    expect(first).toBe(6);
    const second = (await db.query(`select increment_counter($1, $2, $3) as n`, ['wp', 'quotation', 2031])).rows[0].n;
    expect(second).toBe(7);
  });
});
