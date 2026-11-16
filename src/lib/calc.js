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

  // Advance payments already received from the client (optional; only
  // counted while the "Show advance" switch is on). Purely informational
  // — it never changes GST or the Grand Total, only how much is still due.
  const advance = quotation.advance || {};
  const advanceTotal = advance.enabled
    ? (advance.payments || []).reduce((s, p) => s + Math.max(num(p.amount), 0), 0)
    : 0;
  const balance = grand - advanceTotal;

  return { subtotal, discountAmount: clampedDiscount, extraChargesTotal, taxableBase, gst, grand, gstBreakup, advanceTotal, balance };
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

/* ---------- Amount in words (Indian numbering) ---------- */
const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
function twoDigits(n) {
  if (n < 20) return ONES[n];
  return TENS[Math.floor(n / 10)] + (n % 10 ? ' ' + ONES[n % 10] : '');
}
function threeDigits(n) {
  const h = Math.floor(n / 100), r = n % 100;
  return [h ? ONES[h] + ' Hundred' : '', r ? twoDigits(r) : ''].filter(Boolean).join(' ');
}
function intToWords(n) {
  if (n === 0) return 'Zero';
  const parts = [];
  const crore = Math.floor(n / 1e7); n %= 1e7;
  const lakh = Math.floor(n / 1e5); n %= 1e5;
  const thousand = Math.floor(n / 1e3); n %= 1e3;
  if (crore) parts.push(intToWords(crore) + ' Crore');
  if (lakh) parts.push(twoDigits(lakh) + ' Lakh');
  if (thousand) parts.push(twoDigits(thousand) + ' Thousand');
  if (n) parts.push(threeDigits(n));
  return parts.join(' ');
}
/** 526468.8 → "Rupees Five Lakh Twenty Six Thousand Four Hundred Sixty Eight and Eighty Paise Only" */
export function amountInWords(amount) {
  const v = Math.round(Math.abs(num(amount)) * 100);
  const rupees = Math.floor(v / 100), paise = v % 100;
  let s = 'Rupees ' + intToWords(rupees);
  if (paise) s += ' and ' + twoDigits(paise) + ' Paise';
  return (num(amount) < 0 ? 'Minus ' : '') + s + ' Only';
}

/* ---------- HSN/SAC-wise tax summary (for the Proforma Invoice) ---------- */
/** Splits the taxable value by HSN code. The overall discount is shared
 * across line items in proportion to their value, and taxable extra
 * charges form their own "Other charges" row, so the rows add up exactly
 * to the taxable value and GST shown in the totals. */
export function hsnSummary(quotation) {
  const t = computeTotals(quotation);
  const factor = t.subtotal > 0 ? (t.subtotal - t.discountAmount) / t.subtotal : 0;
  const rate = num(quotation.gstPercent);
  const rows = new Map();
  const add = (key, label, value) => {
    const r = rows.get(key) || { hsn: label, taxable: 0 };
    r.taxable += value;
    rows.set(key, r);
  };
  for (const li of quotation.lineItems || []) {
    if (li.itemType === 'section') continue;
    const code = String(li.hsnCode || '').replace(/^\s*HSN[:\s-]*/i, '').trim();
    add(code || '—', code || 'Not specified', computeLineItem(li).total * factor);
  }
  const taxableExtras = (quotation.extraCharges || []).reduce((s, c) => s + (c.taxable === false ? 0 : num(c.amount)), 0);
  if (taxableExtras) add('__extras', 'Other charges', taxableExtras);
  const igst = t.gstBreakup.mode === 'igst';
  const list = [...rows.values()].filter(r => Math.abs(r.taxable) > 0.004).map(r => {
    const tax = r.taxable * rate / 100;
    return igst
      ? { ...r, igst: tax, cgst: 0, sgst: 0, tax }
      : { ...r, igst: 0, cgst: tax / 2, sgst: tax / 2, tax };
  });
  const total = list.reduce((a, r) => ({ taxable: a.taxable + r.taxable, cgst: a.cgst + r.cgst, sgst: a.sgst + r.sgst, igst: a.igst + r.igst, tax: a.tax + r.tax }),
    { taxable: 0, cgst: 0, sgst: 0, igst: 0, tax: 0 });
  return { mode: t.gstBreakup.mode, rate, rows: list, total };
}
