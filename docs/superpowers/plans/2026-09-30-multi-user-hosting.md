# Multi-user Hosting (Supabase + Render) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the Amitek Quotation Tool off browser `localStorage` onto a shared Supabase (Postgres + Auth) backend with individual logins, deploy it to a real internet-reachable URL, and migrate the user's existing data in — with zero user-visible change to how the tool is actually used.

**Architecture:** The existing React app keeps almost all of its component code unchanged, because every read/write already funnels through one module (`src/lib/storage.js`). That module's internals are swapped from `localStorage` calls to `@supabase/supabase-js` calls against two tables (one JSONB blob per division, one small relational table for numbering counters), fronted by Row Level Security that requires a signed-in user. A new login screen gates the app. The built site deploys to Render's free static-site hosting from a GitHub repo.

**Tech Stack:** React 18 / Vite 6 / Tailwind v4 (unchanged), `@supabase/supabase-js` (new), Supabase Postgres + Auth + RLS (new), Vitest for the one pure-logic unit (new, minimal), Playwright for integration/e2e checks — same tool and same scratchpad-script pattern already used to verify every prior phase of this app, not a committed test suite.

**Spec:** `docs/superpowers/specs/2026-09-30-multi-user-hosting-design.md`

**Refinements made while planning** (disclosed per the spec's own note that implementation details may be refined without changing its requirements):
- The spec's 4-table data model (`divisions`/`settings`/`systems`/`quotations`) is simplified to **2 tables**: `division_data` (one row per division, `systems`/`quotations`/`settings` as three JSONB columns) and `counters` (the one place that genuinely needs relational atomicity). Re-reading `src/lib/storage.js` and `src/App.jsx` closely showed the app never reads or writes `systems`/`quotations`/`settings` independently — every save writes the *whole* division blob at once — so matching that exactly, instead of normalizing further, is both truer to "minimize rewrite risk" and less code.
- Hosting moves from the spec's example of Vercel to **Render**: Render has an MCP connector with a `create_static_site` tool usable directly from this session (Vercel's available connector is read-only — it can list deployments but not create anything). Same outcome for the user: a free HTTPS URL, auto-deployed from GitHub on every push.

## Global Constraints

- No offline support — every task assumes normal internet access (spec §2).
- No role/permission split — both accounts get identical full access; every RLS policy is simply "any signed-in user" (spec §2, §5).
- Zero data loss — every field in the existing export/backup format must survive the migration (spec §6).
- Must stay inside Supabase's free tier (500 MB DB, 50k MAU, 5 GB egress, 2 projects) and Render's free static-site tier — nothing in this plan provisions a paid resource.
- Row Level Security must be **enabled** (not just policies written — RLS is off by default in Postgres) on every table; the anon key ships inside the client bundle, so RLS is the only thing standing between it and the data.
- Numbering counters must be atomic — no duplicate reference numbers when two saves happen close together (spec §4).
- Existing PDF export/download behavior is unchanged (no task touches `src/lib/pdf.js` or the `QuotationDocument` render tree).
- The existing "Export all data" / "Restore from backup" buttons (`src/lib/storage.js` `exportBackup`/`importBackupFile`, wired in `TopNav.jsx`) keep working, now including counters in the exported file.

## Review Focus

