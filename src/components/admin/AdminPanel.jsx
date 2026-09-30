import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Pencil, Save, ClipboardList, Beaker } from 'lucide-react';
import { Field, TextInput, TextArea, Btn } from '../ui/atoms';
import { mkScope, CATEGORIES } from '../../lib/constants';
import { uid } from '../../lib/ids';

/* ============================================================
   ADMIN PANEL — SYSTEM LIST + EDITOR
   ============================================================ */

export function ScopeRowEditor({ rows, onChange, div }) {
  const update = (id, patch) => onChange(rows.map(r => r.id === id ? { ...r, ...patch } : r));
  const remove = (id) => { if (rows.length > 1) onChange(rows.filter(r => r.id !== id)); };
  const add = () => onChange([...rows, mkScope('New step', '')]);
  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={r.id} className="border border-slate-200 rounded-md p-2.5 bg-slate-50">
          <div className="flex items-start gap-2">
            <span className="text-xs text-slate-400 mt-2 w-4">{i + 1}.</span>
            <div className="flex-1 space-y-1.5">
              <TextInput value={r.item} onChange={(v) => update(r.id, { item: v })} placeholder="Step / item name" accent={div.key === 'sf' ? 'amber' : 'teal'} />
              <TextArea value={r.description} onChange={(v) => update(r.id, { description: v })} placeholder="Description / scope of work" rows={2} accent={div.key === 'sf' ? 'amber' : 'teal'} />
              <div className="grid grid-cols-2 gap-1.5">
                <TextInput value={r.remark} onChange={(v) => update(r.id, { remark: v })} placeholder="Remark (e.g. Compulsory)" accent={div.key === 'sf' ? 'amber' : 'teal'} />
                {div.key === 'wp' && <TextInput value={r.process} onChange={(v) => update(r.id, { process: v })} placeholder="Process (how to mix/apply)" accent="teal" />}
              </div>
            </div>
            <button onClick={() => remove(r.id)} disabled={rows.length <= 1} title={rows.length <= 1 ? 'A system needs at least one step' : 'Remove step'} className="text-slate-300 hover:text-red-600 mt-1.5 disabled:opacity-30 disabled:hover:text-slate-300"><Trash2 size={16} /></button>
          </div>
        </div>
      ))}
      <Btn variant="outline" onClick={add}><Plus size={14} /> Add step</Btn>
    </div>
  );
}

function SystemEditor({ system, div, onSave, onCancel }) {
  const [s, setS] = useState(system);
  const set = (patch) => setS(prev => ({ ...prev, ...patch }));
  const isMaterial = s.pricingMode === 'material';

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="System / Product name">
          <TextInput value={s.name} onChange={(v) => set({ name: v })} placeholder="e.g. AMITEK Nano Topping For Walls" accent={div.key === 'sf' ? 'amber' : 'teal'} />
        </Field>
        <Field label="HSN Code (optional)">
          <TextInput value={s.hsnCode} onChange={(v) => set({ hsnCode: v })} placeholder="e.g. 29319090" accent={div.key === 'sf' ? 'amber' : 'teal'} />
        </Field>
      </div>

      <Field label="Category" hint="Groups this system in the list below and in the quotation picker. Pick an existing one or type a new one.">
        <TextInput value={s.category || ''} onChange={(v) => set({ category: v })} placeholder="e.g. Under-Tile System, Lime System, Nano Pore System" accent={div.key === 'sf' ? 'amber' : 'teal'} list="system-category-suggestions" />
        <datalist id="system-category-suggestions">
          {(CATEGORIES[div.key] || []).map(c => <option key={c} value={c} />)}
        </datalist>
      </Field>

      <Field label="Pricing mode">
        <div className="flex gap-2">
          <button onClick={() => set({ pricingMode: 'simple' })} className={`flex-1 rounded-md border px-3 py-2 text-sm text-left ${!isMaterial ? `${div.border} ${div.lightBg} ${div.text} font-medium` : 'border-slate-200 text-slate-500'}`}>
            <ClipboardList size={14} className="inline mr-1.5 -mt-0.5" /> Simple — Rate × Area
          </button>
          <button onClick={() => set({ pricingMode: 'material' })} className={`flex-1 rounded-md border px-3 py-2 text-sm text-left ${isMaterial ? `${div.border} ${div.lightBg} ${div.text} font-medium` : 'border-slate-200 text-slate-500'}`}>
            <Beaker size={14} className="inline mr-1.5 -mt-0.5" /> Material — Coverage/kg → Price
          </button>
        </div>
      </Field>

      {!isMaterial && (
        <>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Default application area">
              <TextInput value={s.applicationArea} onChange={(v) => set({ applicationArea: v })} placeholder="e.g. Plaster Walls" accent={div.key === 'sf' ? 'amber' : 'teal'} />
            </Field>
            <Field label={`Default rate (₹ per ${s.unit || 'Sq.Ft'})`}>
              <TextInput type="number" value={s.defaultRate} onChange={(v) => set({ defaultRate: v })} accent={div.key === 'sf' ? 'amber' : 'teal'} />
            </Field>
          </div>
          <Field label="Scope of work (steps shown in the quotation, in order)">
            <ScopeRowEditor rows={s.scopeRows || []} onChange={(rows) => set({ scopeRows: rows })} div={div} />
          </Field>
        </>
      )}

      {isMaterial && (
        <>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Coverage (Sq.ft per Kg)">
              <TextInput type="number" value={s.coveragePerKg} onChange={(v) => set({ coveragePerKg: v })} accent="teal" />
            </Field>
            <Field label="Default price per Kg (₹)">
              <TextInput type="number" value={s.defaultPricePerKg} onChange={(v) => set({ defaultPricePerKg: v })} accent="teal" />
            </Field>
          </div>
          <Field label="Description">
            <TextArea value={s.description} onChange={(v) => set({ description: v })} rows={3} accent="teal" />
          </Field>
          <Field label="Process (how to mix / apply)">
            <TextArea value={s.process} onChange={(v) => set({ process: v })} rows={2} accent="teal" />
          </Field>
        </>
      )}

      <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
        <Btn variant="ghost" onClick={onCancel}>Cancel</Btn>
        <Btn accentClasses={`${div.bg} text-white ${div.bgHover}`} onClick={() => onSave(s)}><Save size={14} /> Save System</Btn>
      </div>
    </div>
  );
}

