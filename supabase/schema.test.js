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
    create or replace function auth.jwt() returns jsonb language sql as $$ select coalesce(nullif(current_setting('test.jwt', true), ''), '{"email":"a@amitek.test"}')::jsonb $$;
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

describe('per-record division_data writes (concurrent-save safety)', () => {
  let db;

  beforeAll(async () => {
    db = await freshDb();
  });

  afterAll(async () => {
    await db.close();
  });

  const META = ['revision', 'updatedAt', 'updatedBy', 'createdBy', 'savedAt', 'status', 'followUpDate', 'statusNote', 'statusLog'];
  const strip = (q) => Object.fromEntries(Object.entries(q).filter(([k]) => !META.includes(k)));
  const quotations = async (divKey) =>
    (await db.query(`select quotations from division_data where division_key = $1`, [divKey])).rows[0].quotations;
  const upsert = async (divKey, q) =>
    (await db.query(`select upsert_quotation($1, $2::jsonb) as saved`, [divKey, JSON.stringify(q)])).rows[0].saved;

  it('upsert_quotation appends a new id and leaves other rows\' data untouched', async () => {
    await upsert('sf', { id: 'q1', refNo: 'A1' });
    await upsert('wp', { id: 'q-wp', refNo: 'W1' });
    expect((await quotations('sf')).map(strip)).toEqual([{ id: 'q1', refNo: 'A1' }]);
    expect((await quotations('wp')).map(strip)).toEqual([{ id: 'q-wp', refNo: 'W1' }]);
  });

  it('upsert_quotation replaces the existing entry with the same id instead of duplicating it', async () => {
    await upsert('sf', { id: 'q1', refNo: 'A1-edited' });
    expect((await quotations('sf')).map(strip)).toEqual([{ id: 'q1', refNo: 'A1-edited' }]);
  });

  it('simulates two users racing: both saves survive because each is computed against the row as it stood at call time, not a stale client snapshot', async () => {
    await upsert('sf', { id: 'q2', refNo: 'A2' });
    await upsert('sf', { id: 'q1', refNo: 'A1-second-edit' });
    const rows = await quotations('sf');
    expect(rows.map(r => r.id).sort()).toEqual(['q1', 'q2']);
    expect(rows.find(r => r.id === 'q1').refNo).toBe('A1-second-edit');
    expect(rows.find(r => r.id === 'q2').refNo).toBe('A2');
  });

  it('delete_quotation removes only the matching id', async () => {
    await db.query(`select delete_quotation($1, $2)`, ['sf', 'q2']);
    expect((await quotations('sf')).map(r => r.id)).toEqual(['q1']);
  });

  it('replace_systems and replace_settings write only their own column', async () => {
    await db.query(`select replace_systems($1, $2::jsonb)`, ['wp', JSON.stringify([{ id: 'sys1' }])]);
    await db.query(`select replace_settings($1, $2::jsonb)`, ['wp', JSON.stringify({ gstin: 'TEST123' })]);
    const row = (await db.query(`select systems, settings, quotations from division_data where division_key = 'wp'`)).rows[0];
    expect(row.systems).toEqual([{ id: 'sys1' }]);
    expect(row.settings).toEqual({ gstin: 'TEST123' });
    expect(row.quotations.map(strip)).toEqual([{ id: 'q-wp', refNo: 'W1' }]);
  });
});

