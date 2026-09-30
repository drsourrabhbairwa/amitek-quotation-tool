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
