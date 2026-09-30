import React, { useRef, useState } from 'react';
import { Printer, Save, Download, Loader2 } from 'lucide-react';
import { Btn, PrintOrientationStyle } from './ui/atoms';
import { SystemPicker } from './quotation/SystemPicker';
import { QuotationDocument } from './quotation/QuotationDocument';
import { systemToLineItem, blankCustomLineItem, blankSectionRow } from '../lib/model';
import { nextRefNo } from '../lib/calc';
import { downloadQuotationPdf } from '../lib/pdf';

export function QuotationBuilder({ div, systems, draft, setDraft, onSaved, divData, setDivData, persist, settings }) {
  const q = draft;
  const docRef = useRef(null);
  const printRef = useRef(null);
  const [downloading, setDownloading] = useState(false);
  const isPI = q.docType === 'proforma';

  const updateQuotation = (updated) => setDraft({ ...updated, updatedAt: Date.now() });

  const addSystem = (sys) => updateQuotation({ ...q, lineItems: [...q.lineItems, systemToLineItem(sys)] });
  const addBlankRow = () => updateQuotation({ ...q, lineItems: [...q.lineItems, blankCustomLineItem()] });
  const addSection = () => updateQuotation({ ...q, lineItems: [...q.lineItems, blankSectionRow('New Section')] });

  const handleSave = async () => {
    let refNo = q.refNo;
    let newDivData = divData;
    if (!refNo) {
      const { refNo: generatedRefNo, ...counterUpdate } = nextRefNo(div.key, divData, settings, q.docType);
      refNo = generatedRefNo;
      newDivData = { ...divData, ...counterUpdate };
    }
    const finalQ = { ...q, refNo, updatedAt: Date.now() };
    const exists = newDivData.quotations.some(x => x.id === finalQ.id);
    const newQuotations = exists
      ? newDivData.quotations.map(x => x.id === finalQ.id ? finalQ : x)
      : [...newDivData.quotations, finalQ];
    newDivData = { ...newDivData, quotations: newQuotations };
    setDraft(finalQ);
    setDivData(newDivData);
    await persist(newDivData);
    onSaved && onSaved(finalQ);
  };

  const handlePrint = () => window.print();

  const handleDownloadPdf = async () => {
    if (!printRef.current || downloading) return;
    setDownloading(true);
    try {
      const filename = `${(q.refNo || (isPI ? 'Proforma-Invoice-Draft' : 'Quotation-Draft')).replace(/\//g, '-')}.pdf`;
      await downloadQuotationPdf(printRef.current, filename, { orientation: q.pageOrientation || 'portrait' });
    } catch (e) {
      window.alert("Couldn't generate the PDF: " + e.message);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-5">
      <PrintOrientationStyle orientation={q.pageOrientation || 'portrait'} />
      {isPI && q.convertedFromRefNo && (
        <div className="no-print mb-3 text-xs text-slate-500 bg-slate-100 border border-slate-200 rounded-md px-3 py-2">
          Converted from Quotation <span className="font-mono">{q.convertedFromRefNo}</span> — this Proforma Invoice is its own saved document, so editing it won't change the original quotation.
        </div>
      )}
      <div className="no-print flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <label className="flex items-center gap-1.5 text-xs text-slate-500">
            Print as:
            <select value={q.letterheadIdentity || 'division'} onChange={e => updateQuotation({ ...q, letterheadIdentity: e.target.value })} className="border border-slate-300 rounded px-1.5 py-0.5 text-xs bg-white">
              <option value="division">{div.label}</option>
              <option value="company">Amitek Paint and Coating (APP Paints Chemicals)</option>
            </select>
          </label>
          <label className="flex items-center gap-1.5 text-xs text-slate-500">
            <input type="checkbox" checked={q.showApplicator} onChange={e => updateQuotation({ ...q, showApplicator: e.target.checked })} />
            Show applicator/contractor card
          </label>
          <label className="flex items-center gap-1.5 text-xs text-slate-500">
            <input type="checkbox" checked={q.showShipping} onChange={e => updateQuotation({ ...q, showShipping: e.target.checked })} />
            Show shipping &amp; delivery
          </label>
          {div.hasColorColumn && (
            <label className="flex items-center gap-1.5 text-xs text-slate-500">
              <input type="checkbox" checked={q.colorColumnEnabled} onChange={e => updateQuotation({ ...q, colorColumnEnabled: e.target.checked })} />
              Color / Pigment column
            </label>
          )}
          <label className="flex items-center gap-1.5 text-xs text-slate-500">
            Page:
            <select value={q.pageOrientation || 'portrait'} onChange={e => updateQuotation({ ...q, pageOrientation: e.target.value })} className="border border-slate-300 rounded px-1.5 py-0.5 text-xs bg-white">
              <option value="portrait">A4 Portrait</option>
              <option value="landscape">A4 Landscape</option>
            </select>
          </label>
        </div>
        <div className="flex gap-2">
          <Btn variant="outline" onClick={handlePrint}><Printer size={14} /> Print / Save PDF</Btn>
          <Btn variant="outline" onClick={handleDownloadPdf} disabled={downloading}>
            {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Download PDF
          </Btn>
          <Btn accentClasses={`${div.bg} text-white ${div.bgHover}`} onClick={handleSave}><Save size={14} /> {q.refNo ? 'Update' : 'Save'} {isPI ? 'Proforma Invoice' : 'Quotation'}</Btn>
        </div>
      </div>

      <SystemPicker systems={systems} onAdd={addSystem} onAddBlank={addBlankRow} onAddSection={addSection} div={div} />
      <div ref={docRef}>
        <QuotationDocument div={div} quotation={q} editable={true} onChange={updateQuotation} settings={settings} />
      </div>
      {/* Off-screen, read-only twin used only by "Download PDF". Exporting the
          live editable view baked empty-field borders, +/× buttons and
          single-line clipped text straight into client-facing PDFs. This
          mirrors exactly what Save → History → Open renders, so a download
          always looks like a finished document, whichever screen it's
          triggered from. */}
      <div ref={printRef} className="no-print" style={{ position: 'fixed', top: 0, left: '-10000px', width: 1120 }}>
        <QuotationDocument div={div} quotation={q} editable={false} onChange={() => {}} settings={settings} />
      </div>
    </div>
  );
}
