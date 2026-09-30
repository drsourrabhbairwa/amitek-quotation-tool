import React from 'react';
import { Plus, X } from 'lucide-react';
import { EF, Btn } from '../ui/atoms';
import { uid } from '../../lib/ids';

export function TermsBoxes({ boxes, onChange, editable, div, templates, onApplyTemplate }) {
  const update = (id, patch) => onChange(boxes.map(b => b.id === id ? { ...b, ...patch } : b));
  const remove = (id) => onChange(boxes.filter(b => b.id !== id));
  const add = () => onChange([...boxes, { id: uid('box'), title: 'New Section', content: '' }]);

  return (
    <div className="mt-5 space-y-3 text-xs">
      {editable && templates && templates.length > 1 && (
        <div className="no-print flex items-center gap-2 mb-2">
          <span className="text-slate-400">Load terms template:</span>
          <select
            defaultValue=""
            onChange={(e) => { if (e.target.value) { onApplyTemplate(e.target.value); e.target.value = ''; } }}
            className="text-xs border border-slate-300 rounded px-1.5 py-1 bg-white"
          >
            <option value="" disabled>Choose a saved set…</option>
            {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
      )}
      {boxes.map(b => (
        <div key={b.id} className="border-l-4 pl-3 avoid-break" style={{ borderColor: div.key === 'sf' ? '#92400e' : '#0f766e' }}>
          <div className="flex items-start justify-between gap-2">
            <EF editable={editable} value={b.title} onChange={v => update(b.id, { title: v })} className="font-semibold text-slate-700 text-[13px]" accent={div.key === 'sf' ? 'amber' : 'teal'} />
            {editable && <button onClick={() => remove(b.id)} className="no-print text-slate-300 hover:text-red-600 shrink-0"><X size={14} /></button>}
          </div>
          <EF editable={editable} value={b.content} onChange={v => update(b.id, { content: v })} multiline className="text-slate-500 mt-1 leading-relaxed" accent={div.key === 'sf' ? 'amber' : 'teal'} />
        </div>
      ))}
      {editable && <div className="no-print"><Btn variant="outline" onClick={add}><Plus size={13} /> Add section</Btn></div>}
    </div>
  );
}
