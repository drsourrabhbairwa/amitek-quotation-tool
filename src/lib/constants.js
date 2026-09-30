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

export const SEED_SF = () => [
  {
    id: uid('sys'), division: 'sf', category: 'Nano Topping System', name: 'AMITEK Nano Topping For Walls (L)', hsnCode: '', unit: 'Sq.Ft',
    pricingMode: 'simple', applicationArea: 'Plaster Walls', defaultRate: 170,
    scopeRows: [
      mkScope('Surface Preparation', 'Mechanical grinding / cleaning of existing substrate; removal of laitance, dust and loose material.', 'Compulsory'),
      mkScope('AMITEK Primer', 'Supply & application of compatible primer over prepared substrate. Zero mm thickness.'),
      mkScope('AMITEK Wall Base / Screed with color name', 'Supply & application of Nano Topping wall decorative base layer as per approved shade and system specification. 1 mm depending upon site condition.'),
      mkScope('AMITEK Top Coat with texture finish as per client choice along with color name', 'Application of required top coat with texture finish to achieve seamless decorative appearance. 1 mm approx.'),
      mkScope('AMITEK Sealer Coat using AMITEK single Component.', 'Supply & application of protective sealer coat suitable for the selected Nano Topping Wall finish. Will use AMITEK single Component.'),
      mkScope('Edge / Detail Work', 'Corners, edges, transitions and minor detailing required for complete finish.', 'If Required'),
    ],
  },
  {
    id: uid('sys'), division: 'sf', category: 'Nano Topping System', name: 'AMITEK Nano Topping for Floors', hsnCode: '', unit: 'Sq.Ft',
    pricingMode: 'simple', applicationArea: 'Fixed Tiles, Stone Floorings', defaultRate: 290,
    scopeRows: [
      mkScope('AMITEK Nano Topping Primer', 'Water based Primer for Surface Preparation Tiles or fixed stone is mandatory before application of nano topping.', 'Compulsory'),
      mkScope('AMITEK Nano Topping Base Coat 1', 'Is a combination of 3 component polymer base lotion and polymer based powder and organic pigments'),
      mkScope('AMITEK Nano Topping Base Coat 2', 'Is a combination of 3 component polymer base lotion and polymer based powder and organic pigments'),
      mkScope('AMITEK Nano Topping Top Coat 1', 'Is a combination of 3 component polymer base lotion and polymer based powder and organic pigments'),
      mkScope('AMITEK Nano Topping Top Coat 2', 'Is a combination of 3 component polymer base lotion and polymer based powder and organic pigments'),
      mkScope('AMITEK 2 Component Sealer', 'It is a 2 Component PU based Sealer for better adhesion'),
    ],
  },
  {
    id: uid('sys'), division: 'sf', category: 'Lime System', name: 'AMITEK Modified Lime for Smooth / Textured Finish Walls', hsnCode: '', unit: 'Sq.Ft',
    pricingMode: 'simple', applicationArea: 'Plaster Walls', defaultRate: 80,
    scopeRows: [
      mkScope('Surface Preparation', 'Mechanical grinding / cleaning of existing substrate; removal of laitance, dust and loose material.', 'If Required'),
      mkScope('AMITEK Lime Primer', 'Supply & application of compatible primer over prepared substrate. Zero mm thickness.', 'If Required'),
      mkScope('AMITEK Lime Wall Base / Screed with color name', 'Supply & application of Lime wall decorative base layer as per approved shade and system specification. 1 mm to 2 mm depending upon site condition.', '-'),
      mkScope('AMITEK Lime Top Coat with texture finish as per client choice along with color name', 'Application of required top coat with texture finish to achieve seamless decorative appearance. 1 to 2 mm approx.', '-'),
      mkScope('AMITEK Sealer Coat using AMITEK single Component.', 'Supply & application of protective sealer coat suitable for the selected Lime Wall finish. Will use AMITEK single Component.', 'If Required'),
      mkScope('Edge / Detail Work', 'Corners, edges, transitions and minor detailing required for complete finish.', 'If Required'),
    ],
  },
  {
    id: uid('sys'), division: 'sf', category: 'Lime System', name: 'AMITEK Modified Lime Plaster', hsnCode: '', unit: 'Sq.Ft',
    pricingMode: 'simple', applicationArea: 'Bricks Walls', defaultRate: 190,
    scopeRows: [
      mkScope('Surface Preparation', 'Mechanical grinding / cleaning of existing substrate; removal of laitance, dust and loose material.', 'Compulsory'),
      mkScope('AMITEK Lime Primer', 'Supply & application of compatible primer over prepared substrate. Zero mm thickness.'),
      mkScope('AMITEK Lime Wall Base 1 / Screed', 'Supply & application of Lime wall strengthen base layer 1 mm to 2 mm depending upon site condition.'),
      mkScope('AMITEK Lime Wall Base 2 / Screed', 'Supply & application of Lime wall strengthen base layer 1 mm to 2 mm depending upon site condition.'),
      mkScope('AMITEK Lime Top Coat 1 with texture finish', 'Supply & application of Lime wall strengthen Top layer 1 mm to 2 mm depending upon site condition.'),
      mkScope('AMITEK Lime Top Coat 2 with texture finish', 'Supply & application of Lime wall strengthen Top layer 1 mm to 2 mm depending upon site condition.'),
      mkScope('Edge / Detail Work', 'Corners, edges, transitions and minor detailing required for complete finish.'),
    ],
  },
  {
    id: uid('sys'), division: 'sf', category: 'Lime System', name: 'AMITEK Modified Lime Floors With Sealer', hsnCode: '', unit: 'Sq.Ft',
    pricingMode: 'simple', applicationArea: 'Floor', defaultRate: 180,
    scopeRows: [
      mkScope('Surface Preparation', 'Mechanical grinding / cleaning of existing substrate; removal of laitance, dust and loose material.', 'Compulsory'),
      mkScope('AMITEK Lime Primer', 'Supply & application of compatible primer over prepared substrate. Zero mm thickness.'),
      mkScope('AMITEK Lime Floor Base / Screed with color name', 'Supply & application of Lime Floor decorative base layer as per approved shade and system specification. 1 mm to 2 mm depending upon site condition.'),
      mkScope('AMITEK Lime Top Coat with texture finish as per client choice along with color name', 'Application of required top coat with texture finish to achieve seamless decorative appearance. 2 to 3 mm approx.'),
      mkScope('AMITEK Sealer Coat using PU matt 2 Component', 'Supply & application of protective sealer coat suitable for the selected Lime Floor finish. Will use PU mat 2 Component.'),
      mkScope('Edge / Detail Work', 'Corners, edges, transitions and minor detailing required for complete finish.'),
    ],
  },
  {
    id: uid('sys'), division: 'sf', category: 'Lime System', name: 'AMITEK Modified Lime Walls With Sealer', hsnCode: '', unit: 'Sq.Ft',
    pricingMode: 'simple', applicationArea: 'Walls', defaultRate: 100,
    scopeRows: [
      mkScope('Surface Preparation', 'Mechanical grinding / cleaning of existing substrate; removal of laitance, dust and loose material.', 'Compulsory'),
      mkScope('AMITEK Lime Primer', 'Supply & application of compatible primer over prepared substrate. Zero mm thickness.'),
      mkScope('AMITEK Lime Wall Base / Screed with color name', 'Supply & application of Lime Floor decorative base layer as per approved shade and system specification. 1 mm to 2 mm depending upon site condition.'),
      mkScope('AMITEK Lime Top Coat with texture finish as per client choice along with color name', 'Application of required top coat with texture finish to achieve seamless decorative appearance. 2 to 3 mm approx.'),
      mkScope('AMITEK Sealer Coat using PU matt 2 Component', 'Supply & application of protective sealer coat suitable for the selected Lime Walls finish. Will use PU mat 2 Component.'),
      mkScope('Edge / Detail Work', 'Corners, edges, transitions and minor detailing required for complete finish.'),
    ],
  },
  {
    id: uid('sys'), division: 'sf', category: 'Araish Finish System', name: 'AMITEK Modified Lime Walls Araish Finish', hsnCode: '', unit: 'Sq.Ft',
    pricingMode: 'simple', applicationArea: 'Walls', defaultRate: 100,
    scopeRows: [
      mkScope('Surface Preparation', 'Mechanical grinding / cleaning of existing substrate; removal of laitance, dust and loose material.', 'Compulsory'),
      mkScope('AMITEK Lime Primer', 'Supply & application of compatible primer over prepared substrate. Zero mm thickness.'),
      mkScope('AMITEK Lime Wall Base / Screed with color name', 'Supply & application of Lime Wall decorative base layer as per approved shade and system specification. 1 mm to 2 mm depending upon site condition.'),
      mkScope('AMITEK Lime Top Coat with smooth finish as per client choice along with color name', 'Application of required top coat with smooth finish to achieve seamless decorative appearance. 1 to 2 mm approx.'),
      mkScope('AMITEK Polishing with Buffing', 'Protective Preparation with machinery or stone'),
      mkScope('Edge / Detail Work', 'Corners, edges, transitions and minor detailing required for complete finish.'),
    ],
  },
];