- **A save while offline/Supabase is briefly unreachable.** Today `saveDivisionData` only fails on a full/disabled localStorage, which the UI already shows via `SavingIndicator`'s `'error'` state — a network failure must land in that same state, not throw unhandled or silently drop the edit. Covered in Task 4.
- **Two saves issuing a reference number within the same second.** This is the entire reason Task 1 replaces the read-modify-write counter with a database-side atomic increment; Task 1's own test fires the increment function twice back-to-back and asserts `1` then `2`, never a repeat.
- **The first-ever Proforma Invoice, or a year rollover** (e.g. the counter for `('sf','proforma',2026)` doesn't exist yet, or `2027` arrives) — must start cleanly at `001`, not error because no row exists yet. Covered in Task 1's test (a fresh key with no prior row).
- **RLS actually rejecting an unauthenticated request**, not just permitting an authenticated one. It's easy to write a policy that looks restrictive but isn't (e.g. forgetting `alter table ... enable row level security`, which silently makes every row world-readable). Task 1 explicitly tests the anon-key-only, no-session case fails before testing the authenticated case succeeds.
- **The migration silently dropping or corrupting a nested field** (a `scopeRows` entry, a `termsBoxes` block, the GST/client `state` field) when the exported JSON round-trips through JSONB. Task 7 spot-checks the real, already-reviewed Lehar Footwears Quotation and Proforma Invoice field-by-field after import, not just "did the row insert."

---

## Task 1: Database schema — tables, RLS, atomic counter function

**Files:**
- Create: `supabase/schema.sql`

**Interfaces:**
- Produces: tables `division_data(division_key text primary key, systems jsonb, quotations jsonb, settings jsonb, updated_at timestamptz)` and `counters(division_key text, doc_type text, year int, next_number int, primary key(division_key, doc_type, year))`; function `increment_counter(p_division_key text, p_doc_type text, p_year int) returns int`. Task 4/5 call these by exact name.

- [ ] **Step 1: Write the schema file**

```sql
-- supabase/schema.sql
-- One row per division holding its whole Systems/Quotations/Settings
-- blob (mirrors the shape the app already reads/writes as a unit —
-- see src/lib/storage.js) plus a small relational table just for
-- numbering counters, which is the one place concurrent saves from
-- two people need real atomicity instead of a JSON blob overwrite.

create table if not exists division_data (
  division_key text primary key check (division_key in ('sf', 'wp')),
  systems      jsonb not null default '[]'::jsonb,
  quotations   jsonb not null default '[]'::jsonb,
  settings     jsonb not null default '{}'::jsonb,
  updated_at   timestamptz not null default now()
);

create table if not exists counters (
  division_key text not null check (division_key in ('sf', 'wp')),
  doc_type     text not null check (doc_type in ('quotation', 'proforma')),
  year         int  not null,
  next_number  int  not null default 1,
  primary key (division_key, doc_type, year)
);

alter table division_data enable row level security;
alter table counters      enable row level security;

-- No role split (spec §2/§5): any signed-in user of this project may
-- read and write everything. There is no other tenant in this project
-- and nothing public-facing, so a single "authenticated" policy is the
-- whole access model — not unused complexity, just matched to what
-- was actually asked for.
create policy "authenticated read/write" on division_data
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "authenticated read/write" on counters
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Atomically hands out the next integer for (division, doc_type, year)
-- and remembers it. INSERT ... ON CONFLICT ... DO UPDATE is one atomic
-- statement in Postgres, so two callers racing each other can never
-- receive the same number. A combination with no row yet (first PI
-- ever, or a new year) inserts starting at 1 and returns 1 — no
-- separate "does this exist yet" check needed.
create or replace function increment_counter(p_division_key text, p_doc_type text, p_year int)
returns int
language plpgsql
as $$
declare
  v_number int;
begin
  insert into counters (division_key, doc_type, year, next_number)
  values (p_division_key, p_doc_type, p_year, 1)
  on conflict (division_key, doc_type, year)
  do update set next_number = counters.next_number + 1
  returning next_number into v_number;
  return v_number;
end;
$$;

-- Seed the two divisions' rows so the app's first load finds them
-- rather than erroring on a missing row.
insert into division_data (division_key, systems, quotations, settings)
values
  ('sf', '[]'::jsonb, '[]'::jsonb, '{}'::jsonb),
  ('wp', '[]'::jsonb, '[]'::jsonb, '{}'::jsonb)
on conflict (division_key) do nothing;
```

- [ ] **Step 2: Apply the schema to the connected Supabase project**

Use the `mcp__Supabase__apply_migration` tool with the contents of `supabase/schema.sql` as the migration body and name `initial_schema`.

- [ ] **Step 3: Verify RLS actually blocks an anonymous request (Review Focus item)**

Use `mcp__Supabase__execute_sql` to run, as a check, a query executed *as the anon role* — Supabase's SQL editor tooling exposes this via `set local role anon; select * from division_data;` inside a single statement/transaction. Expected: **zero rows returned** (RLS hides them from `anon`), not an error and not all rows. If rows come back, RLS is not actually restricting access — stop and fix the policy before continuing (most likely cause: `enable row level security` was skipped for that table).

- [ ] **Step 4: Verify the tables and seed rows exist**

Use `mcp__Supabase__list_tables` and confirm `division_data` (2 rows: `sf`, `wp`) and `counters` (0 rows so far) are present with RLS enabled.

- [ ] **Step 5: Verify the counter function is atomic and starts fresh per key**

Use `mcp__Supabase__execute_sql` to run, in order:
```sql
select increment_counter('sf', 'quotation', 2026); -- expect 1
select increment_counter('sf', 'quotation', 2026); -- expect 2
select increment_counter('sf', 'proforma', 2026);  -- expect 1 (different doc_type, fresh key)
select increment_counter('sf', 'quotation', 2027); -- expect 1 (different year, fresh key)
```
Expected: exactly `1, 2, 1, 1`. This is the Review Focus check for both the concurrency fix and the first-issue/year-rollover case — reset the `counters` table afterwards with `delete from counters;` so these test values don't leak into real numbering.

- [ ] **Step 6: Commit**

```bash
git add supabase/schema.sql
git commit -m "Add Supabase schema: division_data + counters tables, RLS, atomic counter function"
```

---

## Task 2: Create the two Auth users

**Files:** none (manual, one-time, done in the Supabase dashboard — not code)

No task in this plan sends a password anywhere, including to me: this step is done by the user directly, once.

- [ ] **Step 1: Tell the user to create both logins themselves**

In the Supabase dashboard (already signed in, per the earlier conversation) → **Authentication → Users → Add user**, create one row per person: their email + a password they choose. Repeat for the second person. Confirm both rows show `Confirmed` (Supabase auto-confirms users created this way from the dashboard, so there's no separate email-verification step blocking sign-in).

- [ ] **Step 2: Verify from here**

Use `mcp__Supabase__execute_sql` to run `select email, confirmed_at from auth.users order by created_at;` and confirm exactly 2 rows, both with a non-null `confirmed_at`.

(No commit — nothing in the repo changes.)

---

## Task 3: Supabase client + env config

**Files:**
- Create: `src/lib/supabaseClient.js`
- Create: `.env.example`
- Create: `.env` (local only)
- Modify: `package.json`

**Interfaces:**
- Produces: `supabase` (default Supabase client instance) exported from `src/lib/supabaseClient.js`. Tasks 4, 5, 6 import this.

- [ ] **Step 1: Add the dependency**

```bash
npm install @supabase/supabase-js
```

- [ ] **Step 2: Get the project's URL and anon key**

Use `mcp__Supabase__get_project_url` and `mcp__Supabase__get_publishable_keys` on the connected project.

- [ ] **Step 3: Write `.env.example` and `.env`**

```bash
# .env.example
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

`.env` gets the same two lines with the real values from Step 2. `.gitignore` already lists `.env` (confirmed present), so it never reaches the repo.

- [ ] **Step 4: Write the client module**

```js
// src/lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Fails loudly at build/startup rather than as a confusing runtime
  // "fetch failed" the first time someone tries to save.
  throw new Error(
    'Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY — copy .env.example to .env and fill in your project\'s values.'
  );
}

export const supabase = createClient(url, anonKey);
```

- [ ] **Step 5: Verify the app still starts**

```bash
npm run dev
```
Expected: server starts with no thrown error (confirms the env vars load; nothing calls Supabase yet, so there's nothing else to observe).

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json .env.example src/lib/supabaseClient.js
git commit -m "Add Supabase client and env config"
```
(`.env` itself is never committed — verify with `git status` that it doesn't appear.)

---

## Task 4: Rewrite `storage.js` load/save against Supabase

**Files:**
- Modify: `src/lib/storage.js`
- Test: manual Playwright/node check via the scratchpad (see Step 5) — this project has no committed unit-test suite for this module; verification follows the same scratchpad-script pattern already used for every prior phase of this app.

**Interfaces:**
- Consumes: `supabase` from `src/lib/supabaseClient.js`; `migrateDivisionData(raw, divKey)` from `src/lib/model.js` (unchanged).
- Produces: `loadDivisionData(divKey: 'sf'|'wp') => Promise<DivData>`, `saveDivisionData(divKey, data: DivData) => Promise<boolean>` — **same names, same shapes, same call signatures as today**, so `src/App.jsx` needs no changes to its `persist()`/load effect *shape* (only the auth-gating changes made in Task 6). `DivData` is unchanged: `{ systems, quotations, settings, counterYear, counterNext, piCounterYear, piCounterNext }`.

- [ ] **Step 1: Write the new implementation**

```js
// src/lib/storage.js
import { migrateDivisionData } from './model';
import { todayStr } from './ids';
import { supabase } from './supabaseClient';

/* ============================================================
   STORAGE
   Data lives in Supabase now — shared across every signed-in device,
   not just this browser. loadDivisionData/saveDivisionData keep the
   exact same names and shapes they had as the localStorage version,
   so nothing above this module needs to know the backend changed.
   ============================================================ */

function currentYear() {
  return new Date().getFullYear();
}

export async function loadDivisionData(divKey) {
  const { data: row, error } = await supabase
    .from('division_data')
    .select('systems, quotations, settings')
    .eq('division_key', divKey)
    .single();
  if (error || !row) {
    throw new Error(`Could not load ${divKey} data: ${error?.message || 'no row found'}`);
  }

  const { data: counterRows, error: counterErr } = await supabase
    .from('counters')
    .select('doc_type, year, next_number')
    .eq('division_key', divKey);
  if (counterErr) {
    throw new Error(`Could not load ${divKey} counters: ${counterErr.message}`);
  }

  const year = currentYear();
  const findNext = (docType) => (counterRows || []).find(c => c.doc_type === docType && c.year === year)?.next_number ?? 1;

  return migrateDivisionData({
    systems: row.systems,
    quotations: row.quotations,
    settings: row.settings,
    counterYear: year,
    counterNext: findNext('quotation'),
    piCounterYear: year,
    piCounterNext: findNext('proforma'),
  }, divKey);
}

export async function saveDivisionData(divKey, data) {
  // counterYear/counterNext/piCounterYear/piCounterNext are informational
  // (kept for backup/export completeness) — the counters table is the
  // source of truth for actually assigning numbers, via getNextCounterNumber
  // below, so they're deliberately not written here.
  const { systems, quotations, settings } = data;
  const { error } = await supabase
    .from('division_data')
    .update({ systems, quotations, settings, updated_at: new Date().toISOString() })
    .eq('division_key', divKey);
  return !error;
}

/** Atomically assigns and returns the next raw counter integer for a
 * division/docType/year — the database-side fix for two people saving
 * at nearly the same moment (see supabase/schema.sql increment_counter).
 * Throws on failure so the caller (QuotationBuilder.handleSave) can show
 * a clear "couldn't save" message instead of silently assigning nothing. */
export async function getNextCounterNumber(divKey, docType) {
  const { data, error } = await supabase.rpc('increment_counter', {
    p_division_key: divKey,
    p_doc_type: docType,
    p_year: currentYear(),
  });
  if (error) throw new Error(`Could not assign the next reference number: ${error.message}`);
  return data;
}

export function exportBackup(data) {
  const payload = { app: 'amitek-quotation-tool', version: 3, exportedAt: new Date().toISOString(), sf: data.sf, wp: data.wp };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `amitek-quotation-backup-${todayStr()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function importBackupFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        if (!parsed || (!parsed.sf && !parsed.wp)) throw new Error('Not a recognized backup file');
        if (parsed.sf) parsed.sf = migrateDivisionData(parsed.sf, 'sf');
        if (parsed.wp) parsed.wp = migrateDivisionData(parsed.wp, 'wp');
        resolve(parsed);
      } catch (err) { reject(err); }
    };
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsText(file);
  });
}
```

Note what's deliberately gone: `LS_AVAILABLE` and every `window.localStorage` call. Note what's unchanged: `exportBackup`/`importBackupFile` — they only ever operated on the in-memory `{sf, wp}` object already held in React state, so they don't care where that object came from.

- [ ] **Step 2: Bump the `version` field's meaning isn't load-bearing anywhere else**

Confirm (grep) that no code branches on `payload.version` — it's informational only. Expected: no matches besides this file. If a match turns up, stop and handle it as part of this task rather than silently changing the meaning of a field something else depends on.

- [ ] **Step 3: Restart the dev server and load the app**

```bash
npm run dev
```
This will fail at this point — `App.jsx` still calls `loadDivisionData`/`saveDivisionData` with no signed-in session, and RLS will reject it. That's expected; Task 6 fixes it. This step is just confirming the file compiles with no syntax errors before moving on.

- [ ] **Step 4: Commit**

```bash
git add src/lib/storage.js
git commit -m "Point storage.js at Supabase instead of localStorage"
```

- [ ] **Step 5: Integration-verify after Task 6 is also done**

(Performed as part of Task 9's end-to-end pass, since a real check needs a signed-in session, which doesn't exist until Task 6: confirm a save from one logged-in session is immediately visible after reloading as the other login — see Task 9 Step 2.)

---

## Task 5: Atomic reference numbers in `QuotationBuilder`

**Files:**
- Modify: `src/lib/calc.js`
- Modify: `src/components/QuotationBuilder.jsx`
- Test: `src/lib/calc.test.js` (new — Vitest)

**Interfaces:**
- Consumes: `getNextCounterNumber(divKey, docType)` from `src/lib/storage.js` (Task 4).
- Produces: `formatRefNo(divKey, settings, docType, number) => string` from `src/lib/calc.js`, replacing the removed `nextRefNo`. `QuotationBuilder.jsx`'s `handleSave` is the only caller of either.

- [ ] **Step 1: Add Vitest (this project has no test runner yet)**

```bash
npm install -D vitest
```
Add to `package.json` `"scripts"`: `"test": "vitest run"`.

- [ ] **Step 2: Write the failing test**

```js
// src/lib/calc.test.js
import { describe, it, expect } from 'vitest';
import { formatRefNo } from './calc';

