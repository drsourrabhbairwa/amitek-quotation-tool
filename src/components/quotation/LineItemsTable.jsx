import React from 'react';
import { Trash2, Pencil, Copy, ArrowUp, ArrowDown } from 'lucide-react';
import { EF } from '../ui/atoms';
import { computeLineItem, fmt } from '../../lib/calc';
import { columnApplies } from '../../lib/columns';

const th = "border border-slate-300 bg-slate-100 px-2 py-1.5 text-[11px] font-semibold text-slate-600 text-left align-bottom";
const td = "border border-slate-300 px-2 py-1.5 text-[11.5px] text-slate-700 align-top";

const WIDTH_BY_KIND = {
  sno: 34, name: 180, scope: 190, process: 170, applicationArea: 130, remark: 90,
  rate: 60, color: 80, area: 60, discountRate: 70, coverage: 70,
  consumption: 80, pricePerKg: 70, total: 80, custom: 120,
};
const colWidth = (col) => ({ minWidth: WIDTH_BY_KIND[col.kind] || 90 });
const ACTIONS_WEIGHT = 40;

/** Proportional widths (as %) for a <colgroup>. On screen the table
 * lays itself out naturally (table-layout: auto, so this is inert) —
 * but print forces table-layout: fixed to guarantee the table fits a
 * portrait A4 page without clipping columns, and these percentages
 * are what keep a fixed-layout print from squeezing every column to
 * the same width regardless of how much text it actually holds. */
function ColGroup({ columns, editable }) {
  const weights = columns.map(c => WIDTH_BY_KIND[c.kind] || 90);
  const total = weights.reduce((a, b) => a + b, 0) + (editable ? ACTIONS_WEIGHT : 0);
  return (
    <colgroup>
      {columns.map((c, i) => <col key={c.key} style={{ width: `${(weights[i] / total) * 100}%` }} />)}
      {editable && <col style={{ width: `${(ACTIONS_WEIGHT / total) * 100}%` }} />}
    </colgroup>
  );
}

function RowActions({ onEdit, onDuplicate, onMoveUp, onMoveDown, onRemove, canMoveUp, canMoveDown }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <button onClick={onEdit} title="Edit this row in a form" className="text-slate-400 hover:text-slate-800"><Pencil size={14} /></button>
      <div className="flex gap-1">
        <button onClick={onMoveUp} disabled={!canMoveUp} title="Move up" className="text-slate-300 hover:text-slate-700 disabled:opacity-20 disabled:hover:text-slate-300"><ArrowUp size={13} /></button>
        <button onClick={onMoveDown} disabled={!canMoveDown} title="Move down" className="text-slate-300 hover:text-slate-700 disabled:opacity-20 disabled:hover:text-slate-300"><ArrowDown size={13} /></button>
      </div>
      <div className="flex gap-1">
        <button onClick={onDuplicate} title="Duplicate this row" className="text-slate-300 hover:text-slate-700"><Copy size={13} /></button>
        <button onClick={onRemove} title="Delete this row" className="text-slate-300 hover:text-red-600"><Trash2 size={13} /></button>
      </div>
    </div>
  );
}

/**
 * Renders the quotation's line items as a table driven entirely by
 * `columns` (see lib/columns.js): each System still expands into one
 * row per scope/step, with its System-level fields (name, rate, area,
 * total, custom fields…) vertically merged via rowSpan — but WHICH
 * columns appear, in what order and under what heading, is decided
 * by the column list rather than hardcoded here. Every cell stays
 * directly editable in-place; the pencil icon opens the same data in
 * RowEditForm as an alternative, form-based way to edit the row.
 */
