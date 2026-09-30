import React, { useState, useRef, useEffect } from 'react';
import { Columns3, Plus, X, RotateCcw } from 'lucide-react';
import { TextInput, Btn } from '../ui/atoms';
import { blankCustomColumn, defaultColumns, columnApplies } from '../../lib/columns';

/**
 * Tick-box column chooser, scoped to ONE quotation (never a saved,
 * reusable layout — every quotation starts from the division's
 * default columns and can be tweaked freely without affecting any
 * other quotation). Lets you show/hide standard columns, rename any
 * header, and add free-form custom columns.
 */
export function ColumnChooser({ columns, onChange, div, ctx }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const toggle = (key) => onChange(columns.map(c => c.key === key ? { ...c, visible: !c.visible } : c));
  const rename = (key, label) => onChange(columns.map(c => c.key === key ? { ...c, label } : c));
  const removeCustom = (key) => onChange(columns.filter(c => c.key !== key));
  const addCustom = () => {
    const customCount = columns.filter(c => c.custom).length;
    onChange([...columns, blankCustomColumn(customCount)]);
  };
  const resetToDefault = () => onChange(defaultColumns(div.key));

  const visibleCount = columns.filter(c => c.visible !== false).length;

  return (
    <div className="relative no-print" ref={ref}>
      <Btn variant="outline" onClick={() => setOpen(o => !o)}>
        <Columns3 size={14} /> Columns <span className="text-slate-400">({visibleCount}/{columns.length})</span>
      </Btn>
      {open && (
        <div className="absolute z-30 mt-1 w-80 max-h-[26rem] overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg p-3 right-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Columns in this quotation</span>
            <button onClick={resetToDefault} title="Reset to this division's default columns" className="text-slate-400 hover:text-slate-700"><RotateCcw size={13} /></button>
          </div>
          <div className="space-y-1.5">
            {columns.map(col => {
              const relevant = columnApplies(col, ctx);
              return (
                <div key={col.key} className={`flex items-center gap-2 rounded px-1.5 py-1 ${!relevant ? 'opacity-50' : ''}`}>
                  <input
                    type="checkbox"
                    checked={col.visible !== false}
                    disabled={col.locked}
                    onChange={() => toggle(col.key)}
                    title={col.locked ? 'This column is required and cannot be hidden' : (relevant ? '' : 'Not used by the items currently in this quotation')}
                  />
                  <TextInput value={col.label} onChange={(v) => rename(col.key, v)} className="flex-1 !py-1 text-xs" />
                  {col.custom && (
                    <button onClick={() => removeCustom(col.key)} title="Remove this custom column" className="text-slate-300 hover:text-red-600 shrink-0"><X size={14} /></button>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100">
            <Btn variant="ghost" onClick={addCustom} className="w-full justify-center"><Plus size={13} /> Add custom column</Btn>
          </div>
        </div>
      )}
    </div>
  );
}