export function AdminPanel({ div, systems, onChangeSystems }) {
  const [editingId, setEditingId] = useState(null); // 'new' | system.id | null
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const startNew = () => setEditingId('new');
  const startEdit = (id) => setEditingId(id);
  const cancel = () => setEditingId(null);

  const save = (sysData) => {
    if (editingId === 'new') {
      onChangeSystems([...systems, { ...sysData, id: uid('sys'), division: div.key }]);
    } else {
      onChangeSystems(systems.map(s => s.id === sysData.id ? sysData : s));
    }
    setEditingId(null);
  };

  const doDelete = (id) => {
    onChangeSystems(systems.filter(s => s.id !== id));
    setConfirmDeleteId(null);
  };

  const blank = {
    id: null, division: div.key, category: '', name: '', hsnCode: '', unit: 'Sq.Ft', pricingMode: 'simple',
    applicationArea: '', defaultRate: '', scopeRows: [mkScope('Surface Preparation', '')],
    coveragePerKg: '', defaultPricePerKg: '', description: '', process: '',
  };

  // Group systems by category for display — known categories first (in
  // their defined order), then any custom ones the user typed, then
  // uncategorized systems last.
  const grouped = useMemo(() => {
    const map = new Map();
    for (const s of systems) {
      const cat = (s.category || '').trim() || 'Uncategorized';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat).push(s);
    }
    const known = CATEGORIES[div.key] || [];
    const orderedKeys = [
      ...known.filter(k => map.has(k)),
      ...[...map.keys()].filter(k => !known.includes(k) && k !== 'Uncategorized'),
      ...(map.has('Uncategorized') ? ['Uncategorized'] : []),
    ];
    return orderedKeys.map(key => [key, map.get(key)]);
  }, [systems, div.key]);

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-slate-800">Systems — {div.label}</h2>
          <p className="text-xs text-slate-500 mt-0.5">These are the reusable templates you'll pick from when building a quotation.</p>
        </div>
        {editingId === null && (
          <Btn accentClasses={`${div.bg} text-white ${div.bgHover}`} onClick={startNew}><Plus size={15} /> New System</Btn>
        )}
      </div>

      {editingId === 'new' && <SystemEditor system={blank} div={div} onSave={save} onCancel={cancel} />}

      <div className="space-y-5">
        {grouped.map(([category, list]) => (
          <div key={category}>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
              {category} <span className="font-normal normal-case text-slate-300">({list.length})</span>
            </div>
            <div className="space-y-2.5">
              {list.map(s => (
                <div key={s.id}>
                  {editingId === s.id ? (
                    <SystemEditor system={s} div={div} onSave={save} onCancel={cancel} />
                  ) : (
                    <div className="bg-white border border-slate-200 rounded-lg p-3.5 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-slate-800 text-sm">{s.name}</span>
                          {s.hsnCode && <span className="text-[11px] text-slate-400 font-mono">HSN {s.hsnCode}</span>}
                          <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${s.pricingMode === 'material' ? 'bg-teal-50 text-teal-700' : `${div.lightBg} ${div.text}`}`}>
                            {s.pricingMode === 'material' ? 'Material-based' : 'Simple: Rate × Area'}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          {s.pricingMode === 'material'
                            ? `Coverage ${s.coveragePerKg || '—'} sq.ft/kg · ₹${s.defaultPricePerKg || '—'}/kg`
                            : `${(s.scopeRows || []).length} step${(s.scopeRows || []).length === 1 ? '' : 's'} · ₹${s.defaultRate || '—'}/${s.unit || 'Sq.Ft'} · ${s.applicationArea || 'no default area'}`}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => startEdit(s.id)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded"><Pencil size={15} /></button>
                        {confirmDeleteId === s.id ? (
                          <Btn variant="danger" onClick={() => doDelete(s.id)} className="!px-2 !py-1 text-xs">Confirm?</Btn>
                        ) : (
                          <button onClick={() => setConfirmDeleteId(s.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 size={15} /></button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
        {systems.length === 0 && editingId === null && (
          <div className="text-center py-10 text-slate-400 text-sm">No systems yet. Add your first one above.</div>
        )}
      </div>
    </div>
  );
}
