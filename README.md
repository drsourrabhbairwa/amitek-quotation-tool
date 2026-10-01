# Amitek Quotation Tool

*Amitek Paint and Coating* — a quotation and Proforma Invoice builder for
**Amitek Seamless Floorings** and **Amitek Waterproofing Solutions** (APP
Paints Chemicals Pvt. LTD.) — an admin panel for managing reusable
"Systems" (grouped by category) per division, a fully customizable
quotation builder with print-ready output matching the original
letterheads, one-click conversion of any quotation into a Proforma
Invoice, and a searchable history of everything created.

> **Fix (30 Sep 2026):** "Download PDF" inside the New/Edit screen used to
> rasterize the live editable form as-is — so an unsaved or freshly-converted
> document could download with empty field borders, the "+ charge" and
> "+ Add section" buttons, and remove icons baked into the PDF, and a long
> Remark could get visually clipped to one line. Download PDF (from the
> editor and from History) now always renders the same clean, read-only
> layout regardless of which screen it's triggered from, and Remark can wrap
> to multiple lines like every other note field. Nothing about how you fill
> in a quotation changed — only what the exported PDF looks like.

**Highlights:**

- **Column chooser** — show/hide, rename, and add custom columns per
  quotation (not a saved layout — each quotation keeps its own column set).
- **Edit rows two ways** — type directly in the table, or click the pencil
  icon to edit a row's fields in a form.