export const SEED_WP = () => [
  {
    id: uid('sys'), division: 'wp', category: 'Nano Pore System (Exposed / System-1)', name: 'AMITEK Waterproofing System-1 (Sun-Exposed, No Tile)', hsnCode: '', unit: 'Sq.Ft',
    pricingMode: 'simple', applicationArea: 'Terrace, Sun-exposed slabs / Slope Chajja', defaultRate: 55,
    scopeRows: [
      mkScope('AMITEK HWR 22 Combined with AMITEK CMP 78', 'Organosilane-based waterproofing agent that seals surface nanopores and fine cracks, penetrating up to 4mm deep for a hydrophobic barrier. Applied over CMP 78 bonding primer.', 'Compulsory', 'Mix 1 part HWR 22, 2 parts CMP 78, and 20 parts water until fully blended, then apply directly to the prepared surface.'),
      mkScope('AMITEK Crack Filler', 'Specialized material for sealing joints and filling V-shaped cut cracks before applying protective damp-proofing coatings.', '', 'Remove dust/oil/grease, cut cracks into a V-shape, pack filler firmly, allow to dry fully before priming/topcoats.'),
      mkScope('AMITEK Smart Duo Shield Dampproof Elastomeric Film Forming System', 'Acrylic-binder, polyester-fibre reinforced single-component system forming a seamless waterproofing barrier; also works as a roof cooling system, lowering surface temperature by 10-12°C.', '', 'Apply one primer coat, then 3 coats embedding 60 GSM reinforcing fabric, alternating horizontal/vertical passes.'),
    ],
  },
  {
    id: uid('sys'), division: 'wp', category: 'Under-Tile System (System-2)', name: 'AMITEK Waterproofing System-2 (Under-Tile / OHT)', hsnCode: '', unit: 'Sq.Ft',
    pricingMode: 'simple', applicationArea: 'Bathrooms, Balconies, Passages, OHT, Utility areas', defaultRate: 57.5,
    scopeRows: [
      mkScope('AMITEK HWR 22 Combined with AMITEK CMP 78', 'Organosilane-based waterproofing agent that seals surface nanopores and fine cracks, penetrating up to 4mm deep. Applied over CMP 78 bonding primer.', 'Compulsory', 'Mix 1 part HWR 22, 2 parts CMP 78, and 20 parts water until fully blended, then apply to the prepared surface.'),
      mkScope('AMITEK Crack Filler', 'Specialized material for sealing joints and filling V-shaped cut cracks before applying protective coatings.', '', 'Remove dust/oil/grease, cut cracks into a V-shape, pack filler firmly, allow to dry fully.'),
      mkScope('HMC 501 Film Forming Cementitious Water Proofing', 'Acrylic-based emulsion mixed with cement forming a cross-linked elastomeric membrane, elongation capacity up to 250%.', '', 'Apply Primer CMP 78, mix 1L HMC 501 with 750g cement + up to 200ml water, apply first coat + fabric, dry 6 hrs, apply 2nd coat perpendicular. Cure 2-3 days.'),
    ],
  },
  {
    id: uid('sys'), division: 'wp', category: 'Swimming Pool / PU System (System-3)', name: 'AMITEK Waterproofing System-3 (Swimming Pool / PU)', hsnCode: '', unit: 'Sq.Ft',
    pricingMode: 'simple', applicationArea: 'Swimming Pool floor and wall', defaultRate: 195,
    scopeRows: [
      mkScope('AMITEK PU 270 / 275 (720) (I)', 'Solvent-based, one-component polyurethane membrane with built-in root resistance, forming a highly permanent elastic waterproof barrier.', 'Compulsory', 'Liquid-applied, cold-curing membrane that cures via reaction with ambient moisture.'),
      mkScope('Amitek Cipoxy Primer', 'Two-component, epoxy resin based primer suitable for damp concrete, excellent primer for PU/Polyurea/Hybrid Polyurea systems.', '', 'Mix resin and hardener per spec, apply directly to damp concrete before PU/Polyurea topcoats.'),
      mkScope('AMITEK Fabric and Geo Textile 60 GSM', 'Lightweight reinforcing fabric for liquid-applied membranes, boosting tensile strength, tear resistance and crack-bridging.', 'If Required', ''),
    ],
  },
  {
    id: uid('sys'), division: 'wp', category: 'Material / Per-Kg Products', name: 'AMITEK HWR-22', hsnCode: '29319090', unit: 'Kg',
    pricingMode: 'material', coveragePerKg: 385.96, defaultPricePerKg: 1575.89,
    description: 'Professional-grade organosilane-based waterproofing agent that seals surface nanopores and fine cracks. Penetrates up to 4mm deep, creating a long-lasting hydrophobic, water-repellent barrier. Applied over CMP 78 bonding primer.',
    process: 'Mix 1 part HWR 22, 2 parts CMP 78, and 20 parts water until fully blended, then apply to the prepared surface.',
  },
  {
    id: uid('sys'), division: 'wp', category: 'Material / Per-Kg Products', name: 'AMITEK CMP-78', hsnCode: '38244010', unit: 'Kg',
    pricingMode: 'material', coveragePerKg: 215.69, defaultPricePerKg: 290.77,
    description: 'Bonding primer and porosity filler used with HWR 22.',
    process: 'Used as the primer coat prior to HWR 22 application.',
  },
  {
    id: uid('sys'), division: 'wp', category: 'Material / Per-Kg Products', name: 'AMITEK HMC-501', hsnCode: '38244010', unit: 'Kg',
    pricingMode: 'material', coveragePerKg: 14.09, defaultPricePerKg: 257.35,
    description: 'Film-forming cementitious waterproofing: an acrylic-based emulsion mixed with cement to create a cross-linked elastomeric membrane offering high stretchability up to 250%.',
    process: 'Apply Primer CMP 78, mix 1L HMC 501 with 750g cement + up to 200ml water, apply first coat + fabric, dry 6 hrs, apply 2nd coat perpendicular. Cure 2-3 days.',
  },
  {
    id: uid('sys'), division: 'wp', category: 'Material / Per-Kg Products', name: 'AMITEK Smart Duo Shield Dampproof', hsnCode: '32141000', unit: 'Kg',
    pricingMode: 'material', coveragePerKg: 8, defaultPricePerKg: 186.85,
    description: 'Single-component acrylic binder / polyester fibre reinforced elastomeric film-forming waterproofing barrier; also functions as a roof-cooling system, lowering surface temperature 10-12°C.',
    process: 'One primer coat, then 3 coats embedding 60 GSM reinforcing fabric, alternating horizontal/vertical passes.',
  },
];
