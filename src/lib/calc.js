/* ============================================================
   CALCULATION HELPERS
   ============================================================ */

import { SELLER_STATE } from './constants';

export const num = (v) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };

export function computeLineItem(item) {
  if (item.pricingMode === 'material') {
    const area = num(item.area);
    const coverage = num(item.coveragePerKg);
    const consumptionKg = coverage > 0 ? area / coverage : 0;
    const price = num(item.pricePerKg);
    return { consumptionKg, total: consumptionKg * price };
  }
  const area = num(item.area);
  const rate = item.discountRate === '' || item.discountRate === undefined || item.discountRate === null
    ? num(item.rate)
    : num(item.discountRate);
  return { consumptionKg: null, total: rate * area };
}

export function lineItemsSubtotal(lineItems) {
  return (lineItems || [])
    .filter(li => li.itemType !== 'section')
    .reduce((s, li) => s + computeLineItem(li).total, 0);
}

/**
 * Full totals for a quotation, including an overall discount (on the
 * line-items subtotal) and extra charge lines (transport, labour, etc.)
 * which are added back in before GST. Assumptions, kept deliberately
 * simple for a small business quotation tool:
 *  - discount is taken off the line-items subtotal only
 *  - extra charges are taxable (added to the base before GST) unless
 *    an individual charge has taxable:false
 *  - GST is a single overall percentage (as in the original tool)
 */
export function computeTotals(quotation) {
  const lineItems = quotation.lineItems || [];
  const gstPercent = quotation.gstPercent;
  const subtotal = lineItemsSubtotal(lineItems);

  const discount = quotation.discount || { type: 'percent', value: 0 };
  const discountAmount = discount.type === 'flat'
    ? num(discount.value)
    : subtotal * (num(discount.value) / 100);
  const clampedDiscount = Math.min(Math.max(discountAmount, 0), subtotal);

  const extraCharges = quotation.extraCharges || [];
  const extraChargesTotal = extraCharges.reduce((s, c) => s + num(c.amount), 0);
  const taxableExtras = extraCharges.reduce((s, c) => s + (c.taxable === false ? 0 : num(c.amount)), 0);
  const nonTaxableExtras = extraChargesTotal - taxableExtras;

  const taxableBase = (subtotal - clampedDiscount) + taxableExtras;
  const gst = taxableBase * (num(gstPercent) / 100);
  const grand = taxableBase + gst + nonTaxableExtras;

  // GST breakup (mainly for the Proforma Invoice, which must itemize
  // CGST+SGST vs IGST rather than a flat "GST" line): a client whose
  // state matches the seller's home state is intrastate — split the
  // rate evenly into CGST+SGST; any other state is interstate — the
  // full rate as one IGST line. An unset client state defaults to
  // intrastate, since most of this business is within Rajasthan.
  const clientState = ((quotation.client && quotation.client.state) || '').trim();
  const isInterstate = clientState.length > 0 && clientState.toLowerCase() !== SELLER_STATE.toLowerCase();
  const halfPercent = num(gstPercent) / 2;
  const gstBreakup = isInterstate
    ? { mode: 'igst', igstPercent: num(gstPercent), igst: gst, cgstPercent: 0, cgst: 0, sgstPercent: 0, sgst: 0 }
    : { mode: 'cgst_sgst', cgstPercent: halfPercent, cgst: gst / 2, sgstPercent: halfPercent, sgst: gst / 2, igstPercent: 0, igst: 0 };

  return { subtotal, discountAmount: clampedDiscount, extraChargesTotal, taxableBase, gst, grand, gstBreakup };
}

export function fmt(n) {
  const v = num(n);
  return v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/,/g, '');
}

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
