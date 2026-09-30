# Multi-user hosting for the Amitek Quotation Tool

Status: approved in conversation, pending written sign-off
Date: 2026-09-30

## 1. Why

The tool currently stores everything (Systems, quotations, settings, numbering
counters) in the browser's `localStorage`. That data belongs to one browser on
one device — it cannot be seen from a second computer or phone, no matter how
the app is configured. The user needs two people to create and view the same
quotations from different devices, including away from the office (client
sites, phones, travel), which requires moving storage off the device and onto
a real shared backend reachable over the internet.

## 2. Requirements (confirmed with the user)

- **Who / where**: two people, at least one of whom needs access away from
  the office (not office-LAN-only).
- **Connectivity**: normal internet access at every location — no offline /
  sync-later requirement.
- **Accounts**: each person signs in individually (their own email +
  password) — but **no role/permission split**. Both accounts have identical,
  full access to everything in both divisions. (An owner/staff split was
  considered and explicitly declined — "no real need for two roles.")
- **Existing data**: everything already saved in the current localStorage
  version (Systems, quotations incl. the real Lehar Footwears
  quotation/Proforma Invoice, settings, counters) must carry over — starting
  fresh is not acceptable.
- **Budget**: free to start; must stay comfortably within Supabase's free
  tier at this scale (2 users).
- Out of scope (explicitly not needed): offline support, real-time
  co-editing of the same quotation, public/client-facing access, role-based
  permissions, a native mobile app.

## 3. Architecture

```
┌─────────────────┐        HTTPS         ┌───────────────────────┐
│  React app       │ ───────────────────▶ │  Supabase project      │
│  (unchanged UI)   │ ◀─────────────────── │  - Postgres database   │
│  hosted on Vercel │   @supabase/supabase-js │  - Auth (email/password)│
└─────────────────┘        (anon key)      │  - Row Level Security  │
                                            └───────────────────────┘
```

- **Frontend**: the existing React/Vite app, unchanged in almost every
  component. All persistence already goes through one module,
  `src/lib/storage.js` — that module is rewritten to call Supabase instead of
  `localStorage`; callers become `async`/await loading states instead of
  synchronous reads.
- **Backend**: Supabase (managed Postgres + Auth + Row Level Security). No
  custom server to run or maintain.
- **Hosting**: the built app is deployed to Vercel's free tier from a GitHub
  repo (pushed from this session), so every future update is a `git push`
  away from being live — no more manual zip files. Default address is a
  `*.vercel.app` URL; a subdomain of `amitekinfra.com` can be pointed at it
  later via a DNS change, which is not required to go live.

## 4. Data model

Kept deliberately close to the existing in-app shape (a nested JS object per
quotation) rather than fully normalized into many relational tables — this
minimizes rewrite risk in the React components, which already expect this
shape, and nothing about the current feature set needs cross-quotation SQL
reporting. This can be normalized further later if the user ever wants
reporting like "total quoted this month across all line items."

| Table | Purpose | Shape |
|---|---|---|
| `divisions` | the 2 fixed divisions | `id`, `key` ('sf'/'wp'), `label` — seeded once, effectively static |
| `settings` | one row per division | `division_id`, `data` (JSONB — letterhead, company identity, bank, numbering prefixes, terms templates, signatories) |
| `systems` | reusable Systems per division | `id`, `division_id`, `name`, `category` (real columns, for the picker/grouping UI), `data` (JSONB — everything else) |
| `quotations` | every quotation & Proforma Invoice | `id`, `division_id`, `doc_type`, `ref_no`, `client_name` (denormalized for the history list/search), `created_by`, `created_at`, `updated_at`, `data` (JSONB — the full nested object: line items, client, applicator, shipping, terms, totals inputs, etc., exactly as today) |
| `counters` | numbering series | `division_id`, `doc_type`, `year`, `next_number` |

**Numbering counters get an atomic increment function** (a small Postgres
function called via RPC), rather than the current "read the counter, add
one, write it back" pattern. That pattern only ever worked safely because
localStorage was single-device; with two people saving from two devices, two
saves at nearly the same moment could otherwise generate the same reference
number. This is the one place the multi-user version needs to be more
careful than the original, and it's a small, well-contained fix.

## 5. Auth & access

- Supabase Auth, email + password, standard "forgot password" reset email
  included (low cost, real value for 2 non-technical users).
- Exactly 2 accounts, created directly (by me, once, during setup) rather
  than building an in-app "invite a user" screen — not worth building for 2
  known people.
- Row Level Security: every table's policy is simply "any signed-in user may
  read and write" (`auth.role() = 'authenticated'`). There is no other
  tenant in this Supabase project and no role split to enforce, so a more
  elaborate policy would be unused complexity.

## 6. Migration of existing data

1. Add a small **"Export all data"** button to the current tool (kept
   permanently afterwards as a manual backup feature, not thrown away after
   migration) that downloads one JSON file containing both divisions'
   Systems, quotations, settings, and counters.
2. User runs it once and sends the file back in this conversation.
3. A one-time import (run once via direct database access) loads that JSON
   into the new Supabase tables, preserving every id, reference number,
   date, and total exactly as they are today — including the real Lehar
   Footwears Quotation/Proforma Invoice already created.
4. The migrated data is verified against the original (ref numbers, totals,
   line item text) before the two accounts start using the hosted version
   for real work.

## 7. Error handling

- Saving/loading is now a network call, not instant — buttons show a
  loading state, matching the pattern already used for PDF export
  (`downloading` state) elsewhere in the app.
- A failed save shows a clear "Couldn't save — check your connection and try
  again" message rather than silently losing changes (localStorage never
  needed this; the network can now fail in ways local storage couldn't).
- A wrong email/password shows a plain error on the login screen.

## 8. Testing plan

Before either account is used for real work:

- Automated (Playwright, as used for prior phases of this app): login
  succeeds/fails correctly; a quotation saved while logged in as one account
  is visible when logged in as the other; the numbering counter never
  produces a duplicate ref number under two back-to-back saves; PDF
  export/download still works unchanged end-to-end.
- Manual/visual: the migrated Lehar Footwears Quotation and Proforma Invoice
  are compared line-by-line against the originals already reviewed in this
  conversation.

## 9. Explicitly out of scope (YAGNI)

Offline support, real-time co-editing safeguards beyond the counter fix
above, role-based permissions, an in-app user-invite flow, a native mobile
app, and full relational normalization of line items. None were requested;
each can be added later without discarding this design if the need arises.
