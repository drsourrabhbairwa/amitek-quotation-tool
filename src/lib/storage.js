import { STORAGE_KEYS, LEGACY_STORAGE_KEYS, SEED_SF, SEED_WP } from './constants';
import { migrateDivisionData } from './model';
import { defaultSettings } from './settings';
import { todayStr } from './ids';

/* ============================================================
   STORAGE
   This build targets a normal browser, so it uses localStorage rather
   than Claude's artifact-only window.storage API. That means the data
   lives in THIS browser on THIS device only — it will not follow you
   to another computer or sync between colleagues. Use the Backup /
   Restore buttons in the top bar regularly, especially before clearing
   browser data or switching machines.
   ============================================================ */

export const LS_AVAILABLE = (() => {
  try {
    const t = '__amitek_probe__';
    window.localStorage.setItem(t, '1');
    window.localStorage.removeItem(t);
    return true;
  } catch (e) { return false; }
})();

export async function loadDivisionData(divKey) {
  if (LS_AVAILABLE) {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEYS[divKey]);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.systems)) return migrateDivisionData(parsed, divKey);
      }
      // nothing at the current-version key — check for pre-Settings data
      // saved under the old key and upgrade it in place rather than
      // silently reseeding over someone's real Systems/quotations.
      const legacyRaw = window.localStorage.getItem(LEGACY_STORAGE_KEYS[divKey]);
      if (legacyRaw) {
        const parsedLegacy = JSON.parse(legacyRaw);
        if (parsedLegacy && Array.isArray(parsedLegacy.systems)) {
          const migrated = migrateDivisionData(parsedLegacy, divKey);
          try { window.localStorage.setItem(STORAGE_KEYS[divKey], JSON.stringify(migrated)); } catch (e) { /* storage full/disabled */ }
          return migrated;
        }
      }
    } catch (e) { /* corrupted value, fall through to seed */ }
  }
  const seeded = {
    systems: divKey === 'sf' ? SEED_SF() : SEED_WP(),
    quotations: [],
    counterYear: new Date().getFullYear(),
    counterNext: 1,
    piCounterYear: new Date().getFullYear(),
    piCounterNext: 1,
    settings: defaultSettings(divKey),
  };
  if (LS_AVAILABLE) {
    try { window.localStorage.setItem(STORAGE_KEYS[divKey], JSON.stringify(seeded)); } catch (e) { /* storage full/disabled */ }
  }
  return seeded;
}

export async function saveDivisionData(divKey, data) {
  if (!LS_AVAILABLE) return false;
  try { window.localStorage.setItem(STORAGE_KEYS[divKey], JSON.stringify(data)); return true; }
  catch (e) { return false; }
}

export function exportBackup(data) {
  const payload = { app: 'amitek-quotation-tool', version: 2, exportedAt: new Date().toISOString(), sf: data.sf, wp: data.wp };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `amitek-quotation-backup-${todayStr()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function importBackupFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        if (!parsed || (!parsed.sf && !parsed.wp)) throw new Error('Not a recognized backup file');
        if (parsed.sf) parsed.sf = migrateDivisionData(parsed.sf, 'sf');
        if (parsed.wp) parsed.wp = migrateDivisionData(parsed.wp, 'wp');
        resolve(parsed);
      } catch (err) { reject(err); }
    };
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsText(file);
  });
}
