import React from 'react';
import { Plus, X } from 'lucide-react';
import { TextInput, Btn } from '../ui/atoms';
import { uid } from '../../lib/ids';
import { computeTotals, fmt, amountInWords } from '../../lib/calc';

export function TotalsBlock({ quotation, editable, onChange, chargePresets }) {
  const { subtotal, discountAmount, gst, grand, gstBreakup, advanceTotal, balance } = computeTotals(quotation);
  const isPI = quotation.docType === 'proforma';
  const discount = quotation.discount || { type: 'percent', value: 0 };
  const extraCharges = quotation.extraCharges || [];

  const setDiscount = (patch) => onChange({ discount: { ...discount, ...patch } });
  const setExtraCharges = (list) => onChange({ extraCharges: list });
  const addCharge = (preset, taxable = true) => setExtraCharges([...extraCharges, { id: uid('ec'), label: preset?.label || 'Charge', amount: preset?.amount || 0, taxable: preset && preset.taxable === false ? false : taxable }]);
  const updateCharge = (id, patch) => setExtraCharges(extraCharges.map(c => c.id === id ? { ...c, ...patch } : c));
  const removeCharge = (id) => setExtraCharges(extraCharges.filter(c => c.id !== id));

  const advance = quotation.advance || { enabled: false, payments: [] };
  const payments = advance.payments || [];
  const setAdvance = (patch) => onChange({ advance: { ...advance, ...patch } });
  const addPayment = () => setAdvance({ enabled: true, payments: [...payments, { id: uid('adv'), date: new Date().toISOString().slice(0, 10), amount: '', mode: '', ref: '' }] });
  const updatePayment = (id, patch) => setAdvance({ payments: payments.map(p => p.id === id ? { ...p, ...patch } : p) });
  const removePayment = (id) => setAdvance({ payments: payments.filter(p => p.id !== id) });
  const fmtDate = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d || '') ? d.split('-').reverse().join('-') : (d || '');
  const showAdvance = advance.enabled && (editable || advanceTotal > 0);

  const showDiscount = editable || discountAmount > 0;
  const taxableCharges = extraCharges.filter(c => c.taxable !== false);
  const nonGstCharges = extraCharges.filter(c => c.taxable === false);
  const showCharges = editable || taxableCharges.length > 0;
  const showNonGst = !editable && nonGstCharges.length > 0;

  return (
    <div className="flex justify-end mt-3">
      <div className="w-full sm:w-96 text-sm avoid-break">
        <div className="flex justify-between py-1 border-b border-slate-100"><span className="text-slate-500">Sub Total:</span><span className="font-medium">₹ {fmt(subtotal)}</span></div>

        {showDiscount && (
          <div className="flex justify-between py-1 border-b border-slate-100 items-center">
            <span className="text-slate-500 flex items-center gap-1 flex-wrap">
              Discount {editable ? (
                <>
                  <TextInput type="number" value={discount.value} onChange={v => setDiscount({ value: v })} className="w-16 !py-0.5 text-xs" />
                  <select value={discount.type} onChange={e => setDiscount({ type: e.target.value })} className="text-xs border-b border-slate-300 focus:outline-none bg-transparent">
                    <option value="percent">%</option>
                    <option value="flat">₹ flat</option>
                  </select>
                </>
              ) : (discount.type === 'percent' ? `(${discount.value}%)` : '')}:
            </span>
            <span className="font-medium text-red-600">- ₹ {fmt(discountAmount)}</span>
          </div>
        )}

        {showCharges && (
          <div className="py-1 border-b border-slate-100">
            <div className="text-slate-500 mb-1">{editable ? 'Extra charges:' : 'Extra charges (GST applicable):'}</div>
            {(editable ? extraCharges : taxableCharges).map(c => (
              <div key={c.id} className="flex justify-between items-center gap-1.5 py-0.5">
                {editable ? (
                  <TextInput value={c.label} onChange={v => updateCharge(c.id, { label: v })} className="flex-1 !py-0.5 text-xs" />
                ) : (
                  <span className="text-slate-500 text-xs">{c.label}</span>
                )}
                {editable && (
                  <select value={c.taxable === false ? 'no' : 'yes'} onChange={e => updateCharge(c.id, { taxable: e.target.value === 'yes' })} title="Is GST charged on this amount?" className="no-print text-[11px] border border-slate-300 rounded px-1 py-0.5 bg-white">
                    <option value="yes">+ GST</option>
                    <option value="no">No GST</option>
                  </select>
                )}
                {editable ? (
                  <TextInput type="number" value={c.amount} onChange={v => updateCharge(c.id, { amount: v })} className="w-20 !py-0.5 text-xs text-right" />
                ) : (
                  <span className="font-medium">₹ {fmt(c.amount)}</span>
                )}
                {editable && <button onClick={() => removeCharge(c.id)} className="no-print text-slate-300 hover:text-red-600 shrink-0"><X size={13} /></button>}
              </div>
            ))}
            {editable && (
              <div className="no-print flex flex-wrap gap-1.5 mt-1.5">
                {(chargePresets || []).map(p => (
                  <button key={p.id} onClick={() => addCharge(p)} className="text-[11px] px-2 py-0.5 rounded-full border border-slate-300 text-slate-500 hover:bg-slate-50">+ {p.label}</button>
                ))}
                <Btn variant="ghost" onClick={() => addCharge(null)} className="!px-2 !py-0.5 text-[11px]"><Plus size={11} /> Custom charge</Btn>
                <Btn variant="ghost" onClick={() => addCharge(null, false)} className="!px-2 !py-0.5 text-[11px]"><Plus size={11} /> Non-GST charge</Btn>
              </div>
            )}
          </div>
        )}

        {isPI ? (
          <>
            <div className="flex justify-between py-1 border-b border-slate-100 items-center">
              <span className="text-slate-500 flex items-center gap-1 flex-wrap">
                GST @ {editable ? <TextInput type="number" value={quotation.gstPercent} onChange={v => onChange({ gstPercent: v })} className="w-14 !py-0.5 text-xs" /> : quotation.gstPercent}%
                <span className="text-[11px] text-slate-400">({gstBreakup.mode === 'igst' ? 'IGST — interstate' : 'CGST + SGST — intrastate'}):</span>
              </span>
              <span className="font-medium">₹ {fmt(gst)}</span>
            </div>
            {gstBreakup.mode === 'igst' ? (
              <div className="flex justify-between py-0.5 pl-3 text-xs text-slate-400 border-b border-slate-100"><span>IGST @ {gstBreakup.igstPercent}%:</span><span>₹ {fmt(gstBreakup.igst)}</span></div>
            ) : (
              <>
                <div className="flex justify-between py-0.5 pl-3 text-xs text-slate-400"><span>CGST @ {gstBreakup.cgstPercent}%:</span><span>₹ {fmt(gstBreakup.cgst)}</span></div>
                <div className="flex justify-between py-0.5 pl-3 text-xs text-slate-400 border-b border-slate-100"><span>SGST @ {gstBreakup.sgstPercent}%:</span><span>₹ {fmt(gstBreakup.sgst)}</span></div>
              </>
            )}
          </>
        ) : (
          <div className="flex justify-between py-1 border-b border-slate-100 items-center">
            <span className="text-slate-500 flex items-center gap-1">GST @ {editable ? <TextInput type="number" value={quotation.gstPercent} onChange={v => onChange({ gstPercent: v })} className="w-14 !py-0.5 text-xs" /> : quotation.gstPercent}%:</span>
            <span className="font-medium">₹ {fmt(gst)}</span>
          </div>
        )}
        {(showNonGst || (editable && nonGstCharges.length > 0)) && (
          <div className="py-1 border-b border-slate-100">
            <div className="text-slate-500 mb-1">Charges not subject to GST:</div>
            {showNonGst && nonGstCharges.map(c => (
              <div key={c.id} className="flex justify-between items-center gap-1.5 py-0.5">
                <span className="text-slate-500 text-xs">{c.label}</span>
                <span className="font-medium">₹ {fmt(c.amount)}</span>
              </div>
            ))}
            {editable && <div className="no-print text-[11px] text-slate-400">Added after GST — {nonGstCharges.map(c => c.label).join(', ')} (₹ {fmt(nonGstCharges.reduce((a, c) => a + (parseFloat(c.amount) || 0), 0))}). Edit above.</div>}
          </div>
        )}
        <div className="flex justify-between py-1.5 font-bold text-slate-800"><span>Grand Total:</span><span>₹ {fmt(grand)}</span></div>
        <div className="pb-1.5 text-[11px] italic text-slate-500 text-right leading-snug">{amountInWords(grand)}</div>

        {editable && (
          <label className="no-print flex items-center gap-2 py-1.5 text-xs text-slate-600 cursor-pointer select-none border-t border-slate-100">
            <input type="checkbox" checked={!!advance.enabled} onChange={e => setAdvance({ enabled: e.target.checked })} className="accent-slate-700" />
            Show advance payment received
          </label>
        )}

        {showAdvance && (
          <div className="py-1 border-t border-slate-100">
            <div className="text-slate-500 mb-1">Advance received:</div>
            {payments.map(p => (
              <div key={p.id} className="py-0.5">
                {editable ? (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <input type="date" value={p.date || ''} onChange={e => updatePayment(p.id, { date: e.target.value })} className="text-xs border border-slate-300 rounded px-1 py-0.5" />
                    <TextInput value={p.mode} onChange={v => updatePayment(p.id, { mode: v })} placeholder="UPI / Cheque / NEFT" className="w-28 !py-0.5 text-xs" />
                    <TextInput value={p.ref} onChange={v => updatePayment(p.id, { ref: v })} placeholder="Ref / UTR no." className="flex-1 min-w-20 !py-0.5 text-xs" />
                    <TextInput type="number" value={p.amount} onChange={v => updatePayment(p.id, { amount: v })} placeholder="Amount" className="w-24 !py-0.5 text-xs text-right" />
                    <button onClick={() => removePayment(p.id)} className="no-print text-slate-300 hover:text-red-600 shrink-0"><X size={13} /></button>
                  </div>
                ) : (
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500 text-xs">{[fmtDate(p.date), p.mode, p.ref].filter(Boolean).join(' · ') || 'Advance'}</span>
                    <span className="font-medium">₹ {fmt(p.amount)}</span>
                  </div>
                )}
              </div>
            ))}
            {editable && (
              <Btn variant="ghost" onClick={addPayment} className="no-print !px-2 !py-0.5 text-[11px]"><Plus size={11} /> Add advance payment</Btn>
            )}
            {editable && advanceTotal > grand && (
              <div className="no-print text-[11px] text-red-600 mt-1">Advance is more than the Grand Total — please check the amounts.</div>
            )}
            <div className="flex justify-between py-1 mt-1 border-t border-slate-100"><span className="text-slate-500">Total advance received:</span><span className="font-medium text-emerald-700">- ₹ {fmt(advanceTotal)}</span></div>
            <div className="flex justify-between py-1.5 font-bold text-slate-800 border-t border-slate-300"><span>Balance Payable:</span><span>₹ {fmt(balance)}</span></div>
            <div className="pb-1 text-[11px] italic text-slate-500 text-right leading-snug">{amountInWords(balance)}</div>
          </div>
        )}
      </div>
    </div>
  );
}
