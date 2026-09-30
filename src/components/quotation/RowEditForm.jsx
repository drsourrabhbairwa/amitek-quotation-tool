import React from 'react';
import { X, Copy, Trash2, Beaker, ClipboardList } from 'lucide-react';
import { Field, TextInput, TextArea, EF, Btn } from '../ui/atoms';
import { ScopeRowEditor } from '../admin/AdminPanel';

/**
 * The "form" half of the Form + table hybrid: opened from the pencil
 * icon on a row, this shows every field of that System line (and its
 * steps) in one place. It edits the SAME live quotation data the
 * table does — there's no separate draft/Save — so switching between
 * typing in the table and typing in this form is seamless.
 */
export function RowEditForm({ li, div, columns, editable, onPatchItem, onReplaceScopeRows, onPatchCustom, onDuplicate, onRemove, onClose }) {
  if (!li) return null;
  const accent = div.key === 'sf' ? 'amber' : 'teal';
  const isMaterial = li.pricingMode === 'material';
  const customCols = (columns || []).filter(c => c.custom);

  return (
    <div className="fixed inset-0 z-40 bg-slate-900/40 flex items-start sm:items-center justify-center p-3 sm:p-6 overflow-y-auto no-print" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl my-4 sm:my-0 max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between z-10">
          <div>
            <h3 className="font-semibold text-slate-800 text-sm">Edit row</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Changes save instantly — same as typing in the table.</p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded"><X size={18} /></button>
        </div>

        <div className="p-4 space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="System / product name">
              <TextInput value={li.name} onChange={(v) => onPatchItem({ name: v })} accent={accent} />
            </Field>
            <Field label="HSN Code">
              <TextInput value={li.hsnCode} onChange={(v) => onPatchItem({ hsnCode: v })} accent={accent} />
            </Field>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            {isMaterial ? <Beaker size={13} /> : <ClipboardList size={13} />}
            {isMaterial ? 'Material pricing: Area ÷ Coverage × Price/kg' : 'Simple pricing: Rate × Area'}
          </div>

          <Field label="Application / targeted area">
            <TextInput value={li.applicationArea} onChange={(v) => onPatchItem({ applicationArea: v })} accent={accent} />
          </Field>

          {!isMaterial && (
            <>
              <div className="grid sm:grid-cols-3 gap-3">
                <Field label="Rate (₹)"><TextInput type="number" value={li.rate} onChange={(v) => onPatchItem({ rate: v })} accent={accent} /></Field>
                <Field label="Discount rate (₹, optional)"><TextInput type="number" value={li.discountRate} onChange={(v) => onPatchItem({ discountRate: v })} placeholder={String(li.rate ?? '')} accent={accent} /></Field>
                <Field label="Area"><TextInput type="number" value={li.area} onChange={(v) => onPatchItem({ area: v })} accent={accent} /></Field>
              </div>
              <Field label="Color / Pigment (optional)">
                <TextInput value={li.color} onChange={(v) => onPatchItem({ color: v })} accent={accent} />
              </Field>
              <Field label="Steps / scope of work">
                <ScopeRowEditor rows={li.scopeRows || []} onChange={onReplaceScopeRows} div={div} />
              </Field>
            </>
          )}

          {isMaterial && (
            <>
              <div className="grid sm:grid-cols-3 gap-3">
                <Field label="Area"><TextInput type="number" value={li.area} onChange={(v) => onPatchItem({ area: v })} accent={accent} /></Field>
                <Field label="Coverage (sq.ft/kg)"><TextInput type="number" value={li.coveragePerKg} onChange={(v) => onPatchItem({ coveragePerKg: v })} accent={accent} /></Field>
                <Field label="Price per kg (₹)"><TextInput type="number" value={li.pricePerKg} onChange={(v) => onPatchItem({ pricePerKg: v })} accent={accent} /></Field>
              </div>
              <Field label="Description">
                <TextArea value={li.description} onChange={(v) => onPatchItem({ description: v })} rows={3} accent={accent} />
              </Field>
              <Field label="Process (how to mix / apply)">
                <TextArea value={li.process} onChange={(v) => onPatchItem({ process: v })} rows={2} accent={accent} />
              </Field>
            </>
          )}

          {customCols.length > 0 && (
            <div className="pt-1 border-t border-slate-100">
              <div className="text-xs font-medium text-slate-500 mb-2 mt-3">Custom columns</div>
              <div className="grid sm:grid-cols-2 gap-3">
                {customCols.map(col => (
                  <Field key={col.key} label={col.label}>
                    <TextInput value={li.customFields?.[col.key]} onChange={(v) => onPatchCustom(col.key, v)} accent={accent} />
                  </Field>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-white border-t border-slate-100 px-4 py-3 flex items-center justify-between">
          <div className="flex gap-2">
            <Btn variant="outline" onClick={onDuplicate}><Copy size={14} /> Duplicate</Btn>
            <Btn variant="subtleDanger" onClick={() => { onRemove(); onClose(); }}><Trash2 size={14} /> Delete row</Btn>
          </div>
          <Btn accentClasses={`${div.bg} text-white ${div.bgHover}`} onClick={onClose}>Done</Btn>
        </div>
      </div>
    </div>
  );
}
