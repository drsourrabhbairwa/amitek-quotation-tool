import { describe, it, expect } from 'vitest';
import { buildClientDirectory, suggestClients, clientKey } from './clients';

const q = (id, name, extra = {}, client = {}) => ({
  id, date: '01-11-2026', docType: 'quotation', gstPercent: 0,
  lineItems: [{ itemType: 'line', area: 1, rate: 100 }],
  client: { name, ...client }, ...extra,
});

describe('client master', () => {
  it('merges the same client across divisions and spellings, latest details win', () => {
    const dir = buildClientDirectory({
      sf: [q('a', 'Regenta Resort', { savedAt: '2026-11-01T10:00:00Z', status: 'won' }, { phone: '111', address: 'Old address' })],
      wp: [q('b', '  regenta  resort ', { savedAt: '2026-11-10T10:00:00Z' }, { phone: '222', gstin: '08ABC' })],
    });
    expect(dir).toHaveLength(1);
    const c = dir[0];
    expect(c.details.phone).toBe('222');
    expect(c.details.address).toBe('Old address'); // kept: newer quotation left it blank
    expect(c.details.gstin).toBe('08ABC');
    expect(c.items.map(i => i.divKey)).toEqual(['wp', 'sf']);
    expect(c.quotedValue).toBe(200);
    expect(c.wonValue).toBe(100);
  });

  it('ignores quotations with no client name', () => {
    expect(buildClientDirectory({ sf: [q('x', '')] })).toEqual([]);
  });

  it('suggests prefix matches first, then contains', () => {
    const dir = buildClientDirectory({ sf: [q('1', 'Hotel Regenta'), q('2', 'Regal Mall'), q('3', 'Sunrise')] });
    expect(suggestClients(dir, 'reg').map(c => c.details.name)).toEqual(['Regal Mall', 'Hotel Regenta']);
    expect(suggestClients(dir, '')).toEqual([]);
    expect(clientKey('Shree  Cement-Ltd.')).toBe('shree cement ltd');
  });
});
