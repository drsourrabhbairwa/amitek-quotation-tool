import React, { useState } from 'react';
import { computeTotals } from '../../lib/calc';
import { uid } from '../../lib/ids';
import { LetterheadHeader } from './LetterheadHeader';
import { ClientCard } from './ClientCard';
import { LineItemsTable } from './LineItemsTable';
import { RowEditForm } from './RowEditForm';
import { ColumnChooser } from './ColumnChooser';
import { TotalsBlock } from './TotalsBlock';
import { TermsBoxes } from './TermsBoxes';
import { BankDetailsBlock } from './BankDetailsBlock';
import { SignatureBlock } from './SignatureBlock';
import { ShippingDeliveryBlock } from './ShippingDeliveryBlock';
import { EF } from '../ui/atoms';

export function QuotationDocument({ div, quotation, editable, onChange, settings }) {
  const [editingLineItemId, setEditingLineItemId] = useState(null);
  const set = (patch) => onChange({ ...quotation, ...patch });
  const lineItems = quotation.lineItems;

  const updateLineItems = (items) => set({ lineItems: items });
  const removeLineItem = (id) => { updateLineItems(lineItems.filter(li => li.id !== id)); if (editingLineItemId === id) setEditingLineItemId(null); };
  const duplicateLineItem = (id) => {
    const idx = lineItems.findIndex(li => li.id === id);
    if (idx === -1) return;
    const original = lineItems[idx];
    const copy = {
      ...original,
      id: uid('li'),
      scopeRows: (original.scopeRows || []).map(r => ({ ...r, id: uid('sc') })),
    };
    const next = [...lineItems];
    next.splice(idx + 1, 0, copy);
    updateLineItems(next);
  };
  const moveLineItem = (id, dir) => {
    const idx = lineItems.findIndex(li => li.id === id);
    const newIdx = idx + dir;
    if (idx === -1 || newIdx < 0 || newIdx >= lineItems.length) return;
    const next = [...lineItems];
    [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
    updateLineItems(next);
  };

  const editingLi = editingLineItemId ? lineItems.find(li => li.id === editingLineItemId) : null;
  const patchEditingItem = (patch) => updateLineItems(lineItems.map(li => li.id === editingLineItemId ? { ...li, ...patch } : li));
  const replaceEditingScopeRows = (rows) => updateLineItems(lineItems.map(li => li.id === editingLineItemId ? { ...li, scopeRows: rows } : li));
  const patchEditingCustom = (colKey, value) => updateLineItems(lineItems.map(li => li.id === editingLineItemId ? { ...li, customFields: { ...li.customFields, [colKey]: value } } : li));

  const applyTermsTemplate = (templateId) => {
    const tpl = (settings?.termsTemplates || []).find(t => t.id === templateId);
    if (!tpl) return;
    set({ termsTemplateId: tpl.id, termsBoxes: (tpl.boxes || []).map(b => ({ ...b, id: uid('box') })) });
  };

  // Which identity this document prints under: this division's own
  // letterhead, or the parent company's ("Amitek Paint and Coating" /
  // APP Paints Chemicals Pvt. LTD.) — both are snapshotted on the
  // quotation, the picker in the builder toolbar just chooses which one
  // to render.
  const resolvedLetterhead = quotation.letterheadIdentity === 'company'
    ? (quotation.companyIdentity || quotation.letterhead)
    : quotation.letterhead;

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4 sm:p-6 print-area text-slate-800" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
      <LetterheadHeader div={div} letterhead={resolvedLetterhead} docType={quotation.docType} refNo={quotation.refNo} date={quotation.date} editable={editable} onDateChange={(v) => set({ date: v })} />
      <ClientCard client={quotation.client} onChange={(c) => set({ client: c })} editable={editable} div={div} />
      {quotation.showApplicator && (
        <div className="border border-slate-200 rounded-md p-3 mb-3">
          <div className="text-xs font-semibold text-slate-500 mb-1.5">🛠 APPLICATOR / CONTRACTOR</div>
          <div className="space-y-1">
            <EF editable={editable} value={quotation.applicator?.agency} onChange={(v) => set({ applicator: { ...quotation.applicator, agency: v } })} placeholder="Agency name" className="text-sm text-slate-600" accent={div.key === 'sf' ? 'amber' : 'teal'} />
            <EF editable={editable} value={quotation.applicator?.contractorName} onChange={(v) => set({ applicator: { ...quotation.applicator, contractorName: v } })} placeholder="Contractor name" className="text-sm text-slate-600" accent={div.key === 'sf' ? 'amber' : 'teal'} />
            <EF editable={editable} value={quotation.applicator?.contact} onChange={(v) => set({ applicator: { ...quotation.applicator, contact: v } })} placeholder="Contact person / phone" className="text-sm text-slate-600" accent={div.key === 'sf' ? 'amber' : 'teal'} />
          </div>
        </div>
      )}
      {quotation.showShipping && (
        <ShippingDeliveryBlock shipping={quotation.shipping} onChange={(s) => set({ shipping: s })} editable={editable} div={div} />
      )}

      {editable && (
        <div className="no-print flex justify-end mb-2">
          <ColumnChooser
            columns={quotation.columns}
            onChange={(cols) => set({ columns: cols })}
            div={div}
            ctx={{
              isSF: div.key === 'sf',
              hasMaterial: lineItems.some(li => li.pricingMode === 'material'),
              hasSimple: lineItems.some(li => li.pricingMode !== 'material'),
              colorEnabled: quotation.colorColumnEnabled,
            }}
          />
        </div>
      )}

      <LineItemsTable
        division={div.key}
        columns={quotation.columns}
        lineItems={lineItems}
        editable={editable}
        onUpdate={updateLineItems}
        onRemove={removeLineItem}
        onDuplicate={duplicateLineItem}
        onMove={moveLineItem}
        onEditRow={(id) => setEditingLineItemId(id)}
        colorEnabled={quotation.colorColumnEnabled}
      />

      {editable && editingLi && (
        <RowEditForm
          li={editingLi}
          div={div}
          columns={quotation.columns}
          editable={editable}
          onPatchItem={patchEditingItem}
          onReplaceScopeRows={replaceEditingScopeRows}
          onPatchCustom={patchEditingCustom}
          onDuplicate={() => duplicateLineItem(editingLineItemId)}
          onRemove={() => removeLineItem(editingLineItemId)}
          onClose={() => setEditingLineItemId(null)}
        />
      )}

      <TotalsBlock quotation={quotation} editable={editable} onChange={set} chargePresets={settings?.tax?.extraChargePresets} />
      <TermsBoxes boxes={quotation.termsBoxes} onChange={(b) => set({ termsBoxes: b })} editable={editable} div={div} templates={settings?.termsTemplates} onApplyTemplate={applyTermsTemplate} />
      <BankDetailsBlock bank={quotation.bank} div={div} />
      <SignatureBlock signatory={quotation.signatory} onChange={(s) => set({ signatory: s })} editable={editable} div={div} signatories={settings?.signatories} signatureImageDataUrl={quotation.signatureImageDataUrl} />
    </div>
  );
}
