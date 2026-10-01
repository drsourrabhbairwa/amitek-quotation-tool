import { migrateDivisionData } from './model';
import { todayStr } from './ids';
import { supabase } from './supabaseClient';

/* ============================================================
   STORAGE
   Data lives in Supabase now — shared across every signed-in device,
   not just this browser. loadDivisionData/saveDivisionData keep the
   exact same names and shapes they had as the localStorage version,
   so nothing above this module needs to know the backend changed.
   ============================================================ */

function currentYear() {
  return new Date().getFullYear();
}

export async function loadDivisionData(divKey) {
  const { data: row, error } = await supabase
    .from('division_data')
    .select('systems, quotations, settings')
    .eq('division_key', divKey)
    .single();
  if (error || !row) {
    throw new Error(`Could not load ${divKey} data: ${error?.message || 'no row found'}`);
  }

  const { data: counterRows, error: counterErr } = await supabase
    .from('counters')
    .select('doc_type, year, next_number')
    .eq('division_key', divKey);
  if (counterErr) {
    throw new Error(`Could not load ${divKey} counters: ${counterErr.message}`);
  }

  const year = currentYear();
  const findNext = (docType) => (counterRows || []).find(c => c.doc_type === docType && c.year === year)?.next_number ?? 1;

  return migrateDivisionData({
    systems: row.systems,
    quotations: row.quotations,
    settings: row.settings,
    counterYear: year,
    counterNext: findNext('quotation'),
    piCounterYear: year,
    piCounterNext: findNext('proforma'),
  }, divKey);
}

/** @deprecated Overwrites the whole systems+quotations+settings row from
 * whatever this browser currently holds in memory — if another signed-in
 * user saved anything in between this browser's last load and this call,
 * that change is silently erased. Kept only for the explicit, user-confirmed
 * "restore from backup file" flow (App.jsx handleImportFile), which is
 * meant to replace everything. Every other save goes through one of the
 * per-record functions below instead. */
export async function saveDivisionData(divKey, data) {
  const { systems, quotations, settings } = data;
  const { error } = await supabase
    .from('division_data')
    .update({ systems, quotations, settings, updated_at: new Date().toISOString() })
    .eq('division_key', divKey);
  return !error;
}

/** Saves one quotation/proforma-invoice without touching anything else in
 * the division row — inserts it if its id is new, replaces it in place if
 * not. Computed entirely server-side (see supabase/schema.sql
 * upsert_quotation) against the row as it stands at call time, so it can
 * never clobber a quotation the other signed-in user saved moments ago. */
export async function upsertQuotation(divKey, quotation) {
  const { error } = await supabase.rpc('upsert_quotation', {
    p_division_key: divKey,
    p_quotation: quotation,
  });
  if (error) throw new Error(`Could not save: ${error.message}`);
}

/** Removes one quotation/proforma-invoice by id, leaving every other
 * quotation and the systems/settings columns untouched. */
export async function deleteQuotationRow(divKey, quotationId) {
  const { error } = await supabase.rpc('delete_quotation', {
    p_division_key: divKey,
    p_quotation_id: quotationId,
  });
  if (error) throw new Error(`Could not delete: ${error.message}`);
}

/** Replaces the Systems list for a division without touching its
 * quotations or settings columns. */
export async function replaceSystems(divKey, systems) {
  const { error } = await supabase.rpc('replace_systems', {
    p_division_key: divKey,
    p_systems: systems,
  });
  if (error) throw new Error(`Could not save Systems: ${error.message}`);
}

/** Replaces the Settings object for a division without touching its
 * quotations or systems columns. */
export async function replaceSettings(divKey, settings) {
  const { error } = await supabase.rpc('replace_settings', {
    p_division_key: divKey,
    p_settings: settings,
  });
  if (error) throw new Error(`Could not save Settings: ${error.message}`);
}

/** Atomically assigns and returns the next raw counter integer for a
 * division/docType/year — the database-side fix for two people saving
 * at nearly the same moment (see supabase/schema.sql increment_counter).
 * Throws on failure so the caller (QuotationBuilder.handleSave) can show
 * a clear "couldn't save" message instead of silently assigning nothing. */
export async function getNextCounterNumber(divKey, docType) {
  const { data, error } = await supabase.rpc('increment_counter', {
    p_division_key: divKey,
    p_doc_type: docType,
    p_year: currentYear(),
  });
  if (error) throw new Error(`Could not assign the next reference number: ${error.message}`);
  return data;
}

export function exportBackup(data) {
  const payload = { app: 'amitek-quotation-tool', version: 3, exportedAt: new Date().toISOString(), sf: data.sf, wp: data.wp };
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
