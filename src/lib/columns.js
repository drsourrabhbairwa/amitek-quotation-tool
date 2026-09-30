import { uid } from './ids';

/* ============================================================
   COLUMN MODEL
   Every quotation carries its own `columns` array (a snapshot, so
   editing it never changes older saved quotations). Each column has:
     key      stable id — for standard columns this doubles as the
              "kind" of data it shows; for custom columns it's a
              generated id and `kind` is always 'custom'
     label    the header text, user-renameable
     visible  tick-box state
     locked   true = cannot be hidden (Name / Total — hiding either
              would make the table meaningless)
     showIf   structural relevance — a column only actually renders
              when BOTH visible AND relevant to the current line
              items (e.g. no point showing "Coverage" if nothing in
              the quotation is priced by material)
     custom   true for user-added blank columns
   ============================================================ */

export function defaultColumns(divKey) {
  const isSF = divKey === 'sf';
  return [
    { key: 'sno', label: 'S.No', visible: true, locked: true, showIf: 'always', kind: 'sno', level: 'index' },
    { key: 'name', label: isSF ? 'System Name w/ HSN Code' : 'System / Product w/ HSN', visible: true, locked: true, showIf: 'always', kind: 'name', level: 'lineItem' },
    { key: 'scope', label: isSF ? 'Application / Scope' : 'Description', visible: true, showIf: 'always', kind: 'scope', level: 'scope' },
    { key: 'process', label: 'Process', visible: true, showIf: 'wp-only', kind: 'process', level: 'scope' },
    { key: 'area_name', label: isSF ? 'Application Area Name' : 'Targeted Area', visible: true, showIf: 'always', kind: 'applicationArea', level: 'lineItem' },
    { key: 'remark', label: 'Remark', visible: true, showIf: 'sf-only', kind: 'remark', level: 'scope' },
    { key: 'rate', label: 'Rate (Sq.ft)', visible: true, showIf: 'rate', kind: 'rate', level: 'lineItem' },
    { key: 'color', label: 'Color / Pigment', visible: true, showIf: 'color', kind: 'color', level: 'lineItem' },
    { key: 'area', label: 'Area (Sq.Ft)', visible: true, showIf: 'always', kind: 'area', level: 'lineItem' },
    { key: 'discount_rate', label: 'Discount Rate (Sq.ft)', visible: true, showIf: 'sf-only', kind: 'discountRate', level: 'lineItem' },
    { key: 'coverage', label: 'Coverage (Sqft/Kg)', visible: true, showIf: 'material', kind: 'coverage', level: 'lineItem' },
    { key: 'consumption', label: 'Consumption (Kg)', visible: true, showIf: 'material', kind: 'consumption', level: 'lineItem' },
    { key: 'price_per_kg', label: 'Price/Kg (₹)', visible: true, showIf: 'material', kind: 'pricePerKg', level: 'lineItem' },
    { key: 'total', label: 'Total (₹)', visible: true, locked: true, showIf: 'always', kind: 'total', level: 'lineItem' },
  ];
}

export function columnApplies(col, ctx) {
  switch (col.showIf) {
    case 'sf-only': return ctx.isSF;
    case 'wp-only': return !ctx.isSF;
    case 'material': return ctx.hasMaterial;
    case 'rate': return ctx.isSF || ctx.hasSimple;
    case 'color': return ctx.isSF && ctx.colorEnabled;
    case 'always':
    default: return true;
  }
}

export function blankCustomColumn(existingCount = 0) {
  return { key: uid('col'), label: `Custom Column ${existingCount + 1}`, visible: true, showIf: 'always', kind: 'custom', level: 'lineItem', custom: true };
}

/**
 * Reconciles a quotation's saved columns with the current default set
 * for its division — used when opening older quotations that predate
 * a column, or that predate the column feature entirely. Keeps the
 * user's visibility/label choices for columns it already knows about,
 * appends any brand-new standard columns (visible by default), and
 * preserves any custom columns untouched.
 */
export function reconcileColumns(savedColumns, divKey) {
  const defaults = defaultColumns(divKey);
  if (!Array.isArray(savedColumns) || savedColumns.length === 0) return defaults;
  const byKey = new Map(savedColumns.map(c => [c.key, c]));
  const merged = defaults.map(d => {
    const existing = byKey.get(d.key);
    if (!existing) return d;
    byKey.delete(d.key);
    return { ...d, label: existing.label ?? d.label, visible: existing.visible !== false };
  });
  // whatever's left in byKey is either a custom column or an old
  // standard column no longer in defaults — keep custom ones only
  for (const leftover of byKey.values()) {
    if (leftover.custom) merged.push(leftover);
  }
  return merged;
}
