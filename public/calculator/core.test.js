import { describe, it, expect } from 'vitest';
import './core.js';
const C = globalThis.AmkCalc;

describe('waterproofing calculator maths', () => {
  const cfg = C.mergeConfig(null);

  it('area from sizes: roof + parapet, bathroom floor + walls, tank box, wall', () => {
    expect(C.areaFrom('terrace', { mode: 'size', l: 30, b: 20, h: 1 })).toBe(600 + 100);
    expect(C.areaFrom('bathroom', { mode: 'size', l: 8, b: 5 })).toBe(40 + 26 * 1.5);
    expect(C.areaFrom('box', { mode: 'size', l: 10, b: 8, h: 5 })).toBe(80 + 180);
    expect(C.areaFrom('wall', { mode: 'size', l: 40, h: 10 })).toBe(400);
    expect(C.areaFrom('wall', { sqft: '350' })).toBe(350);
  });

  it('estimate uses the project rate range and rounds up to ₹500', () => {
    const e = C.estimate(cfg, 'terrace', 'repair', 1000);
    expect(e.min).toBe(70000);
    expect(e.max).toBe(95000);
    const f = C.estimate(cfg, 'exterior', 'fresh', 1001);
    expect(f.max % 500).toBe(0);
    expect(f.max).toBeGreaterThanOrEqual(1001 * 40);
  });

  it('small jobs are lifted to the minimum job charge', () => {
    const e = C.estimate(cfg, 'exterior', 'fresh', 100);
    expect(e.min).toBe(15000);
    expect(e.max).toBe(15000);
    expect(e.minCharged).toBe(true);
  });

  it('admin overrides merge by surface key; hidden surfaces drop out; extra surfaces append', () => {
    const m = C.mergeConfig({ minJobCharge: 0, surfaces: [
      { key: 'terrace', rates: { repair: [80, 100] } },
      { key: 'pool', hidden: true },
      { key: 'balcony', label: 'Balcony', rates: { fresh: [50, 60], repair: [60, 80] }, steps: [], problems: [] },
    ] });
    expect(C.estimate(m, 'terrace', 'repair', 100).max).toBe(10000);
    expect(C.estimate(m, 'terrace', 'fresh', 100).max).toBe(7500); // untouched default
    expect(m.surfaces.some(s => s.key === 'pool')).toBe(false);
    expect(m.surfaces.at(-1).key).toBe('balcony');
  });

  it('formats rupees the Indian way', () => {
    expect(C.inr(1234567)).toBe('₹12,34,567');
  });
});
