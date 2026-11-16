/* ============================================================
   SALES PIPELINE — quotation status, follow-ups and dashboard numbers.
   Pure functions only (no React, no Supabase) so they are unit-tested.
   ============================================================ */
import { computeTotals } from './calc';

export const STATUSES = [
  { key: 'draft', label: 'Draft', dot: 'bg-slate-400', chip: 'bg-slate-100 text-slate-600' },
  { key: 'sent', label: 'Sent', dot: 'bg-sky-500', chip: 'bg-sky-50 text-sky-700' },
  { key: 'followup', label: 'Follow-up', dot: 'bg-amber-500', chip: 'bg-amber-50 text-amber-800' },
  { key: 'won', label: 'Won', dot: 'bg-emerald-600', chip: 'bg-emerald-50 text-emerald-700' },
  { key: 'lost', label: 'Lost', dot: 'bg-rose-500', chip: 'bg-rose-50 text-rose-700' },
];
export const statusOf = (q) => STATUSES.find(s => s.key === (q.status || 'sent')) || STATUSES[1];
export const isOpen = (q) => ['sent', 'followup'].includes(q.status || 'sent');

/** Quotation dates are stored as dd-mm-yyyy; returns a local Date or null. */
export function parseDocDate(s) {
  const m = /^(\d{1,2})-(\d{1,2})-(\d{4})$/.exec(String(s || '').trim());
  if (!m) return null;
  const d = new Date(+m[3], +m[2] - 1, +m[1]);
  return isNaN(d) ? null : d;
}
/** Follow-up dates come from <input type="date">: yyyy-mm-dd. */
export function parseIsoDay(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''));
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
}
const dayStart = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

/** Start date of a dashboard period. Indian financial year starts 1 April. */
export function periodStart(period, today = new Date()) {
  const y = today.getFullYear(), m = today.getMonth();
  if (period === 'month') return new Date(y, m, 1);
  if (period === '3months') return new Date(y, m - 2, 1);
  if (period === 'fy') return new Date(m >= 3 ? y : y - 1, 3, 1);
  return null; // all time
}

export function followUpBucket(q, today = new Date()) {
  if (!isOpen(q)) return null;
  const d = parseIsoDay(q.followUpDate);
  if (!d) return null;
  const diff = Math.round((dayStart(d) - dayStart(today)) / 86400000);
  if (diff < 0) return 'overdue';
  if (diff === 0) return 'today';
  if (diff <= 7) return 'week';
  return null;
}

/** Every number the Dashboard shows, for one division's quotations. */
export function dashboardStats(all, period, today = new Date()) {
  const from = periodStart(period, today);
  const inPeriod = (q) => { const d = parseDocDate(q.date); return !from || (d && d >= from); };
  const quotes = all.filter(q => (q.docType || 'quotation') === 'quotation' && inPeriod(q));
  const pis = all.filter(q => q.docType === 'proforma' && inPeriod(q));
  const value = (q) => computeTotals(q).grand;
  const sum = (list) => list.reduce((s, q) => s + value(q), 0);

  const live = quotes.filter(q => (q.status || 'sent') !== 'draft');
  const won = quotes.filter(q => q.status === 'won');
  const lost = quotes.filter(q => q.status === 'lost');
  const open = quotes.filter(isOpen);

  // Last 6 calendar months, quoted vs won (by quotation date), regardless of period.
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    months.push({ key: monthKey(d), label: d.toLocaleString('en-IN', { month: 'short' }), quoted: 0, won: 0 });
  }
  for (const q of all) {
    if ((q.docType || 'quotation') !== 'quotation' || (q.status || 'sent') === 'draft') continue;
    const d = parseDocDate(q.date); if (!d) continue;
    const slot = months.find(m => m.key === monthKey(d)); if (!slot) continue;
    slot.quoted += value(q);
    if (q.status === 'won') slot.won += value(q);
  }

  const followUps = { overdue: [], today: [], week: [] };
  for (const q of all) {
    const b = followUpBucket(q, today);
    if (b) followUps[b].push(q);
  }
  for (const k of Object.keys(followUps)) followUps[k].sort((a, b) => String(a.followUpDate).localeCompare(String(b.followUpDate)));
  const noFollowUp = all.filter(q => (q.docType || 'quotation') === 'quotation' && isOpen(q) && !q.followUpDate);

  const advance = all.filter(inPeriod).reduce((s, q) => s + computeTotals(q).advanceTotal, 0);

  return {
    quotedCount: live.length, quotedValue: sum(live),
    wonCount: won.length, wonValue: sum(won),
    lostCount: lost.length, lostValue: sum(lost),
    openCount: open.length, openValue: sum(open),
    draftCount: quotes.length - live.length,
    conversion: live.length ? won.length / live.length : null,
    piCount: pis.length, piValue: sum(pis),
    advance, months, followUps, noFollowUp,
  };
}

/** Indian-style rupee amount for tiles: 1,23,45,678 with no paise. */
export function inr(n) {
  return '₹ ' + Math.round(Number(n) || 0).toLocaleString('en-IN');
}
/** Short form for chart labels: 4.5L, 1.2Cr. */
export function inrShort(n) {
  const v = Number(n) || 0;
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(v >= 1e8 ? 0 : 1)}Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(v >= 1e6 ? 0 : 1)}L`;
  if (v >= 1e3) return `₹${(v / 1e3).toFixed(0)}k`;
  return `₹${Math.round(v)}`;
}
