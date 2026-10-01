import { Droplets, Layers3 } from 'lucide-react';
import { uid } from './ids';

/* ============================================================
   CONSTANTS & SEED DATA
   Division styling/keys below (Icon, colors, key, short) are fixed
   in code. Everything a user can actually customize — letterhead
   text, bank details, signatories, terms, tax defaults — lives in
   each division's editable `settings` object (see lib/model.js) and
   is only *seeded* from the values below the first time a division
   is used.
   ============================================================ */

export const COMPANY_COMMON = {
  legalName: 'APP Paints Chemicals Pvt. LTD.',
  gstin: '08AAUCA9834F1Z4',
  address: 'AMITEK TOWER, 14 / 120, Main 100 feet Shipra Path Road, Mansarover, Jaipur, Rajasthan, India - 302020',
};

// Seller's home state, for GST place-of-supply on a Proforma Invoice: a
// client in this state is billed CGST+SGST (split evenly), a client in
// any other state is billed IGST (the full rate as one line). See
// calc.js `computeTotals` / `gstBreakup`.
export const SELLER_STATE = 'Rajasthan';

export const DIVISIONS = {
  sf: {
    key: 'sf',
    label: 'Amitek Seamless Floorings',
    short: 'SF',
    Icon: Layers3,
    ring: 'ring-amber-800',
    bg: 'bg-amber-800',
    bgHover: 'hover:bg-amber-900',
    text: 'text-amber-800',
    border: 'border-amber-800',
    lightBg: 'bg-amber-50',
    accent: 'amber',
    website: 'www.amitekseamlessfloorings.com | www.amitekinfra.com',
    contact: '+91 93528 50707, +91 88540 66666, +91 92515 54682',
    defaultSignatory: { name: 'Shriya Bhargava', role: 'Business Head' },
    hasColorColumn: true,
    defaultTerms: [
      {
        id: 'dt1', title: 'Important Application Guidelines & Scope',
        content: "Application Protocol: Please ensure strict adherence to the application instructions, including the specific 'Dos and Don'ts,' outlined in the official product catalogs and technical brochures.\n\nScope Exclusions: Unless explicitly detailed in this quotation, the current scope does not cover major civil repairs, foundational waterproofing or moisture treatments, skirting, movement-joint treatments, or substrate corrections. These services will be evaluated and billed additionally if required."
      },
      {
        id: 'dt2', title: 'Commercial Terms & Conditions',
        content: "Pricing & Site Variations: All quoted rates are currently indicative. Final pricing will be confirmed following a comprehensive site inspection, factoring in the final area measurement, selected system thickness, shade, and existing substrate condition.\n\nQuantity Adjustments: This quotation is based on the initially stated quantities. Any variations in the actual project area may impact the final unit economics.\n\nTaxes: GST and any other applicable taxes are calculated separately based on the finalized rates.\n\nSite Prerequisites: To ensure smooth execution, the client is responsible for providing essential site utilities (electricity and water), secure material storage, clear site access, and a safe working environment.\n\nAdditional Work: Any requirements or tasks requested that fall outside the outlined scope of work will be documented and quoted separately."
      },
      {
        id: 'dt3', title: 'Financial & Logistical Arrangements',
        content: "Standard Payment Schedule:\n60% Advance payment upon project confirmation and mobilization.\n30% Progress payment during the execution phase.\n10% Final payment upon successful project completion (or as mutually agreed prior to commencement).\n\nOutstation Projects: For project sites located outside of Jaipur, the client will be responsible for providing or reimbursing the execution team's travel, accommodation (boarding and lodging), and daily meal expenses.\nTransportation Goods charges are Extra."
      },
      {
        id: 'dt4', title: 'Bank Details',
        content: "BANK: UNION BANK | A/C HOLDER: APP PAINTS CHEMICALS PRIVATE LIMITED\nA/C No: 510605010060598 | IFSC: UBIN0551066\nBranch: SSI Finance, Jaipur | Type: Current Account"
      },
    ],
  },
  wp: {
    key: 'wp',
    label: 'Amitek Waterproofing Solutions',
    short: 'WP',
    Icon: Droplets,
    ring: 'ring-teal-700',
    bg: 'bg-teal-700',
    bgHover: 'hover:bg-teal-800',
    text: 'text-teal-700',
    border: 'border-teal-700',
    lightBg: 'bg-teal-50',
    accent: 'teal',
    website: 'www.amitekseamlessfloorings.com | www.amitekinfra.com',
    contact: '+91 9352850707, +91 7977167892, 9251554682',
    defaultSignatory: { name: 'Sourabh Bairwa', role: 'Senior Waterproofing Consultant' },
    hasColorColumn: false,
    defaultTerms: [
      {
        id: 'dt1', title: 'Terms & Conditions',
        content: "1. Ensure proper surface cleaning before the application of any waterproofing system.\n2. Clean the surface with a wire brush or scraper to remove hidden dirt and loose particles.\n3. Water prices are Not included Here.\n4. Terms: Material payment in advance.\n5. Labour running bills will be raised every 7th day and must be cleared within the next 7 days.\n6. Final quotation may change after site inspection and depending on the condition of the civil work done.\n7. Taxes extra @ 18%.\n8. We offer a 5 to 10 years warranty on our work, but it depends on the quality of the solution the client has opted for. Clause needs discussion.\n9. We will need two separate Purchase Orders: one for material supply and another for labour application.\n10. Delivery and site handover: Prompt"
      },
      {
        id: 'dt2', title: 'Bank Details',
        content: "BANK: UNION BANK | A/C HOLDER: APP PAINTS CHEMICALS PRIVATE LIMITED\nA/C No: 510605010060598 | IFSC: UBIN0551066\nBranch: SSI Finance, Jaipur | Type: Current Account"
      },
    ],
  },
};

export const STORAGE_KEYS = { sf: 'amitek-sf-data-v2', wp: 'amitek-wp-data-v2' };
// Bumped to v2 because this build adds settings/columns to the saved
// shape. lib/model.js's migrate() transparently upgrades any v1 data
// found under the old key, so nobody loses existing work.
export const LEGACY_STORAGE_KEYS = { sf: 'amitek-sf-data-v1', wp: 'amitek-wp-data-v1' };

// Starting set of System categories per division, used to group the
// Manage Systems list and offered as suggestions when adding/editing a
// System. Not a closed list — Admin Panel lets a category be typed
// freehand, so anything entered there simply becomes a new group.
export const CATEGORIES = {
  sf: ['Nano Topping System', 'Lime System', 'Araish Finish System'],
  wp: ['Nano Pore System (Exposed / System-1)', 'Under-Tile System (System-2)', 'Swimming Pool / PU System (System-3)', 'Material / Per-Kg Products'],
};

export const mkScope = (item, description, remark = '', process = '') => ({ id: uid('sc'), item, description, remark, process });

// Real system names/rates/HSN codes used to be hardcoded here as the
// first-run seed for a fresh browser's localStorage. Since the move to
// Supabase (each division's row in `division_data` is seeded empty by
// supabase/schema.sql instead — see src/lib/storage.js), nothing in the
// app imports these two functions any more: Systems now come entirely
// from the database, managed from the Manage Systems tab. Left as
// no-op stubs (rather than deleted outright) only so a stray import
// doesn't crash; the real rate card used to live here in plain text in
// this now-public repo, which is why it was stripped out rather than
// just left in place as unused.
export const SEED_SF = () => [];

export const SEED_WP = () => [];
