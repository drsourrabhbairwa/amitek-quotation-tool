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
