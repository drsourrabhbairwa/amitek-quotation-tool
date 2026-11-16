import React, { useMemo, useState } from 'react';
import { AlertCircle, CalendarDays, ChevronRight, Clock } from 'lucide-react';
import { dashboardStats, inr, inrShort, statusOf } from '../lib/pipeline';
import { computeTotals } from '../lib/calc';
import { StatusControl } from './StatusControl';

const PERIODS = [
  ['month', 'This month'],
  ['3months', 'Last 3 months'],
  ['fy', 'This financial year'],
  ['all', 'All time'],
];

function Tile({ label, value, sub, accent }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg px-4 py-3.5">
      <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">{label}</div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${accent || 'text-slate-900'}`}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-slate-500">{sub}</div>}
    </div>
  );
}

function FollowRow({ q, onOpen, onTrack }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 py-2.5 border-t border-slate-100 first:border-t-0">
      <button onClick={() => onOpen(q)} className="min-w-0 w-full sm:flex-1 text-left group">
        <div className="text-sm font-medium text-slate-800 truncate group-hover:underline">{q.client?.name || 'Untitled client'}</div>
        <div className="text-[11px] text-slate-400 font-mono truncate">{q.refNo} · {inr(computeTotals(q).grand)}</div>
      </button>
      <StatusControl quotation={q} onTrack={(patch) => onTrack(q.id, patch)} compact />
    </div>
  );
}

function FollowGroup({ title, Icon, tone, items, onOpen, onTrack }) {
  if (!items.length) return null;
  return (
    <div className="mt-3 first:mt-0">
      <div className={`flex items-center gap-1.5 text-xs font-semibold ${tone}`}>
        <Icon size={13} aria-hidden /> {title} <span className="font-normal text-slate-400">({items.length})</span>
      </div>
      <div className="mt-1">
        {items.map(q => <FollowRow key={q.id} q={q} onOpen={onOpen} onTrack={onTrack} />)}
      </div>
    </div>
  );
}

/** Six months of quoted vs won value, as paired bars. Plain divs so it
 * prints and needs no chart library; every bar carries its own label. */
function MonthBars({ months, div }) {
  const max = Math.max(1, ...months.map(m => m.quoted));
  return (
    <div>
      <div className="flex items-end gap-3 h-40" role="img" aria-label="Quoted and won value for the last six months">
        {months.map(m => (
          <div key={m.key} className="flex-1 flex flex-col items-center justify-end h-full min-w-0">
            <div className="flex items-end gap-1 h-full w-full justify-center">
              <div className="w-1/2 max-w-5 bg-slate-300 rounded-t-sm" style={{ height: `${(m.quoted / max) * 100}%` }} title={`Quoted ${inr(m.quoted)}`} />
              <div className={`w-1/2 max-w-5 ${div.bg} rounded-t-sm`} style={{ height: `${(m.won / max) * 100}%` }} title={`Won ${inr(m.won)}`} />
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-3 mt-1.5 border-t border-slate-200 pt-1.5">
        {months.map(m => (
          <div key={m.key} className="flex-1 text-center min-w-0">
            <div className="text-[11px] font-medium text-slate-600">{m.label}</div>
            <div className="text-[10px] text-slate-400 tabular-nums truncate">{m.quoted ? inrShort(m.quoted) : '—'}</div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-4 mt-3 text-[11px] text-slate-500">
        <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-slate-300" aria-hidden /> Quoted</span>
        <span className="inline-flex items-center gap-1.5"><span className={`w-2.5 h-2.5 rounded-sm ${div.bg}`} aria-hidden /> Won</span>
      </div>
    </div>
  );
}

export function Dashboard({ div, quotations, onOpen, onTrack, onShowHistory }) {
  const [period, setPeriod] = useState('month');
  const s = useMemo(() => dashboardStats(quotations, period), [quotations, period]);
  const fuCount = s.followUps.overdue.length + s.followUps.today.length + s.followUps.week.length;

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-5">
      <div className="flex items-end justify-between gap-3 flex-wrap mb-4">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Sales overview</h1>
          <p className="text-xs text-slate-500">Quotations by their date · Proforma Invoices counted separately</p>
        </div>
        <div className="inline-flex rounded-md border border-slate-200 bg-white p-0.5" role="tablist" aria-label="Period">
          {PERIODS.map(([key, label]) => (
            <button key={key} role="tab" aria-selected={period === key} onClick={() => setPeriod(key)}
              className={`text-xs px-2.5 py-1 rounded ${period === key ? `${div.bg} text-white` : 'text-slate-500 hover:text-slate-800'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Tile label="Quoted" value={inr(s.quotedValue)} sub={`${s.quotedCount} quotation${s.quotedCount === 1 ? '' : 's'}${s.draftCount ? ` · ${s.draftCount} draft` : ''}`} />
        <Tile label="Won" value={inr(s.wonValue)} accent={div.text}
          sub={s.conversion == null ? 'No quotations yet' : `${s.wonCount} of ${s.quotedCount} won · ${Math.round(s.conversion * 100)}% conversion`} />
        <Tile label="Open pipeline" value={inr(s.openValue)} sub={`${s.openCount} awaiting a decision${s.lostCount ? ` · ${s.lostCount} lost` : ''}`} />
        <Tile label="Advance received" value={inr(s.advance)} sub={`${s.piCount} Proforma Invoice${s.piCount === 1 ? '' : 's'} · ${inr(s.piValue)}`} />
      </div>

      <div className="grid lg:grid-cols-5 gap-3 mt-3">
        <section className="lg:col-span-3 bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-slate-800">Follow-ups</h2>
            <span className="text-[11px] text-slate-400">all periods</span>
          </div>
          {fuCount === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">Nothing due this week. Set a follow-up date on any Sent quotation and it shows up here.</p>
          ) : (
            <>
              <FollowGroup title="Overdue" Icon={AlertCircle} tone="text-rose-700" items={s.followUps.overdue} onOpen={onOpen} onTrack={onTrack} />
              <FollowGroup title="Today" Icon={Clock} tone="text-amber-700" items={s.followUps.today} onOpen={onOpen} onTrack={onTrack} />
              <FollowGroup title="Next 7 days" Icon={CalendarDays} tone="text-slate-600" items={s.followUps.week} onOpen={onOpen} onTrack={onTrack} />
            </>
          )}
          {s.noFollowUp.length > 0 && (
            <button onClick={onShowHistory} className="mt-3 w-full flex items-center justify-between text-xs text-slate-500 bg-slate-50 hover:bg-slate-100 rounded-md px-3 py-2">
              <span>{s.noFollowUp.length} open quotation{s.noFollowUp.length === 1 ? ' has' : 's have'} no follow-up date</span>
              <ChevronRight size={14} aria-hidden />
            </button>
          )}
        </section>

        <section className="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-slate-800 mb-3">Last 6 months</h2>
          <MonthBars months={s.months} div={div} />
          <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5">
            {[['won', s.wonCount], ['sent', s.openCount], ['lost', s.lostCount], ['draft', s.draftCount]].map(([key, n]) => {
              const st = statusOf({ status: key });
              return (
                <div key={key} className="flex items-center justify-between text-xs">
                  <span className="inline-flex items-center gap-1.5 text-slate-600"><span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} aria-hidden />{key === 'sent' ? 'Open (Sent + Follow-up)' : st.label}</span>
                  <span className="tabular-nums text-slate-800 font-medium">{n}</span>
                </div>
              );
            })}
            <div className="text-[10px] text-slate-400 pt-1">Counts for the selected period</div>
          </div>
        </section>
      </div>
    </div>
  );
}
