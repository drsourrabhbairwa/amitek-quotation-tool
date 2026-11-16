/* ============================================================
   CLIENT MASTER
   Built from the quotations themselves (both divisions): every client
   ever quoted is in it automatically, with the details from their most
   recently saved quotation. No separate table to keep in sync.
   ============================================================ */
import { computeTotals } from './calc';
import { parseDocDate } from './pipeline';

export const CLIENT_FIELDS = ['name', 'contact', 'address', 'phone', 'state', 'gstin'];
export const clientKey = (name) => String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const savedTime = (q) => {
  const t = q.savedAt ? Date.parse(q.savedAt) : NaN;
  if (!isNaN(t)) return t;
  if (q.updatedAt) return Number(q.updatedAt) || 0;
  const d = parseDocDate(q.date);
  return d ? d.getTime() : 0;
};

/** quotationsByDiv: { sf: [...], wp: [...] } → clients sorted by most recent activity. */
export function buildClientDirectory(quotationsByDiv) {
  const map = new Map();
  for (const [divKey, list] of Object.entries(quotationsByDiv || {})) {
    for (const q of list || []) {
      const key = clientKey(q.client?.name);
      if (!key) continue;
      let c = map.get(key);
      if (!c) {
        c = { key, details: {}, detailsAt: -1, items: [], quotedValue: 0, wonValue: 0, lastAt: 0 };
        map.set(key, c);
      }
      const t = savedTime(q);
      // Latest non-empty value of each field wins.
      for (const f of CLIENT_FIELDS) {
        const v = (q.client?.[f] || '').trim();
        if (v && (t >= (c.fieldAt?.[f] ?? -1))) {
          c.details[f] = v;
          c.fieldAt = { ...(c.fieldAt || {}), [f]: t };
        }
      }
      const grand = computeTotals(q).grand;
      c.items.push({ divKey, q, grand, t });
      if ((q.docType || 'quotation') === 'quotation' && (q.status || 'sent') !== 'draft') c.quotedValue += grand;
      if (q.status === 'won') c.wonValue += grand;
      c.lastAt = Math.max(c.lastAt, t);
    }
  }
  return [...map.values()]
    .map(c => ({ ...c, items: c.items.sort((a, b) => b.t - a.t) }))
    .sort((a, b) => b.lastAt - a.lastAt);
}

/** Clients whose name starts with / contains the typed text (case-insensitive). */
export function suggestClients(directory, text, limit = 6) {
  const k = clientKey(text);
  if (!k) return [];
  const starts = [], contains = [];
  for (const c of directory) {
    if (c.key === k) continue; // already exactly typed
    if (c.key.startsWith(k)) starts.push(c);
    else if (c.key.includes(k)) contains.push(c);
  }
  return [...starts, ...contains].slice(0, limit);
}
