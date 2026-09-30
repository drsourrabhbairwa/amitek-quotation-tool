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

## ⚠️ Read this first: how data is stored

This build saves everything to your **browser's local storage**
(`localStorage`) — not to a server, not to the cloud. That means:

- Your Systems and quotation history live in **one browser, on one device**.
- Opening the site in a different browser, a different computer, or in
  private/incognito mode starts you off with a **fresh copy of the seed
  data** — none of your saved quotations follow you there.
- Clearing your browser's site data / cache will **delete everything**.

**Use the ⬇ Download and ⬆ Upload buttons in the top bar regularly.** Download
exports a single JSON file with everything (both divisions' Systems and
quotation history); Upload restores from that file. Treat that file like you
would a spreadsheet backup — keep a copy somewhere safe (email it to
yourself, save it to Drive/Dropbox, etc.), especially before switching
computers or clearing browser data.

If you outgrow this later and want quotations to sync across devices or be
shared with colleagues, the fix is swapping the storage layer for a small
free-tier backend (Firebase or Supabase) instead of `localStorage` — ask
and it can be added.

## Running it locally

Requires [Node.js](https://nodejs.org) 18 or newer.

```bash
npm install
npm run dev
```

Open the URL it prints (usually `http://localhost:5173`).

## Building for deployment

```bash
npm run build
```

This produces a `dist/` folder containing plain HTML/CSS/JS — that folder is
the entire app. It can be hosted absolutely anywhere that can serve static
files: GitHub Pages, Netlify, Vercel, Cloudflare Pages, or your own server.
There is no backend/database to set up.

You can sanity-check the build locally before deploying:

```bash
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

## Important: your real pricing data lives in the source code

`src/lib/constants.js` has your actual Systems seeded in it — real system
names, HSN codes, rates, and coverage figures pulled from your existing
quotations (and the default letterhead/bank/terms text lives in
`src/lib/settings.js`). That's convenient (the tool is useful from the
moment it's deployed, nothing to re-enter), but it also means **anyone who
can read the source code can read your pricing structure** — regardless of
whether the deployed site itself is password-protected, since it's plain
JavaScript that ships to the browser either way. Note that this seed data
is only the *starting point*: once the app is running, edits made in
**Manage Systems** and **Settings** are saved to that browser's
`localStorage`, not back into the source code.

Keep this in mind when picking where the *code* lives (see below) — it's a
separate question from where the *site* is hosted.

---

## Hosting options

### Option A — GitHub Pages (free, but the repo must be public)

GitHub's free tier only serves Pages sites from **public** repositories —
private Pages needs a paid GitHub Pro or Team plan. A public repo means
anyone can read `src/lib/constants.js`, seed data included.

This repo already includes `.github/workflows/deploy-pages.yml`, which
builds and deploys automatically on every push to `main`.

1. Create a new **public** repo on GitHub and push this project to it:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/<you>/<repo>.git
   git push -u origin main
   ```
2. In the repo, go to **Settings → Pages** and set **Source** to
   **GitHub Actions**.
3. Push again (or re-run the workflow from the **Actions** tab) — your site
   will be live at `https://<you>.github.io/<repo>/`.

Only use this path if you're comfortable with the seed data (or whatever
Systems you add) being publicly visible in the repo — or if you plan to
strip the real numbers out of `SEED_SF()` / `SEED_WP()` first and re-enter
them by hand once it's live (they'd then only exist in your browser's
`localStorage`, never in the repo).

### Option B — Free *and* private: Cloudflare Pages + Cloudflare Access

This is the option that actually satisfies both "free" and "private":

1. Keep your GitHub repo **private** (private repos are free and unlimited
   on GitHub — this restriction is specific to GitHub *Pages*, not GitHub
   itself).
2. Create a free [Cloudflare](https://pages.cloudflare.com/) account, and
   connect Cloudflare Pages to that private repo. Build command:
   `npm run build`; output directory: `dist`.
3. In the Cloudflare dashboard, set up **Cloudflare Access** (part of their
   Zero Trust product, free for up to 50 users) in front of the Pages
   domain. Visitors are asked to verify their email before the site loads
   at all — so even the compiled JavaScript (and its embedded seed data)
   is never reachable without authenticating first.

### Option C — Netlify or Vercel from a private repo

Both can build and deploy directly from a **private** GitHub repo on their
free tiers (that restriction doesn't apply — only their built-in
password-protection features are now mostly paid add-ons). Practically,
that means: your source stays private, but the deployed URL itself is
reachable by anyone who has it, unless you pair it with something like
Cloudflare Access in front, or your own simple auth.

### Option D — Your own server

The most straightforward option for privacy, since there's no third-party
policy to design around — you control access entirely.

```bash
npm run build
scp -r dist/* you@yourserver:/var/www/amitek-quotation-tool/
```

Then serve it with any web server. Example Nginx site config:

```nginx
server {
    listen 80;
    server_name quotes.yourdomain.com;
    root /var/www/amitek-quotation-tool;
    index index.html;
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

For access control, use whatever you already have available: put it behind
your office VPN, restrict the server firewall to known IPs, add HTTP basic
auth in the Nginx/Apache config, or put a simple login page in front of it.

For a quick local-network test without setting up a proper web server at
all, `dist/` can even be served with a one-liner:

```bash
npx serve dist
```

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
│   │   ├── storage.js              #   localStorage load/save, backup export/import
│   │   ├── pdf.js                  #   the Download PDF generator (html2canvas + jsPDF)
│   │   └── ids.js                  #   small id/date helpers
│   └── components/
│       ├── DivisionPicker.jsx, TopNav.jsx
│       ├── QuotationBuilder.jsx, QuotationHistory.jsx
│       ├── admin/AdminPanel.jsx    #   Manage Systems tab
│       ├── settings/SettingsPanel.jsx   # Settings tab (4 sub-tabs)
│       ├── quotation/              #   everything rendered inside a quotation document:
│       │   ├── LetterheadHeader, ClientCard, LineItemsTable, ColumnChooser,
│       │   │   RowEditForm, TotalsBlock, TermsBoxes, BankDetailsBlock,
│       │   │   ShippingDeliveryBlock, SignatureBlock, SystemPicker,
│       │   │   QuotationDocument (assembles the above)
│       └── ui/atoms.jsx            #   shared small building blocks (inputs, buttons, logo)
├── index.html
├── vite.config.js
└── .github/workflows/deploy-pages.yml
```

A separate single-file version of this same tool also runs as a Claude
artifact (no build step, no npm) — handy for quick edits from inside a
Claude conversation. If you're maintaining both, the two are independent
copies rather than a shared source; ask Claude to port a change from one to
the other when you need them to match.
