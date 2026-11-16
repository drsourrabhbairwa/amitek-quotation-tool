import React, { useEffect, useRef, useState } from 'react';
import { Search, ArrowLeft, Printer, Pencil, Trash2, Download, Loader2, Receipt, History, RotateCcw } from 'lucide-react';
import { Btn, PrintOrientationStyle } from './ui/atoms';
import { QuotationDocument } from './quotation/QuotationDocument';
import { computeTotals, fmt } from '../lib/calc';
import { downloadQuotationPdf } from '../lib/pdf';
import { listRevisions } from '../lib/storage';

const who = (email) => (email ? String(email).split('@')[0] : '');
const when = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d) ? '' : d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

/** Version strip shown above an opened quotation: the current version
 * plus every earlier one the server archived (see schema.sql
 * upsert_quotation). Picking an older one shows it read-only, ready to
 * print/download, or to restore into the editor as a new revision. */
function VersionStrip({ div, current, versions, selected, onSelect }) {
  if (versions === 'loading') return <div className="no-print text-xs text-slate-400 mb-3 flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Loading version history…</div>;
  if (versions === 'error') return <div className="no-print text-xs text-slate-400 mb-3">Version history isn't available yet.</div>;
  if (!Array.isArray(versions) || versions.length === 0) {
    return current.savedAt || current.updatedBy
      ? <div className="no-print text-xs text-slate-400 mb-3">Rev {current.revision || 0} · saved {when(current.savedAt)}{current.updatedBy ? ` by ${who(current.updatedBy)}` : ''} · no earlier versions</div>
      : null;
  }
  const chip = (key, active, label, sub, onClick) => (
    <button key={key} onClick={onClick} className={`text-left text-[11px] px-2.5 py-1 rounded-md border whitespace-nowrap ${active ? `${div.bg} text-white ${div.border}` : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
      <span className="font-semibold">{label}</span><span className={active ? 'text-white/80' : 'text-slate-400'}> · {sub}</span>
    </button>
  );
  return (
    <div className="no-print mb-3">
      <div className="text-xs text-slate-500 mb-1.5 flex items-center gap-1"><History size={12} /> Version history ({versions.length + 1} versions)</div>
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {chip('current', selected == null, `Rev ${current.revision || 0} (current)`, `${when(current.savedAt)}${current.updatedBy ? ` · ${who(current.updatedBy)}` : ''}`, () => onSelect(null))}
        {versions.map(v => chip(v.revision, selected === v.revision, `Rev ${v.revision}`, `${when(v.savedAt)}${v.savedBy ? ` · ${who(v.savedBy)}` : ''}`, () => onSelect(v.revision)))}
      </div>
    </div>
  );
}

export function QuotationHistory({ div, quotations, onEdit, onDelete, onConvertToPI, settings }) {
  const [viewing, setViewing] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [q, setQ] = useState('');
  const [docTypeFilter, setDocTypeFilter] = useState('all'); // 'all' | 'quotation' | 'proforma'
  const docRef = useRef(null);
  const [downloading, setDownloading] = useState(false);
  const [versions, setVersions] = useState(null); // null | 'loading' | 'error' | [...]
  const [selectedRev, setSelectedRev] = useState(null); // null = current

  const viewingId = viewing?.id;
  useEffect(() => {
    setSelectedRev(null);
    if (!viewingId) { setVersions(null); return; }
    let cancelled = false;
    setVersions('loading');
    listRevisions(div.key, viewingId)
      .then(v => { if (!cancelled) setVersions(v); })
      .catch(() => { if (!cancelled) setVersions('error'); });
    return () => { cancelled = true; };
  }, [div.key, viewingId, viewing?.revision]);

  const oldVersion = selectedRev != null && Array.isArray(versions) ? versions.find(v => v.revision === selectedRev) : null;
  const shown = oldVersion ? { ...oldVersion.snapshot, revision: oldVersion.revision } : viewing;

  const filtered = [...quotations].reverse()
    .filter(item => docTypeFilter === 'all' || (item.docType || 'quotation') === docTypeFilter)
    .filter(item =>
      (item.client?.name || '').toLowerCase().includes(q.toLowerCase()) || (item.refNo || '').toLowerCase().includes(q.toLowerCase())
    );

  const handleDownloadPdf = async () => {
    if (!docRef.current || downloading || !viewing) return;
    setDownloading(true);
    try {
      const rev = shown.revision > 0 ? `-Rev${shown.revision}` : '';
      const filename = `${(shown.refNo || 'Quotation').replace(/\//g, '-')}${rev}.pdf`;
      await downloadQuotationPdf(docRef.current, filename, { orientation: viewing.pageOrientation || 'portrait' });
    } catch (e) {
      window.alert("Couldn't generate the PDF: " + e.message);
    } finally {
      setDownloading(false);
    }
  };

  if (viewing) {
    return (
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-5">
        <PrintOrientationStyle orientation={viewing.pageOrientation || 'portrait'} />
        <div className="no-print flex items-center justify-between mb-4 flex-wrap gap-2">
          <Btn variant="ghost" onClick={() => setViewing(null)}><ArrowLeft size={14} /> Back to history</Btn>
          <div className="flex items-center gap-2">
            <select value={viewing.pageOrientation || 'portrait'} onChange={e => setViewing({ ...viewing, pageOrientation: e.target.value })} className="border border-slate-300 rounded px-1.5 py-1 text-xs bg-white">
              <option value="portrait">A4 Portrait</option>
              <option value="landscape">A4 Landscape</option>
            </select>
            <Btn variant="outline" onClick={() => window.print()}><Printer size={14} /> Print / Save PDF</Btn>
            <Btn variant="outline" onClick={handleDownloadPdf} disabled={downloading}>
              {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Download PDF
            </Btn>
            {!oldVersion && (viewing.docType || 'quotation') !== 'proforma' && (
              <Btn variant="outline" onClick={() => onConvertToPI(viewing)}><Receipt size={14} /> Convert to Proforma Invoice</Btn>
            )}
            {oldVersion ? (
              <Btn accentClasses={`${div.bg} text-white ${div.bgHover}`} onClick={() => onEdit({ ...oldVersion.snapshot, revision: viewing.revision, createdBy: viewing.createdBy, updatedBy: viewing.updatedBy, savedAt: viewing.savedAt })} title="Opens this old version in the editor; saving it becomes the next revision"><RotateCcw size={14} /> Restore this version</Btn>
            ) : (
              <Btn accentClasses={`${div.bg} text-white ${div.bgHover}`} onClick={() => onEdit(viewing)}><Pencil size={14} /> Edit</Btn>
            )}
          </div>
        </div>
        <VersionStrip div={div} current={viewing} versions={versions} selected={selectedRev} onSelect={setSelectedRev} />
        {oldVersion && (
          <div className="no-print mb-3 text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-md px-3 py-2">
            You're viewing an older version — Rev {oldVersion.revision}, saved {when(oldVersion.savedAt)}{oldVersion.savedBy ? ` by ${who(oldVersion.savedBy)}` : ''}. The current version is Rev {viewing.revision || 0}.
          </div>
        )}
        <div ref={docRef}>
          <QuotationDocument div={div} quotation={shown} editable={false} onChange={() => {}} settings={settings} />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-5">
      <div className="flex items-center gap-1 mb-3">
        {[['all', 'All'], ['quotation', 'Quotations'], ['proforma', 'Proforma Invoices']].map(([key, label]) => (
          <button key={key} onClick={() => setDocTypeFilter(key)} className={`text-xs px-2.5 py-1 rounded-full border ${docTypeFilter === key ? `${div.bg} text-white ${div.border}` : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
            {label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 mb-4">
        <Search size={14} className="text-slate-400" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by client or ref no…" className="text-sm border-b border-slate-200 focus:outline-none focus:border-slate-400 py-1 flex-1 max-w-sm" />
      </div>
      <div className="space-y-2">
        {filtered.map(item => {
          const { grand, advanceTotal, balance } = computeTotals(item);
          return (
            <div key={item.id} className="bg-white border border-slate-200 rounded-lg p-3.5 flex items-center justify-between gap-3">
              <button className="text-left min-w-0 flex-1" onClick={() => setViewing(item)}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs text-slate-400">{item.refNo}</span>
                  {item.docType === 'proforma' && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-medium">PI</span>}
                  {item.revision > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">Rev {item.revision}</span>}
                  <span className="text-xs text-slate-400">{item.date}</span>
                  {item.updatedBy && <span className="text-[11px] text-slate-400">· last saved by {who(item.updatedBy)}{item.savedAt ? `, ${when(item.savedAt)}` : ''}</span>}
                </div>
                <div className="font-medium text-slate-800 text-sm truncate mt-0.5">{item.client?.name || 'Untitled client'}</div>
                <div className={`text-sm font-semibold ${div.text} mt-0.5`}>₹ {fmt(grand)}{advanceTotal > 0 && <span className="text-xs font-normal text-slate-500"> · Advance ₹ {fmt(advanceTotal)} · Balance ₹ {fmt(balance)}</span>}</div>
              </button>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => onEdit(item)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded"><Pencil size={15} /></button>
                {confirmDeleteId === item.id ? (
                  <Btn variant="danger" onClick={() => { onDelete(item.id); setConfirmDeleteId(null); }} className="!px-2 !py-1 text-xs">Confirm?</Btn>
                ) : (
                  <button onClick={() => setConfirmDeleteId(item.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 size={15} /></button>
                )}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <div className="text-center py-10 text-slate-400 text-sm">No quotations {q ? 'match your search' : 'yet'}.</div>}
      </div>
    </div>
  );
}