export function LineItemsTable({ division, columns, lineItems, editable, onUpdate, onRemove, onDuplicate, onMove, onEditRow, colorEnabled }) {
  const isSF = division === 'sf';
  const hasSimple = lineItems.some(li => li.pricingMode !== 'material');
  const hasMaterial = lineItems.some(li => li.pricingMode === 'material');
  const ctx = { isSF, hasMaterial, hasSimple, colorEnabled };

  const effCols = (columns || []).filter(c => c.visible !== false && columnApplies(c, ctx));

  const patchItem = (id, patch) => onUpdate(lineItems.map(li => li.id === id ? { ...li, ...patch } : li));
  const patchScope = (liId, scopeId, patch) => onUpdate(lineItems.map(li => li.id === liId ? { ...li, scopeRows: (li.scopeRows || []).map(r => r.id === scopeId ? { ...r, ...patch } : r) } : li));
  const patchCustom = (id, colKey, value) => onUpdate(lineItems.map(li => li.id === id ? { ...li, customFields: { ...li.customFields, [colKey]: value } } : li));

  function lineItemCell(col, li, calc, accent) {
    const isMat = li.pricingMode === 'material';
    switch (col.kind) {
      case 'name':
        return (
          <>
            <EF editable={editable} value={li.name} onChange={v => patchItem(li.id, { name: v })} multiline rows={3} accent={accent} placeholder="System / product name" />
            <EF editable={editable} value={li.hsnCode} onChange={v => patchItem(li.id, { hsnCode: v })} placeholder="HSN code" accent={accent} className="text-slate-400 font-normal block mt-0.5" />
          </>
        );
      case 'applicationArea':
        return <EF editable={editable} value={li.applicationArea} onChange={v => patchItem(li.id, { applicationArea: v })} multiline accent={accent} />;
      case 'rate':
        return isMat ? '—' : <EF editable={editable} value={li.rate} onChange={v => patchItem(li.id, { rate: v })} accent={accent} />;
      case 'color':
        return <EF editable={editable} value={li.color} onChange={v => patchItem(li.id, { color: v })} accent={accent} />;
      case 'area':
        return <EF editable={editable} value={li.area} onChange={v => patchItem(li.id, { area: v })} accent={accent} />;
      case 'discountRate':
        return isMat ? '—' : <EF editable={editable} value={li.discountRate} onChange={v => patchItem(li.id, { discountRate: v })} placeholder={String(li.rate ?? '')} accent={accent} />;
      case 'coverage':
        return isMat ? <EF editable={editable} value={li.coveragePerKg} onChange={v => patchItem(li.id, { coveragePerKg: v })} accent={accent} /> : '—';
      case 'consumption':
        return isMat ? (calc.consumptionKg ? calc.consumptionKg.toFixed(2) : '0.00') : '—';
      case 'pricePerKg':
        return isMat ? <EF editable={editable} value={li.pricePerKg} onChange={v => patchItem(li.id, { pricePerKg: v })} accent={accent} /> : '—';
      case 'total':
        return fmt(calc.total);
      case 'custom':
        return <EF editable={editable} value={li.customFields?.[col.key]} onChange={v => patchCustom(li.id, col.key, v)} accent={accent} />;
      default:
        return null;
    }
  }

  function scopeCell(col, li, sr, accent) {
    switch (col.kind) {
      case 'scope':
        return (
          <>
            <EF editable={editable} value={sr.item} onChange={v => patchScope(li.id, sr.id, { item: v })} accent={accent} className="font-medium block" placeholder="Step title" />
            <EF editable={editable} value={sr.description} onChange={v => patchScope(li.id, sr.id, { description: v })} multiline accent={accent} className="block mt-0.5" placeholder="Description" />
          </>
        );
      case 'process':
        return <EF editable={editable} value={sr.process} onChange={v => patchScope(li.id, sr.id, { process: v })} multiline accent={accent} />;
      case 'remark':
        return <EF editable={editable} value={sr.remark} onChange={v => patchScope(li.id, sr.id, { remark: v })} multiline accent={accent} />;
      default:
        return null;
    }
  }

  function materialScopeCell(col, li, accent) {
    switch (col.kind) {
      case 'scope':
        return <EF editable={editable} value={li.description} onChange={v => patchItem(li.id, { description: v })} multiline accent={accent} placeholder="Description" />;
      case 'process':
        return <EF editable={editable} value={li.process} onChange={v => patchItem(li.id, { process: v })} multiline accent={accent} />;
      default:
        return '—';
    }
  }

  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <table className="w-full border-collapse" style={{ minWidth: isSF ? 900 : 1000 }}>
        <ColGroup columns={effCols} editable={editable} />
        <thead>
          <tr>
            {effCols.map(col => <th key={col.key} className={th} style={colWidth(col)}>{col.label}</th>)}
            {editable && <th className={`${th} no-print text-center`} style={{ width: 56 }}>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {(() => {
            let sno = 0;
            return lineItems.map((li, idx) => {
              if (li.itemType === 'section') {
                return (
                  <tr key={li.id} className="bg-slate-50">
                    <td className={`${td} font-semibold text-slate-700`} colSpan={effCols.length + (editable ? 1 : 0)}>
                      <div className="flex items-center justify-between gap-2">
                        <EF editable={editable} value={li.label} onChange={v => patchItem(li.id, { label: v })} placeholder="Section / block heading (e.g. Hotel Block, Villa Block)" className="font-semibold flex-1" accent={isSF ? 'amber' : 'teal'} />
                        {editable && (
                          <div className="no-print flex items-center gap-1 shrink-0">
                            <button onClick={() => onMove(li.id, -1)} disabled={idx === 0} title="Move up" className="text-slate-300 hover:text-slate-700 disabled:opacity-20 disabled:hover:text-slate-300"><ArrowUp size={13} /></button>
                            <button onClick={() => onMove(li.id, 1)} disabled={idx === lineItems.length - 1} title="Move down" className="text-slate-300 hover:text-slate-700 disabled:opacity-20 disabled:hover:text-slate-300"><ArrowDown size={13} /></button>
                            <button onClick={() => onRemove(li.id)} title="Delete this section heading" className="text-slate-300 hover:text-red-600"><Trash2 size={13} /></button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              }

              sno += 1;
              const rowNo = sno;
              const calc = computeLineItem(li);
              const isMat = li.pricingMode === 'material';
              const nRows = isMat ? 1 : Math.max(1, (li.scopeRows || []).length);
              const accent = isSF ? 'amber' : 'teal';
              const rows = isMat ? [null] : (li.scopeRows && li.scopeRows.length ? li.scopeRows : [{ id: `${li.id}_empty`, item: '', description: '', remark: '', process: '' }]);

              return rows.map((sr, si) => (
                <tr key={isMat ? li.id : sr.id}>
                  {effCols.map(col => {
                    if (col.kind === 'sno') {
                      return si === 0 ? <td key={col.key} className={td} rowSpan={nRows}>{rowNo}</td> : null;
                    }
                    if (col.level === 'lineItem') {
                      if (si !== 0) return null;
                      const bold = col.kind === 'name' || col.kind === 'total';
                      return (
                        <td key={col.key} className={`${td} ${bold ? 'font-semibold' : ''}`} rowSpan={nRows} style={colWidth(col)}>
                          {lineItemCell(col, li, calc, accent)}
                        </td>
                      );
                    }
                    return (
                      <td key={col.key} className={td} style={colWidth(col)}>
                        {isMat ? materialScopeCell(col, li, accent) : scopeCell(col, li, sr, accent)}
                      </td>
                    );
                  })}
                  {editable && si === 0 && (
                    <td className={`${td} no-print text-center`} rowSpan={nRows}>
                      <RowActions
                        onEdit={() => onEditRow(li.id)}
                        onDuplicate={() => onDuplicate(li.id)}
                        onMoveUp={() => onMove(li.id, -1)}
                        onMoveDown={() => onMove(li.id, 1)}
                        onRemove={() => onRemove(li.id)}
                        canMoveUp={idx > 0}
                        canMoveDown={idx < lineItems.length - 1}
                      />
                    </td>
                  )}
                </tr>
              ));
            });
          })()}
          {lineItems.length === 0 && (
            <tr><td className={td} colSpan={effCols.length + 1}><span className="text-slate-400">No systems added yet.</span></td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
