import React, { useRef, useState } from 'react';
import { Search, ArrowLeft, Printer, Pencil, Trash2, Download, Loader2, Receipt } from 'lucide-react';
import { Btn, PrintOrientationStyle } from './ui/atoms';
import { QuotationDocument } from './quotation/QuotationDocument';
import { computeTotals, fmt } from '../lib/calc';
import { downloadQuotationPdf } from '../lib/pdf';

export function QuotationHistory({ div, quotations, onEdit, onDelete, onConvertToPI, settings }) {
  const [viewing, setViewing] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [q, setQ] = useState('');
  const [docTypeFilter, setDocTypeFilter] = useState('all'); // 'all' | 'quotation' | 'proforma'
  const docRef = useRef(null);
  const [downloading, setDownloading] = useState(false);

  const filtered = [...quotations].reverse()
    .filter(item => docTypeFilter === 'all' || (item.docType || 'quotation') === docTypeFilter)
    .filter(item =>
      (item.client?.name || '').toLowerCase().includes(q.toLowerCase()) || (item.refNo || '').toLowerCase().includes(q.toLowerCase())
    );

  const handleDownloadPdf = async () => {
    if (!docRef.current || downloading || !viewing) return;
    setDownloading(true);
    try {
      const filename = `${(viewing.refNo || 'Quotation').replace(/\//g, '-')}.pdf`;
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
            {(viewing.docType || 'quotation') !== 'proforma' && (
              <Btn variant="outline" onClick={() => onConvertToPI(viewing)}><Receipt size={14} /> Convert to Proforma Invoice</Btn>
            )}
            <Btn accentClasses={`${div.bg} text-white ${div.bgHover}`} onClick={() => onEdit(viewing)}><Pencil size={14} /> Edit</Btn>
          </div>
        </div>
        <div ref={docRef}>
          <QuotationDocument div={div} quotation={viewing} editable={false} onChange={() => {}} settings={settings} />
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
          const { grand } = computeTotals(item);
          return (
            <div key={item.id} className="bg-white border border-slate-200 rounded-lg p-3.5 flex items-center justify-between gap-3">
              <button className="text-left min-w-0 flex-1" onClick={() => setViewing(item)}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs text-slate-400">{item.refNo}</span>
                  {item.docType === 'proforma' && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-medium">PI</span>}
                  <span className="text-xs text-slate-400">{item.date}</span>
                </div>
                <div className="font-medium text-slate-800 text-sm truncate mt-0.5">{item.client?.name || 'Untitled client'}</div>
                <div className={`text-sm font-semibold ${div.text} mt-0.5`}>₹ {fmt(grand)}</div>
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