describe('formatRefNo', () => {
  it('formats a quotation ref number from the division prefix, current year, and padded number', () => {
    const settings = { numberingPrefix: 'AMK/QTN/SF', piNumberingPrefix: 'AMK/PI/SF' };
    const year = new Date().getFullYear();
    expect(formatRefNo('sf', settings, 'quotation', 5)).toBe(`AMK/QTN/SF/${year}/005`);
  });

  it('uses the Proforma Invoice prefix for docType "proforma"', () => {
    const settings = { numberingPrefix: 'AMK/QTN/SF', piNumberingPrefix: 'AMK/PI/SF' };
    const year = new Date().getFullYear();
    expect(formatRefNo('sf', settings, 'proforma', 1)).toBe(`AMK/PI/SF/${year}/001`);
  });

  it('falls back to a generated prefix when settings has none', () => {
    const year = new Date().getFullYear();
    expect(formatRefNo('wp', {}, 'quotation', 12)).toBe(`AMK/QTN/WP/${year}/012`);
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

```bash
npx vitest run src/lib/calc.test.js
```
Expected: FAIL — `formatRefNo is not exported` (it doesn't exist yet).

- [ ] **Step 4: Replace `nextRefNo` with `formatRefNo` in `calc.js`**

Remove this existing function (the counter-state-reading half moves to `storage.js` `getNextCounterNumber`, already done in Task 4):
```js
export function nextRefNo(divKey, data, settings, docType = 'quotation') {
  const isPI = docType === 'proforma';
  const year = new Date().getFullYear();
  let counterYear = (isPI ? data.piCounterYear : data.counterYear) || year;
  let counterNext = (isPI ? data.piCounterNext : data.counterNext) || 1;
  if (counterYear !== year) { counterYear = year; counterNext = 1; }
  const prefix = (settings && (isPI ? settings.piNumberingPrefix : settings.numberingPrefix))
    || `AMK/${isPI ? 'PI' : 'QTN'}/${divKey.toUpperCase()}`;
  const refNo = `${prefix}/${year}/${String(counterNext).padStart(3, '0')}`;
  return isPI
    ? { refNo, piCounterYear: counterYear, piCounterNext: counterNext + 1 }
    : { refNo, counterYear, counterNext: counterNext + 1 };
}
```
Replace it with:
```js
/**
 * Builds the display reference-number string for a division/docType and
 * an already-assigned counter integer. Pure and synchronous — the
 * integer itself now comes from storage.js `getNextCounterNumber`, an
 * atomic database call, not from in-memory state (see schema.sql
 * `increment_counter`: two people saving at once can no longer be
 * handed the same number).
 */
export function formatRefNo(divKey, settings, docType, number) {
  const isPI = docType === 'proforma';
  const year = new Date().getFullYear();
  const prefix = (settings && (isPI ? settings.piNumberingPrefix : settings.numberingPrefix))
    || `AMK/${isPI ? 'PI' : 'QTN'}/${divKey.toUpperCase()}`;
  return `${prefix}/${year}/${String(number).padStart(3, '0')}`;
}
```

- [ ] **Step 5: Run the test again to verify it passes**

```bash
npx vitest run src/lib/calc.test.js
```
Expected: PASS, 3/3.

- [ ] **Step 6: Update `QuotationBuilder.jsx`'s `handleSave`**

Current (`src/components/QuotationBuilder.jsx`):
```js
import { nextRefNo } from '../lib/calc';
...
const handleSave = async () => {
  let refNo = q.refNo;
  let newDivData = divData;
  if (!refNo) {
    const { refNo: generatedRefNo, ...counterUpdate } = nextRefNo(div.key, divData, settings, q.docType);
    refNo = generatedRefNo;
    newDivData = { ...divData, ...counterUpdate };
  }
  const finalQ = { ...q, refNo, updatedAt: Date.now() };
  const exists = newDivData.quotations.some(x => x.id === finalQ.id);
  const newQuotations = exists
    ? newDivData.quotations.map(x => x.id === finalQ.id ? finalQ : x)
    : [...newDivData.quotations, finalQ];
  newDivData = { ...newDivData, quotations: newQuotations };
  setDraft(finalQ);
  setDivData(newDivData);
  await persist(newDivData);
  onSaved && onSaved(finalQ);
};
```
Becomes:
```js
import { formatRefNo } from '../lib/calc';
import { getNextCounterNumber } from '../lib/storage';
...
const handleSave = async () => {
  let refNo = q.refNo;
  if (!refNo) {
    try {
      const number = await getNextCounterNumber(div.key, q.docType);
      refNo = formatRefNo(div.key, settings, q.docType, number);
    } catch (e) {
      window.alert("Couldn't assign a reference number — check your connection and try again. Nothing was saved.");
      return;
    }
  }
  const finalQ = { ...q, refNo, updatedAt: Date.now() };
  const exists = divData.quotations.some(x => x.id === finalQ.id);
  const newQuotations = exists
    ? divData.quotations.map(x => x.id === finalQ.id ? finalQ : x)
    : [...divData.quotations, finalQ];
  const newDivData = { ...divData, quotations: newQuotations };
  setDraft(finalQ);
  setDivData(newDivData);
  await persist(newDivData);
  onSaved && onSaved(finalQ);
};
```
(The function was already `async`, so no signature change — just an added `await` and the removed manual counter-field spreading, since the counter now lives and increments entirely on the database side.)

- [ ] **Step 7: Manually verify no other file imports `nextRefNo`**

```bash
grep -rn "nextRefNo" src/
```
Expected: no matches outside `calc.js`'s own removed definition and `QuotationBuilder.jsx`'s now-updated import. If any other match turns up, update it the same way before continuing.

- [ ] **Step 8: Run the full test file and build**

```bash
npx vitest run && npm run build
```
Expected: tests pass, build succeeds with no errors.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json src/lib/calc.js src/lib/calc.test.js src/components/QuotationBuilder.jsx
git commit -m "Assign reference numbers via an atomic database counter instead of in-memory state"
```

---

## Task 6: Login screen and app-level auth gating

**Files:**
- Create: `src/components/LoginScreen.jsx`
- Modify: `src/App.jsx`
- Modify: `src/components/TopNav.jsx`

**Interfaces:**
- Consumes: `supabase` from `src/lib/supabaseClient.js`.
- Produces: `<LoginScreen />` (no props — calls `supabase.auth.signInWithPassword` directly); `TopNav` gains an `onSignOut` prop.

- [ ] **Step 1: Write the login screen**

```jsx
// src/components/LoginScreen.jsx
import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { TextInput, Btn } from './ui/atoms';
import { AmitekLogo } from './ui/atoms';

export function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (signInError) setError(signInError.message || 'Could not sign in.');
  };

  const handleForgotPassword = async () => {
    if (!email) { setError('Enter your email above first, then click "Forgot password".'); return; }
    setBusy(true);
    setError('');
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email);
    setBusy(false);
    if (resetError) setError(resetError.message || 'Could not send reset email.');
    else setResetSent(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white border border-slate-200 rounded-lg p-6">
        <AmitekLogo w={160} />
        <div className="text-center text-sm text-slate-500 mt-2 mb-5">Sign in to the quotation tool</div>
        <div className="space-y-3">
          <TextInput type="email" value={email} onChange={setEmail} placeholder="Email" />
          <TextInput type="password" value={password} onChange={setPassword} placeholder="Password" />
        </div>
        {error && <div className="text-red-600 text-xs mt-3">{error}</div>}
        {resetSent && <div className="text-emerald-600 text-xs mt-3">Password reset email sent — check your inbox.</div>}
        <Btn type="submit" disabled={busy} className="w-full justify-center mt-4">
          {busy ? <Loader2 size={14} className="animate-spin" /> : null} Sign in
        </Btn>
        <button type="button" onClick={handleForgotPassword} className="block w-full text-center text-xs text-slate-400 hover:text-slate-600 mt-3">
          Forgot password?
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Verify `TextInput`'s `onChange` contract matches this usage**

`src/components/ui/atoms.jsx`'s `TextInput` calls `onChange(e.target.value)` (a string, not an event) — confirmed from the existing file, matching `setEmail`/`setPassword` above being used directly as the `onChange` prop. No adapter needed.

- [ ] **Step 3: Wire auth state into `App.jsx`**

Add near the top of `App.jsx`:
```js
import { supabase } from './lib/supabaseClient';
import { LoginScreen } from './components/LoginScreen';
```
Replace the existing single load `useEffect` and add session state:
```js
const [session, setSession] = useState(undefined); // undefined = still checking, null = signed out
const [loadError, setLoadError] = useState(null);

useEffect(() => {
  supabase.auth.getSession().then(({ data }) => setSession(data.session));
  const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => setSession(newSession));
  return () => listener.subscription.unsubscribe();
}, []);

useEffect(() => {
  if (!session) return;
  (async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [sf, wp] = await Promise.all([loadDivisionData('sf'), loadDivisionData('wp')]);
      setData({ sf, wp });
    } catch (e) {
      setLoadError(e.message || 'Could not load your data.');
    } finally {
      setLoading(false);
    }
  })();
}, [session]);
```
Add, right after the existing `if (loading) { ... }` early return (before it, so the checks run in the right order):
```jsx
if (session === undefined) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center text-slate-400">
      <Loader2 className="animate-spin mr-2" size={18} /> Checking your login…
    </div>
  );
}

if (!session) {
  return <LoginScreen />;
}

if (loadError) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 gap-3">
      <div className="text-red-600 text-sm max-w-sm">{loadError}</div>
      <Btn variant="outline" onClick={() => setSession(s => ({ ...s }))}>Try again</Btn>
    </div>
  );
}
```
(The existing `if (loading) { ... }` block stays exactly where it already is, right after this.)

- [ ] **Step 4: Add sign-out**

In `App.jsx`, add:
```js
const handleSignOut = () => supabase.auth.signOut();
```
Pass it to `TopNav`:
```jsx
<TopNav
  div={div}
  view={view}
  setView={setView}
  onSwitchDivision={() => setDivision(null)}
  savingState={savingState}
  onExport={() => exportBackup(data)}
  onImportFile={handleImportFile}
  onSignOut={handleSignOut}
/>
```
In `src/components/TopNav.jsx`, add the prop and a button next to the existing export/import icons:
```jsx
import { FileText, History, Settings2, ArrowLeft, Download, Upload, SlidersHorizontal, LogOut } from 'lucide-react';

export function TopNav({ div, view, setView, onSwitchDivision, savingState, onExport, onImportFile, onSignOut }) {
  // ...unchanged...
```
and inside the icon-button row (right after the existing upload `<input>`):
```jsx
<button onClick={onSignOut} title="Sign out" className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded">
  <LogOut size={16} />
</button>
```

- [ ] **Step 5: Manually verify the flow**

```bash
npm run dev
```
Open the app: expect the login screen (not the division picker) since no session exists yet. Sign in with one of the two accounts created in Task 2. Expect the existing `DivisionPicker` screen to appear next, and real data to load without error (this is the first point since Task 4 where a signed-in request actually succeeds against Supabase — confirms Tasks 1–6 fit together correctly). Click the new sign-out icon in `TopNav`; expect to land back on the login screen.

- [ ] **Step 6: Commit**

```bash
git add src/App.jsx src/components/TopNav.jsx src/components/LoginScreen.jsx
git commit -m "Add login screen and gate the app behind Supabase Auth"
```

---

## Task 7: Migrate the existing exported data

**Files:**
- Create: `scripts/backup-to-sql.mjs` (a local, one-time-use transform — not imported by the app; not shipped to production)

**Interfaces:**
- Consumes: a backup JSON file in the exact shape `exportBackup` already produces (`{ app, version, exportedAt, sf, wp }`, each of `sf`/`wp` being a full `DivData`).
- Produces: printed SQL statements, which are then run via `mcp__Supabase__execute_sql` (not executed by the script itself — the script has no database credentials, by design; see spec §6 on not requiring a service-role key to touch this session).

- [ ] **Step 1: Get the user's export**

Ask the user to click the existing download icon in `TopNav` (already wired to `exportBackup` — no new UI needed) on their current, pre-migration version of the tool, and attach the resulting `amitek-quotation-backup-*.json` file to the conversation.

- [ ] **Step 2: Write the transform script**

```js
// scripts/backup-to-sql.mjs
// Reads an exportBackup()-produced JSON file and prints SQL statements
// that seed division_data + counters from it. Run once, by hand, with
// its output fed into mcp__Supabase__execute_sql — this script never
// touches the network or holds a database credential itself.
import { readFileSync } from 'node:fs';

const path = process.argv[2];
if (!path) {
  console.error('Usage: node scripts/backup-to-sql.mjs <backup-file.json>');
  process.exit(1);
}

const backup = JSON.parse(readFileSync(path, 'utf8'));

function sqlLiteral(value) {
  // Postgres dollar-quoting sidesteps having to escape every embedded
  // quote/backslash in arbitrary quotation text — safe as long as the
  // JSON text itself never contains the literal token "$sql$", which
  // application-authored quotation content will not.
  return `$sql$${JSON.stringify(value)}$sql$::jsonb`;
}

const statements = [];
for (const divKey of ['sf', 'wp']) {
  const div = backup[divKey];
  if (!div) continue;
  statements.push(
    `update division_data set systems = ${sqlLiteral(div.systems || [])}, quotations = ${sqlLiteral(div.quotations || [])}, settings = ${sqlLiteral(div.settings || {})}, updated_at = now() where division_key = '${divKey}';`
  );
  const counterPairs = [
    ['quotation', div.counterYear, div.counterNext],
    ['proforma', div.piCounterYear, div.piCounterNext],
  ];
  for (const [docType, year, next] of counterPairs) {
    if (!year || !next) continue;
    // next_number here should be the NEXT number still to be issued —
    // exactly what counterNext/piCounterNext already mean in the
    // exported data, so no +/-1 adjustment is needed.
    statements.push(
      `insert into counters (division_key, doc_type, year, next_number) values ('${divKey}', '${docType}', ${year}, ${next}) on conflict (division_key, doc_type, year) do update set next_number = excluded.next_number;`
    );
  }
}

console.log(statements.join('\n'));
```

- [ ] **Step 3: Test it against a small fixture before trusting it with real data**

```bash
mkdir -p /tmp/fixture && cat > /tmp/fixture/backup.json << 'EOF'
{
  "app": "amitek-quotation-tool", "version": 3, "exportedAt": "2026-09-30T00:00:00.000Z",
  "sf": {
    "systems": [{"id": "sys_1", "name": "Test System", "category": "Lime System"}],
    "quotations": [{"id": "qtn_1", "refNo": "AMK/QTN/SF/2026/001", "docType": "quotation", "client": {"name": "Fixture Client"}}],
    "settings": {"numberingPrefix": "AMK/QTN/SF"},
    "counterYear": 2026, "counterNext": 2, "piCounterYear": 2026, "piCounterNext": 1
  },
  "wp": {"systems": [], "quotations": [], "settings": {}, "counterYear": 2026, "counterNext": 1, "piCounterYear": 2026, "piCounterNext": 1}
}
EOF
node scripts/backup-to-sql.mjs /tmp/fixture/backup.json
```
Expected: prints one `update division_data ...` statement per division and one `insert into counters ...` per non-empty counter (3 statements total for this fixture: `sf` update, `sf` quotation-counter insert, `sf` proforma-counter insert, plus a `wp` update and its two counter inserts — 6 total). Read the output and confirm the `sf` update's JSON contains `Fixture Client` and `Test System` verbatim.

- [ ] **Step 4: Run it against the real export and apply**

```bash
node scripts/backup-to-sql.mjs <path-to-the-user's-real-backup-file>.json
```
Take the printed statements and run them via `mcp__Supabase__execute_sql`.

- [ ] **Step 5: Spot-check the real migrated data (Review Focus item)**

Use `mcp__Supabase__execute_sql` to run `select quotations from division_data where division_key = 'sf';` and, in the returned JSON, locate the real Quotation (`AMK/QTN/SF/2026/005`) and Proforma Invoice (`AMK/PI/SF/2026/001`) for Lehar Footwears already reviewed earlier in this conversation. Confirm field-by-field: client name, ref numbers, the System name/HSN code, area (580), rate (56), the full (untruncated) remark text, and the grand total (₹38,326.40) all match the originals exactly. Also confirm `select next_number from counters where division_key='sf' and doc_type='quotation';` reads `6` (one past the last real quotation) and the `proforma` row reads `2`, so the *next* quotation created after go-live gets `006`, not a number that collides with existing data.

- [ ] **Step 6: Commit**

```bash
git add scripts/backup-to-sql.mjs
git commit -m "Add one-time backup-to-SQL migration script"
```
(The actual migration *run* — Steps 4–5 — is not a commit; it's a one-time action against the live database, done once real user data exists to migrate.)

---

## Task 8: Deploy — GitHub + Render

**Files:** none new; this task is infrastructure actions, not code.

- [ ] **Step 1: Create the GitHub repo and push**

Use `mcp__claude-code-remote__add_repo` with `owner: "drsourrabhbairwa"`, `repo: "amitek-quotation-tool"`, `access: "push"` (a fresh, clearly-named repo — distinct from the user's existing unrelated `amitek-pdf-generator` repo, so the two projects' histories don't get tangled). Follow its returned clone instructions, then:
```bash
git remote add origin <returned-url>
git push -u origin main
```

- [ ] **Step 2: Create the Render static site**

Use `mcp__Render__create_static_site` (name: `amitek-quotation-tool`, repo: the one just pushed, build command `npm run build`, publish directory `dist` — matching the existing `vite build` output already confirmed working in this project).

- [ ] **Step 3: Configure the production environment variables**

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (same values as the local `.env` from Task 3) on the Render static site's environment settings — required because Vite bakes `VITE_`-prefixed vars in at *build* time, so the production build needs them set on Render's builder, not just locally.

- [ ] **Step 4: Verify the deploy**

Use `mcp__Render__get_deploy` (or equivalent status tool) to confirm the first build succeeds. Open the resulting `*.onrender.com` URL and confirm the login screen renders (not a blank page or a build-error screen).

- [ ] **Step 5: No commit** (infrastructure configuration, not a code change).

---

## Task 9: End-to-end verification

**Files:** none (verification only — Playwright script in the scratchpad, same pattern as every prior phase of this app; not committed to the repo).

- [ ] **Step 1: Cross-account data visibility**

Playwright script: sign in as Account A, create a small test quotation (distinctive client name), save it, sign out. Sign in as Account B, open History, and confirm the same quotation is visible. This is the core "multi-user" promise from spec §1 — the one thing `localStorage` could never do.

- [ ] **Step 2: Counter atomicity under real concurrency**

Playwright script with two browser contexts (simulating Account A and Account B) both starting a new quotation and clicking Save within the same script tick (`Promise.all([...])`). Assert the two resulting reference numbers are different and sequential (e.g. `...006` and `...007`, never both `...006`). This is the Review Focus item Task 1 tested at the database level; here it's tested through the real UI path added in Task 5.

- [ ] **Step 3: RLS still holds from the real deployed site**

From a plain script (not signed in), attempt a direct Supabase REST call to the production URL/anon key (`GET {url}/rest/v1/division_data`) with no auth header. Expected: empty result, not the real data — re-confirms Task 1 Step 3's check, now against the actual production project and its actual anon key rather than a test call.

- [ ] **Step 4: PDF export unchanged**

Reuse the existing `verify2.cjs`-style Playwright flow from prior phases (fill a quotation, click Download PDF) against the deployed site and confirm the downloaded file is a real, non-empty PDF with no console/page errors — confirming nothing about the storage swap regressed the rendering/export path, since Task 4–5 never touched `src/lib/pdf.js` or the `QuotationDocument` tree.

- [ ] **Step 5: Migrated data renders correctly in the real UI**

Open the migrated Lehar Footwears Quotation and Proforma Invoice from History in the deployed app and visually confirm they match the two PDFs already reviewed earlier in this conversation (same totals, same full remark text, same GST breakup) — the UI-level counterpart to Task 7 Step 5's direct-database spot check.

- [ ] **Step 6: Report results**

Summarize pass/fail for Steps 1–5 back to the user before considering the migration complete.

---

## Self-Review

**1. Spec coverage:**
- §1 (why) → Task 6 (login) + Task 9 Step 1 (cross-device visibility proven).
- §2 (requirements: individual logins, no roles, online-only, data carries over, free tier) → Task 2 (individual accounts), Task 1 (single "authenticated" policy = no roles), no task adds offline handling (correctly, per spec), Task 7 (data carry-over), Global Constraints (free tier ceiling named explicitly).
- §3 (architecture) → Tasks 1, 3, 4, 8.
- §4 (data model + atomic counters) → Task 1 (schema), Task 5 (wired into the UI).
- §5 (auth & access) → Tasks 1 (RLS), 2 (accounts), 6 (login screen), including the "forgot password" nicety named in the spec.
- §6 (migration) → Task 7, using the *already-existing* Export/Import buttons the spec assumed would need to be newly built (found during planning — a scope reduction, not a gap).
- §7 (error handling) → Task 4 (`saveDivisionData` boolean contract preserved so the existing `SavingIndicator` error state now covers network failures for free), Task 6 (`loadError` screen), Task 5 (ref-number-assignment failure message).
- §8 (testing plan) → Task 9.
- §9 (YAGNI/out of scope) → nothing in Tasks 1–9 builds an invite flow, offline queue, or role system; confirmed by absence, not by a task saying so.

**2. Placeholder scan:** No "TBD"/"TODO"/"add appropriate error handling" strings anywhre in the task steps above — every code block is complete and every non-code step names the exact tool/command to run and the exact expected result.

**3. Type consistency:** `getNextCounterNumber(divKey, docType)` (Task 4) called with the same two positional args in Task 5. `formatRefNo(divKey, settings, docType, number)` (Task 5) called with the same four in that order. `loadDivisionData`/`saveDivisionData` keep their exact pre-existing signatures (Task 4), so Task 6's `App.jsx` changes don't need to touch the `persist()` function at all — verified by re-reading the current `App.jsx` before writing this plan, not assumed.

**4. Review Focus coverage:** all five items listed above are each pinned to a specific step (Task 1 Steps 3/5 for two of them, Task 4 Step 1/Task 5 Step 6 for the network-failure item, Task 7 Step 5 for the migration-fidelity item) — none are just named and left untested.