- **Section / block headers** — add a full-width heading row (e.g. "Hotel
  Block", "Villa Block", "Ground Floor") to group line items on a single
  quotation that covers several areas or buildings. Purely a visual
  grouping — it doesn't affect totals.
- **System categories** — Systems are grouped (e.g. Nano Topping System,
  Lime System, Araish Finish System for Seamless Floorings; Nano Pore /
  Under-Tile / Swimming Pool systems and Material products for
  Waterproofing) both in Manage Systems and in the picker when building a
  quotation. Add your own categories freely — it's a free-text field with
  suggestions, not a fixed list.
- **Print as** — a quotation can print under this division's own
  letterhead, or under the parent company identity ("Amitek Paint and
  Coating" / APP Paints Chemicals Pvt. LTD.) — pick per quotation from the
  builder toolbar. Both identities are set up once in Settings.
- **Proforma Invoice** — turn any saved quotation into a Proforma Invoice
  with one click (History → open a quotation → Convert to Proforma
  Invoice). It's a separate saved document with its own numbering series
  and a proper CGST+SGST (intrastate) / IGST (interstate) GST breakup
  based on the client's state — editing it never changes the original
  quotation.
- **Shipping & Delivery** — an optional card (toggle on per quotation, same
  pattern as the Applicator/Contractor card) for consignee, delivery
  address, transport mode, timeline and freight terms.
- **Settings panel** (no code required) — set each division's letterhead
  (logo, address, GSTIN, phone, website, email) *and* the alternate parent-
  company letterhead, bank details and signatories (with signature/stamp
  image upload), reusable Terms & Conditions templates, and default GST /
  discount / extra-charge presets and numbering prefixes (quotations and
  Proforma Invoices number separately).
- **Two PDF paths** — refined browser Print-to-PDF (sharp selectable text,
  repeated table headers on every page, no rows split across a page break,
  A4 portrait or landscape), and a one-click **Download PDF** button
  (rasterized image-based PDF, filename derived from the document's
  reference number).
- Settings changes only affect **new** quotations — every saved quotation
  keeps a snapshot of the letterhead, bank details, signatory, terms and
  columns it was created with, so editing Settings later never silently
  changes an already-sent quotation.

## How data is stored

Everything — both divisions' Systems and quotation/Proforma Invoice
history — lives in a shared **Supabase** (Postgres) database, not in the
browser. That means:

- Both signed-in users see the **same** data, from any device, anywhere
  with internet — not just one browser on one computer.
- Signing in is required (Supabase Auth, email + password). There is no
  role split between the two accounts — either one has full read/write
  access to both divisions.
- Saving a quotation, a Systems edit, or a Settings change writes only
  that one record to the database (see `supabase/schema.sql`'s
  `upsert_quotation` / `delete_quotation` / `replace_systems` /
  `replace_settings` functions) — so two people saving at nearly the same
  moment can't silently erase each other's changes.
- Reference numbers (quotation/Proforma Invoice, per division, per year)
  are assigned by an atomic database function (`increment_counter`), so
  two people saving at once can never be handed the same number.

**Use the ⬇ Download button in the top bar periodically anyway** — it
exports a JSON snapshot of both divisions' Systems and quotation history.
It's not your only copy of the data any more (Supabase is), but it's a
handy point-in-time backup to keep somewhere safe.

## Running it locally

Requires [Node.js](https://nodejs.org) 18 or newer, and a `.env` file with
your Supabase project's URL and anon/publishable key (see `.env.example`).

```bash
npm install
npm run dev
```

Open the URL it prints (usually `http://localhost:5173`). You'll need to
sign in with one of the two Supabase Auth accounts.

## Running the tests

```bash
npm test
```

Covers the totals/reference-number math (`src/lib/calc.test.js`) and the
real `supabase/schema.sql` run against an in-memory Postgres via
`@electric-sql/pglite` (`supabase/schema.test.js`) — including a test that
simulates two overlapping saves to confirm neither one erases the other's
data.

## Deployment

The live app is hosted on **Render** as a static site
(`amitek-quotation-tool.onrender.com`), building from this repo's `main`
branch on every push. The database lives in a separate **Supabase**
project — schema and functions are defined in `supabase/schema.sql` and
applied by hand through the Supabase SQL Editor (there's no CI step that
runs migrations automatically, so a schema change needs to be applied to
the live database manually after merging).

To build locally (e.g. to sanity-check before pushing):

```bash
npm run build
npm run preview
```

---

## Using the tool

Each division (pick one from the home screen, switch any time from the top
bar) has four tabs:

- **New Quotation** — the builder. Pick Systems from the list, grouped by
  category (or add a "+ Blank row" for a one-off item, or a "+ Section
  heading" full-width label to group the rows below it into a block —
  e.g. "Hotel Block" / "Villa Block"), then:
  - **Print as** (toolbar) chooses which letterhead identity this document
    prints under — this division, or the parent company (Amitek Paint and
    Coating / APP Paints Chemicals Pvt. LTD.).
  - **Show applicator/contractor card** and **Show shipping & delivery**
    (toolbar checkboxes) add those optional cards to the document.
  - **Columns** button opens the column chooser: tick which columns show on
    *this* quotation, rename any header inline, or add a custom column (a
    free-text field per line item). This is per-quotation, not a saved
    layout — every quotation keeps its own column choices from when it was
    created.
  - Every cell is directly editable by typing in the table — or click the
    pencil icon on a row to edit all of that row's fields in a form instead.
    Duplicate, reorder (▲▼), or delete a row with the other row icons. A
    section heading row only has move/delete (no per-column fields to
    edit) and doesn't count towards the totals.
  - Discount, extra charges (transport, labour, etc. — with quick-add
    presets from Settings), and GST are all editable in the totals block.
    On a Proforma Invoice, GST is broken into CGST+SGST (client in the same
    state as the seller) or IGST (any other state), based on the **State**
    field on the client card.
  - Choose **A4 Portrait/Landscape** from the Page selector, then either
    **Print / Save PDF** (uses your browser's native print dialog — choose
    "Save as PDF" there for a small, sharp, text-searchable file) or
    **Download PDF** (generates and downloads a PDF directly, no print
    dialog, filename taken from the document's reference number).
- **History** — every saved quotation and Proforma Invoice, searchable and
  filterable (All / Quotations / Proforma Invoices), with the same Print
  and Download PDF options available from the detail view. Opening a
  **quotation** (not already a Proforma Invoice) also shows **Convert to
  Proforma Invoice** — one click creates a new, independent Proforma
  Invoice document seeded with the same client, line items and totals
  setup, with its own reference number (a separate numbering series from
  quotations) — editing either one afterwards never touches the other.
- **Manage Systems** — add, edit, or remove the reusable Systems (products)
  this division's quotations are built from, grouped by **category** (type
  a new one or pick a suggestion — it's free text, not a fixed list).
- **Settings** — no code required:
  - **Letterhead**: logo, company name, address, phone, GSTIN, website,
    email — plus a second "Alternate letterhead — parent company" section
    used when a quotation's "Print as" is set to the company identity
    instead of this division.
  - **Bank & Signatory**: bank account details, one or more named
    signatories (pick a default), and a signature/stamp image upload.
  - **Terms Templates**: save multiple reusable Terms & Conditions sets and
    pick which one a quotation uses.
  - **Tax & Charges**: default GST %, default discount, reusable
    extra-charge presets (e.g. "Transport — ₹2,000"), and the numbering
    prefixes — quotations and Proforma Invoices number separately, each
    resetting to 001 every new year.

  Settings changes only apply going forward — each quotation snapshots the
  letterhead, bank details, signatory, terms and columns it was created
  with, so editing Settings later never changes a quotation you already
  saved or sent.

---

## This repo is public — what that does and doesn't expose

GitHub Pages and Render's free static-site hosting both require the source
repo to be public, which is why this one is. The actual business data
(Systems, rates, quotation history) is **not** in the repo — it lives in
Supabase, gated by login + row-level security, so making the repo public
didn't expose it. `src/lib/constants.js` used to have the real rate card
hardcoded as first-run seed data for the old localStorage version; that's
been stripped out (it's unused now that Supabase seeds each division
empty) specifically because this repo is public.

What *is* visible to anyone who finds the repo: the app's source code, and
non-sensitive identity fields like the company's GSTIN/address (the same
ones printed on every quotation). Access to the actual app still requires
signing in — the two accounts are managed from the Supabase dashboard
(Authentication → Users), not from this repo.

Two things worth knowing if you ever want to lock this down further:
- Making the repo **private** would likely require reconnecting it to both
  Render and GitHub Pages (both needed "public" to fetch it the first
  time) — ask if you want to go down that path.
- **Supabase → Authentication → Settings → "Allow new users to sign up"**
  should stay **off**, so no one else can create their own account even if
  they find the live URL.

---

## Project structure

```
├── src/
│   ├── App.jsx                     # top-level app shell, routing between tabs, print CSS
│   ├── main.jsx                    # React entry point
│   ├── index.css                   # Tailwind import + safelist (see note in the file)
│   ├── lib/                        # no UI — pure data/logic
│   │   ├── constants.js            #   company/division info, Systems seed data
│   │   ├── settings.js             #   default letterhead/bank/terms/tax per division
│   │   ├── columns.js              #   the column model (default columns, custom columns)
│   │   ├── model.js                #   blank/reconciled quotations & line items, migration
│   │   ├── calc.js                 #   totals math (discount, extra charges, GST)
│   │   ├── storage.js              #   Supabase load/save (per-record), backup export/import
│   │   ├── supabaseClient.js       #   configured Supabase client
│   │   ├── pdf.js                  #   the Download PDF generator (html2canvas + jsPDF)
│   │   └── ids.js                  #   small id/date helpers
│   └── components/
│       ├── LoginScreen.jsx, DivisionPicker.jsx, TopNav.jsx
│       ├── QuotationBuilder.jsx, QuotationHistory.jsx
│       ├── admin/AdminPanel.jsx    #   Manage Systems tab
│       ├── settings/SettingsPanel.jsx   # Settings tab (4 sub-tabs)
│       ├── quotation/              #   everything rendered inside a quotation document:
│       │   ├── LetterheadHeader, ClientCard, LineItemsTable, ColumnChooser,
│       │   │   RowEditForm, TotalsBlock, TermsBoxes, BankDetailsBlock,
│       │   │   ShippingDeliveryBlock, SignatureBlock, SystemPicker,
│       │   │   QuotationDocument (assembles the above)
│       └── ui/atoms.jsx            #   shared small building blocks (inputs, buttons, logo)
├── supabase/
│   ├── schema.sql                  # tables, RLS policies, per-record save functions
│   └── schema.test.js              # runs schema.sql against real Postgres (PGlite)
├── index.html
└── vite.config.js
```

A separate single-file version of this same tool also runs as a Claude
artifact (no build step, no npm) — handy for quick edits from inside a
Claude conversation. If you're maintaining both, the two are independent
copies rather than a shared source; ask Claude to port a change from one to
the other when you need them to match.
