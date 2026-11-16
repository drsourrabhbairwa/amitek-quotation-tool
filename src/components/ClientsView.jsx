import React, { useMemo, useState } from 'react';
import { Search, ChevronDown, ChevronRight, FilePlus2, Phone, MapPin } from 'lucide-react';
import { Btn } from './ui/atoms';
import { DIVISIONS } from '../lib/constants';
import { inr, statusOf } from '../lib/pipeline';

/** Every client ever quoted, across both divisions, with their totals and
 * quotations. Opening a quotation of the other division switches to it. */
export function ClientsView({ div, directory, onOpen, onNewForClient }) {
  const [text, setText] = useState('');
  const [openKey, setOpenKey] = useState(null);
  const shown = useMemo(() => {
    const t = text.trim().toLowerCase();
    if (!t) return directory;
    return directory.filter(c => [c.details.name, c.details.contact, c.details.phone, c.details.gstin, c.details.address]
      .some(v => (v || '').toLowerCase().includes(t)));
  }, [directory, text]);

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-5">
      <div className="flex items-end justify-between gap-3 flex-wrap mb-4">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Clients</h1>
          <p className="text-xs text-slate-500">{directory.length} clients from both divisions · details come from each client's latest quotation</p>
        </div>
        <label className="flex items-center gap-2 bg-white border border-slate-200 rounded-md px-2.5 py-1.5 w-full sm:w-72">
          <Search size={14} className="text-slate-400" aria-hidden />
          <input value={text} onChange={e => setText(e.target.value)} placeholder="Search name, phone, GSTIN…" className="text-sm flex-1 focus:outline-none min-w-0" />
        </label>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
        {shown.map(c => {
          const expanded = openKey === c.key;
          return (
            <div key={c.key}>
              <button onClick={() => setOpenKey(expanded ? null : c.key)} className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-slate-50" aria-expanded={expanded}>
                {expanded ? <ChevronDown size={16} className="text-slate-400 shrink-0" /> : <ChevronRight size={16} className="text-slate-400 shrink-0" />}
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-slate-800 truncate">{c.details.name}</div>
                  <div className="text-[11px] text-slate-400 truncate">
                    {[c.details.contact, c.details.phone, c.details.state].filter(Boolean).join(' · ') || '—'}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-semibold tabular-nums text-slate-800">{inr(c.quotedValue)}</div>
                  <div className="text-[11px] text-slate-400">{c.items.length} doc{c.items.length === 1 ? '' : 's'}{c.wonValue ? ` · won ${inr(c.wonValue)}` : ''}</div>
                </div>
              </button>
              {expanded && (
                <div className="px-4 pb-4 pl-11">
                  <div className="text-xs text-slate-500 space-y-0.5 mb-3">
                    {c.details.address && <div className="flex gap-1.5"><MapPin size={12} className="mt-0.5 shrink-0" aria-hidden />{c.details.address}</div>}
                    {c.details.phone && <div className="flex gap-1.5"><Phone size={12} className="mt-0.5 shrink-0" aria-hidden />{c.details.phone}</div>}
                    {c.details.gstin && <div>GSTIN: <span className="font-mono">{c.details.gstin}</span></div>}
                  </div>
                  <div className="space-y-1">
                    {c.items.map(({ divKey, q, grand }) => {
                      const st = statusOf(q);
                      const isPI = q.docType === 'proforma';
                      return (
                        <button key={q.id} onClick={() => onOpen(divKey, q)} className="w-full flex items-center gap-2 text-left text-xs rounded-md px-2 py-1.5 hover:bg-slate-50">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${DIVISIONS[divKey].lightBg} ${DIVISIONS[divKey].text}`}>{DIVISIONS[divKey].short}</span>
                          <span className="font-mono text-slate-500 truncate">{q.refNo || 'unsaved'}</span>
                          {isPI
                            ? <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-medium">PI</span>
                            : <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${st.chip}`}>{st.label}</span>}
                          <span className="text-slate-400">{q.date}</span>
                          <span className="ml-auto tabular-nums font-medium text-slate-700">{inr(grand)}</span>
                        </button>
                      );
                    })}
                  </div>
                  <Btn variant="outline" onClick={() => onNewForClient(c)} className="mt-3 !text-xs"><FilePlus2 size={13} /> New {div.short} quotation for this client</Btn>
                </div>
              )}
            </div>
          );
        })}
        {shown.length === 0 && <div className="text-center py-10 text-slate-400 text-sm">{directory.length ? 'No client matches your search.' : 'Clients appear here automatically once you save quotations.'}</div>}
      </div>
    </div>
  );
}
