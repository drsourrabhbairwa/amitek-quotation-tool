import { uid, todayStr } from './ids';
import { defaultColumns, reconcileColumns } from './columns';
import { defaultSettings, reconcileSettings, getDefaultSignatory, getDefaultTermsTemplate } from './settings';

/* ============================================================
   DOCUMENT MODEL
   Quotations snapshot everything they need to render correctly
   forever (letterhead, bank, signatory, terms, columns) at the
   moment they're created. Editing Settings afterwards changes what
   NEW quotations start from, never quotations already saved.
   ============================================================ */

export function systemToLineItem(sys) {
  const base = {
    id: uid('li'), itemType: 'line', systemId: sys.id, name: sys.name, hsnCode: sys.hsnCode || '',
    pricingMode: sys.pricingMode, applicationArea: sys.applicationArea || '', color: '',
    customFields: {},
  };
  if (sys.pricingMode === 'material') {
    return {
      ...base,
      description: sys.description || '', process: sys.process || '',
      area: '', coveragePerKg: sys.coveragePerKg ?? '', pricePerKg: sys.defaultPricePerKg ?? '',
    };
  }
  return {
    ...base,
    scopeRows: (sys.scopeRows || []).map(r => ({ ...r, id: uid('sc') })),
    rate: sys.defaultRate ?? '', discountRate: '', area: '',
  };
}

/** A free-standing line item not tied to any saved System — for a
 * one-off item you don't want to add to the catalog. */
export function blankCustomLineItem() {
  return {
    id: uid('li'), itemType: 'line', systemId: null, name: '', hsnCode: '',
    pricingMode: 'simple', applicationArea: '', color: '',
    scopeRows: [{ id: uid('sc'), item: '', description: '', remark: '', process: '' }],
    rate: '', discountRate: '', area: '',
    customFields: {},
  };
}

/** A full-width, label-only row used to visually group the line items
 * below it into a block (e.g. "Hotel Block", "Villa Block", "Ground
 * Floor Area") — the "under tile system" style grouping a quotation
 * covering several systems/areas needs. Carries none of the pricing or
 * scope fields a real line item has; LineItemsTable renders it as one
 * spanning row, and it's excluded from totals (calc.js
 * `lineItemsSubtotal` filters out `itemType === 'section'`). */
export function blankSectionRow(label = '') {
  return { id: uid('li'), itemType: 'section', label };
}

export function blankQuotation(div, settings) {
  const s = settings || defaultSettings(div.key);
  const signatory = getDefaultSignatory(s);
  const template = getDefaultTermsTemplate(s);
  return {
    id: uid('qtn'), refNo: '', division: div.key, docType: 'quotation', date: todayStr(),
    client: { name: '', contact: '', address: '', phone: '', state: '' },
    showApplicator: false, applicator: { agency: '', contact: '', contractorName: '' },
    letterheadIdentity: 'division', // 'division' | 'company' — which identity this prints under
    showShipping: false,
    shipping: { consigneeName: '', address: '', mode: '', deliveryTimeline: '', freightTerms: '', notes: '' },
    convertedFromId: null, convertedFromRefNo: null,
    lineItems: [],
    columns: defaultColumns(div.key),
    gstPercent: s.tax.defaultGstPercent,
    discount: { ...s.tax.defaultDiscount },
    extraCharges: [],
    termsTemplateId: template.id,
    termsBoxes: (template.boxes || []).map(t => ({ ...t, id: uid('box') })),
    signatory: { ...signatory },
    letterhead: { ...s.letterhead },
    companyIdentity: { ...s.companyIdentity },
    bank: { ...s.bank },
    signatureImageDataUrl: s.signatureImageDataUrl || null,
    colorColumnEnabled: s.colorColumnEnabled,
    createdAt: Date.now(), updatedAt: Date.now(),
  };
}

/** Produces a new Proforma Invoice seeded from an already-saved
 * quotation: same client, line items, columns, and letterhead/bank/
 * terms snapshots — just a fresh id, a blank ref number (a PI gets its
 * own numbering series on save, see calc.js `nextRefNo`), and docType
 * flipped to 'proforma'. Never mutates the source quotation; the two
 * remain independently editable afterwards. */
export function convertToProformaInvoice(quotation) {
  return {
    ...quotation,
    id: uid('qtn'),
    refNo: '',
    docType: 'proforma',
    date: todayStr(),
    convertedFromId: quotation.id,
    convertedFromRefNo: quotation.refNo || null,
    lineItems: (quotation.lineItems || []).map(li => ({ ...li, id: uid('li') })),
    termsBoxes: (quotation.termsBoxes || []).map(t => ({ ...t, id: uid('box') })),
    extraCharges: (quotation.extraCharges || []).map(c => ({ ...c, id: uid('ec') })),
    createdAt: Date.now(), updatedAt: Date.now(),
  };
}

/** Brings an older saved quotation up to the current shape so every
 * screen can assume the full set of fields exists. Never touches a
 * field the quotation already has. */
export function reconcileQuotation(q, divKey, settings) {
  const s = settings || defaultSettings(divKey);
  const signatory = getDefaultSignatory(s);
  const template = getDefaultTermsTemplate(s);
  return {
    ...q,
    docType: q.docType || 'quotation',
    client: { name: '', contact: '', address: '', phone: '', state: '', ...(q.client || {}) },
    showApplicator: q.showApplicator || false,
    applicator: { agency: '', contact: '', contractorName: '', ...(q.applicator || {}) },
    letterheadIdentity: q.letterheadIdentity || 'division',
    showShipping: q.showShipping || false,
    shipping: { consigneeName: '', address: '', mode: '', deliveryTimeline: '', freightTerms: '', notes: '', ...(q.shipping || {}) },
    convertedFromId: q.convertedFromId ?? null,
    convertedFromRefNo: q.convertedFromRefNo ?? null,
    lineItems: (q.lineItems || []).map(li => ({ itemType: 'line', customFields: {}, ...li })),
    columns: reconcileColumns(q.columns, divKey),
    gstPercent: q.gstPercent ?? s.tax.defaultGstPercent,
    discount: q.discount || { type: 'percent', value: 0 },
    extraCharges: q.extraCharges || [],
    termsTemplateId: q.termsTemplateId ?? template.id,
    termsBoxes: q.termsBoxes || (template.boxes || []).map(t => ({ ...t, id: uid('box') })),
    signatory: q.signatory || { ...signatory },
    letterhead: q.letterhead || { ...s.letterhead },
    companyIdentity: q.companyIdentity || { ...s.companyIdentity },
    bank: q.bank || { ...s.bank },
    signatureImageDataUrl: q.signatureImageDataUrl ?? (s.signatureImageDataUrl || null),
    colorColumnEnabled: q.colorColumnEnabled ?? s.colorColumnEnabled,
  };
}

/** Upgrades a whole division's saved blob (systems/quotations/counter,
 * old shape or new) to the current shape. Safe to call on already-
 * current data — it's a no-op in that case. */
export function migrateDivisionData(raw, divKey) {
  const base = raw && typeof raw === 'object' ? raw : {};
  const settings = reconcileSettings(base.settings, divKey);
  const systems = Array.isArray(base.systems) ? base.systems : [];
  const quotations = Array.isArray(base.quotations) ? base.quotations.map(q => reconcileQuotation(q, divKey, settings)) : [];
  return {
    systems,
    quotations,
    counterYear: base.counterYear || new Date().getFullYear(),
    counterNext: base.counterNext || 1,
    piCounterYear: base.piCounterYear || new Date().getFullYear(),
    piCounterNext: base.piCounterNext || 1,
    settings,
  };
}