describe('quotation revisions', () => {
  let db;
  beforeAll(async () => { db = await freshDb(); });
  afterAll(async () => { await db.close(); });

  const upsert = async (q, email = 'a@amitek.test') => {
    await db.exec(`select set_config('test.jwt', '{"email":"${email}"}', false)`);
    return (await db.query(`select upsert_quotation('sf', $1::jsonb) as saved`, [JSON.stringify(q)])).rows[0].saved;
  };
  const revisions = async (id) =>
    (await db.query(`select revision, saved_by, snapshot from quotation_revisions where quotation_id = $1 order by revision`, [id])).rows;

  it('a brand-new quotation starts at Rev 0 with no archived versions, stamped with who saved it', async () => {
    const saved = await upsert({ id: 'r1', refNo: 'R/1', total: 100 }, 'sourabh@amitek.test');
    expect(saved.revision).toBe(0);
    expect(saved.createdBy).toBe('sourabh@amitek.test');
    expect(saved.updatedBy).toBe('sourabh@amitek.test');
    expect(await revisions('r1')).toEqual([]);
  });

  it('re-saving with no real change (only updatedAt differs) is not a new revision', async () => {
    const saved = await upsert({ id: 'r1', refNo: 'R/1', total: 100, updatedAt: 999 });
    expect(saved.revision).toBe(0);
    expect(await revisions('r1')).toEqual([]);
  });

  it('each real change archives the previous version and bumps the Rev number; createdBy is kept', async () => {
    const s1 = await upsert({ id: 'r1', refNo: 'R/1', total: 150 }, 'shriya@amitek.test');
    expect(s1.revision).toBe(1);
    expect(s1.updatedBy).toBe('shriya@amitek.test');
    expect(s1.createdBy).toBe('sourabh@amitek.test');
    const s2 = await upsert({ ...s1, total: 175, revision: 0 /* stale client value is ignored */ });
    expect(s2.revision).toBe(2);
    const revs = await revisions('r1');
    expect(revs.map(r => r.revision)).toEqual([0, 1]);
    expect(revs[0].snapshot.total).toBe(100);
    expect(revs[0].saved_by).toBe('sourabh@amitek.test');
    expect(revs[1].snapshot.total).toBe(150);
    expect(revs[1].saved_by).toBe('shriya@amitek.test');
  });

  it('deleting a quotation also deletes its revision history', async () => {
    await db.query(`select delete_quotation('sf', 'r1')`);
    expect(await revisions('r1')).toEqual([]);
  });
});

describe('sales tracking (status / follow-up)', () => {
  let db;
  beforeAll(async () => { db = await freshDb(); });
  afterAll(async () => { await db.close(); });
  const upsert = async (q) => (await db.query(`select upsert_quotation('sf', $1::jsonb) as s`, [JSON.stringify(q)])).rows[0].s;
  const track = async (id, patch) => (await db.query(`select set_quotation_tracking('sf', $1, $2::jsonb) as s`, [id, JSON.stringify(patch)])).rows[0].s;

  it('a new quotation starts as Sent', async () => {
    expect((await upsert({ id: 't1', total: 1 })).status).toBe('sent');
  });

  it('status/follow-up changes do not create a revision, and log who changed the status', async () => {
    const s = await track('t1', { status: 'won', followUpDate: '2026-12-01', statusNote: 'PO received', revision: 9, total: 999 });
    expect(s.status).toBe('won');
    expect(s.followUpDate).toBe('2026-12-01');
    expect(s.total).toBe(1);          // content untouched
    expect(s.revision).toBe(0);       // no Rev bump
    expect(s.statusLog).toHaveLength(1);
    expect(s.statusLog[0]).toMatchObject({ status: 'won', by: 'a@amitek.test', note: 'PO received' });
    const revs = (await db.query(`select count(*)::int as n from quotation_revisions`)).rows[0].n;
    expect(revs).toBe(0);
  });

  it('an editor save opened before the status change cannot undo it', async () => {
    const s = await upsert({ id: 't1', total: 2, status: 'sent', followUpDate: null });
    expect(s.revision).toBe(1);
    expect(s.status).toBe('won');
    expect(s.followUpDate).toBe('2026-12-01');
  });

  it('rejects an unknown status', async () => {
    await expect(track('t1', { status: 'maybe' })).rejects.toThrow();
  });
});

describe('attendance-app access gate (quote_access_ok)', () => {
  let db;
  beforeAll(async () => { db = await freshDb(); });
  afterAll(async () => { await db.close(); });
  const as = async (email) => { await db.exec(`select set_config('test.jwt', '{"email":"${email}"}', false)`); return (await db.query('select quote_access_ok() as ok')).rows[0].ok; };

  it('a direct Quotation Tool login is always allowed', async () => {
    expect(await as('owner@amitek.test')).toBe(true);
  });
  it('an attendance login is allowed while on and checked within a day', async () => {
    await db.exec(`insert into quotation_access (email, active, checked_at) values ('staff@amitek.test', true, now())`);
    expect(await as('Staff@Amitek.test'.toLowerCase())).toBe(true);
  });
  it('refused once switched off, or when the last check is over a day old', async () => {
    await db.exec(`update quotation_access set active = false where email = 'staff@amitek.test'`);
    expect(await as('staff@amitek.test')).toBe(false);
    await db.exec(`update quotation_access set active = true, checked_at = now() - interval '25 hours'`);
    expect(await as('staff@amitek.test')).toBe(false);
  });
});
