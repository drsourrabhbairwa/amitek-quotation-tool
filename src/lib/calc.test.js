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

import { computeTotals } from './calc';

describe('advance payments', () => {
  const base = {
    gstPercent: 18,
    lineItems: [{ itemType: 'line', area: 100, rate: 100 }], // subtotal 10000, grand 11800
  };

  it('ignores advance while the switch is off', () => {
    const t = computeTotals({ ...base, advance: { enabled: false, payments: [{ amount: 5000 }] } });
    expect(t.advanceTotal).toBe(0);
    expect(t.balance).toBeCloseTo(11800);
  });

  it('sums every payment and subtracts from the grand total when on, without touching GST', () => {
    const t = computeTotals({ ...base, advance: { enabled: true, payments: [{ amount: '5000' }, { amount: 1800 }, { amount: '' }] } });
    expect(t.advanceTotal).toBe(6800);
    expect(t.grand).toBeCloseTo(11800);
    expect(t.gst).toBeCloseTo(1800);
    expect(t.balance).toBeCloseTo(5000);
  });

  it('treats old quotations with no advance field as zero', () => {
    expect(computeTotals(base).advanceTotal).toBe(0);
  });
});

import { amountInWords, hsnSummary } from './calc';

describe('amountInWords', () => {
  it('uses lakh/crore and paise', () => {
    expect(amountInWords(526468.8)).toBe('Rupees Five Lakh Twenty Six Thousand Four Hundred Sixty Eight and Eighty Paise Only');
    expect(amountInWords(12500000)).toBe('Rupees One Crore Twenty Five Lakh Only');
    expect(amountInWords(0)).toBe('Rupees Zero Only');
    expect(amountInWords(1001)).toBe('Rupees One Thousand One Only');
    expect(amountInWords(110)).toBe('Rupees One Hundred Ten Only');
  });
});

describe('hsnSummary', () => {
  const base = {
    gstPercent: 18, client: { state: 'Rajasthan' },
    discount: { type: 'flat', value: 1000 },
    lineItems: [
      { itemType: 'line', hsnCode: 'HSN 3208', area: 100, rate: 60 },  // 6000
      { itemType: 'line', hsnCode: '3208', area: 10, rate: 100 },      // 1000 (same code)
      { itemType: 'line', hsnCode: '', area: 30, rate: 100 },          // 3000
      { itemType: 'section', label: 'x' },
    ],
    extraCharges: [{ amount: 500, taxable: true }, { amount: 999, taxable: false }],
  };
  it('groups by HSN, shares the discount, adds taxable charges, and matches the totals', () => {
    const s = hsnSummary(base);
    expect(s.mode).toBe('cgst_sgst');
    expect(s.rows.map(r => r.hsn)).toEqual(['3208', 'Not specified', 'Other charges']);
    expect(s.rows[0].taxable).toBeCloseTo(7000 * 0.9);
    expect(s.total.taxable).toBeCloseTo(9000 + 500);
    expect(s.total.tax).toBeCloseTo(9500 * 0.18);
    expect(s.total.cgst).toBeCloseTo(s.total.sgst);
  });
  it('uses IGST for an out-of-state client', () => {
    const s = hsnSummary({ ...base, client: { state: 'Gujarat' } });
    expect(s.mode).toBe('igst');
    expect(s.total.cgst).toBe(0);
    expect(s.total.igst).toBeCloseTo(9500 * 0.18);
  });
});
