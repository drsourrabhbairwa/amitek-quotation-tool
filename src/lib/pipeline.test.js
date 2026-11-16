import { describe, it, expect } from 'vitest';
import { dashboardStats, followUpBucket, periodStart, parseDocDate, inr, inrShort } from './pipeline';

const today = new Date(2026, 10, 16); // 16 Nov 2026
const q = (id, date, rate, extra = {}) => ({
  id, date, docType: 'quotation', gstPercent: 0,
  lineItems: [{ itemType: 'line', area: 1, rate }], ...extra,
});

describe('pipeline', () => {
  it('parses dd-mm-yyyy quotation dates', () => {
    expect(parseDocDate('05-11-2026').getMonth()).toBe(10);
    expect(parseDocDate('garbage')).toBeNull();
  });

  it('financial year starts on 1 April', () => {
    expect(periodStart('fy', today)).toEqual(new Date(2026, 3, 1));
    expect(periodStart('fy', new Date(2027, 1, 10))).toEqual(new Date(2026, 3, 1));
  });

  it('buckets follow-ups only for open quotations', () => {
    expect(followUpBucket({ status: 'sent', followUpDate: '2026-11-10' }, today)).toBe('overdue');
    expect(followUpBucket({ status: 'followup', followUpDate: '2026-11-16' }, today)).toBe('today');
    expect(followUpBucket({ status: 'sent', followUpDate: '2026-11-20' }, today)).toBe('week');
    expect(followUpBucket({ status: 'won', followUpDate: '2026-11-10' }, today)).toBeNull();
    expect(followUpBucket({ followUpDate: '2026-12-30' }, today)).toBeNull();
  });

  it('computes period totals, conversion and the 6-month chart', () => {
    const all = [
      q('a', '02-11-2026', 1000, { status: 'won' }),
      q('b', '03-11-2026', 500, { status: 'lost' }),
      q('c', '04-11-2026', 300), // no status = sent
      q('d', '05-11-2026', 200, { status: 'draft' }),
      q('e', '10-09-2026', 700, { status: 'won' }),
      { ...q('pi', '06-11-2026', 1000), docType: 'proforma' },
    ];
    const m = dashboardStats(all, 'month', today);
    expect(m.quotedCount).toBe(3);
    expect(m.quotedValue).toBe(1800);
    expect(m.wonValue).toBe(1000);
    expect(m.openCount).toBe(1);
    expect(m.draftCount).toBe(1);
    expect(m.conversion).toBeCloseTo(1 / 3);
    expect(m.piCount).toBe(1);
    const nov = m.months.find(x => x.key === '2026-11');
    expect(nov).toMatchObject({ quoted: 1800, won: 1000 });
    expect(m.months.find(x => x.key === '2026-09')).toMatchObject({ quoted: 700, won: 700 });
    expect(dashboardStats(all, 'all', today).quotedCount).toBe(4);
  });

  it('formats rupees the Indian way', () => {
    expect(inr(12345678)).toBe('₹ 1,23,45,678');
    expect(inrShort(450000)).toBe('₹4.5L');
    expect(inrShort(25000000)).toBe('₹2.5Cr');
  });
});
