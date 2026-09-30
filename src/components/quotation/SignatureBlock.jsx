import React from 'react';
import { EF } from '../ui/atoms';

export function SignatureBlock({ signatory, onChange, editable, div, signatories, signatureImageDataUrl }) {
  const accent = div.key === 'sf' ? 'amber' : 'teal';
  const pick = (id) => {
    const found = (signatories || []).find(s => s.id === id);
    if (found) onChange({ name: found.name, role: found.role });
  };
  return (
    <div className="mt-8 flex flex-col sm:flex-row sm:justify-between gap-6 text-xs avoid-break">
      <div>
        {editable && signatories && signatories.length > 1 && (
          <select defaultValue="" onChange={(e) => { if (e.target.value) pick(e.target.value); }} className="no-print text-[11px] border border-slate-300 rounded px-1.5 py-0.5 mb-1.5 bg-white">
            <option value="" disabled>Quick-pick signatory…</option>
            {signatories.map(s => <option key={s.id} value={s.id}>{s.name} — {s.role}</option>)}
          </select>
        )}
        {signatureImageDataUrl && (
          // eslint-disable-next-line jsx-a11y/alt-text
          <img src={signatureImageDataUrl} className="h-12 object-contain mb-1" alt="Signature" />
        )}
        <EF editable={editable} value={signatory.name} onChange={v => onChange({ ...signatory, name: v })} className="font-semibold text-slate-700 block" accent={accent} />
        <EF editable={editable} value={signatory.role} onChange={v => onChange({ ...signatory, role: v })} className="text-slate-500 block mt-0.5" accent={accent} />
        <div className="mt-6 border-t border-slate-400 w-40 pt-1 text-slate-500">Authorized Signatory<br />{div.label}</div>
      </div>
      <div className="sm:text-right">
        <div className="mt-6 border-t border-slate-400 w-40 sm:ml-auto pt-1 text-slate-500">Client Acceptance<br />Stamp &amp; Signature</div>
      </div>
    </div>
  );
}
