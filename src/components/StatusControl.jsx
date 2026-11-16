import React, { useState } from 'react';
import { CalendarClock } from 'lucide-react';
import { STATUSES, statusOf, isOpen, parseIsoDay } from '../lib/pipeline';

/** Status pill + follow-up date for one quotation. Changes save straight
 * away through onTrack(patch) — no revision, no editor needed. */
export function StatusControl({ quotation, onTrack, compact = false }) {
  const st = statusOf(quotation);
  const [note, setNote] = useState(quotation.statusNote || '');
  const [busy, setBusy] = useState(false);

  const run = async (patch) => {
    setBusy(true);
    try { await onTrack(patch); } catch (e) { window.alert(e.message); } finally { setBusy(false); }
  };

  const fu = parseIsoDay(quotation.followUpDate);
  const overdue = fu && isOpen(quotation) && fu < new Date(new Date().toDateString());

  return (
    <div className={`no-print flex items-center gap-1.5 flex-wrap ${busy ? 'opacity-60 pointer-events-none' : ''}`} onClick={e => e.stopPropagation()}>
      <label className={`inline-flex items-center gap-1 rounded-full pl-2 pr-1 py-0.5 text-[11px] font-medium ${st.chip}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} aria-hidden />
        <select
          value={st.key}
          onChange={e => run({ status: e.target.value })}
          className="bg-transparent focus:outline-none cursor-pointer"
          aria-label="Quotation status"
        >
          {STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
      </label>
      {isOpen(quotation) && (
        <label className={`inline-flex items-center gap-1 text-[11px] rounded-full border px-2 py-0.5 ${overdue ? 'border-rose-300 text-rose-700 bg-rose-50' : 'border-slate-200 text-slate-500 bg-white'}`} title="Follow-up date">
          <CalendarClock size={12} aria-hidden />
          <input
            type="date"
            value={quotation.followUpDate || ''}
            onChange={e => run({ followUpDate: e.target.value || null })}
            className="bg-transparent focus:outline-none w-[7.2rem]"
            aria-label="Follow-up date"
          />
        </label>
      )}
      {!compact && (quotation.status === 'lost' || quotation.status === 'won' || quotation.status === 'followup') && (
        <input
          value={note}
          onChange={e => setNote(e.target.value)}
          onBlur={() => { if (note !== (quotation.statusNote || '')) run({ statusNote: note }); }}
          placeholder={quotation.status === 'lost' ? 'Why lost? (price, competitor…)' : quotation.status === 'won' ? 'PO no. / note' : 'Follow-up note'}
          className="text-[11px] border-b border-slate-200 focus:outline-none focus:border-slate-400 py-0.5 min-w-40"
        />
      )}
      {compact && quotation.statusNote && <span className="text-[11px] text-slate-400 truncate max-w-48">{quotation.statusNote}</span>}
    </div>
  );
}
