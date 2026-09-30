import React from 'react';
import { Plus, X } from 'lucide-react';
import { TextInput, Btn } from '../ui/atoms';
import { uid } from '../../lib/ids';
import { computeTotals, fmt } from '../../lib/calc';

export function TotalsBlock({ quotation, editable, onChange, chargePresets }) {
  const { subtotal, discountAmount, gst, grand, gstBreakup } = computeTotals(quotation);
  const isPI = quotation.docType === 'proforma';
  const discount = quotation.discount || { type: 'percent', value: 0 };
  const extraCharges = quotation.extraCharges || [];

  const setDiscount = (patch) => onChange({ discount: { ...discount, ...patch } });
  const setExtraCharges = (list) => onChange({ extraCharges: list });
  const addCharge = (preset) => setExtraCharges([...extraCharges, { id: uid('ec'), label: preset?.label || 'Charge', amount: preset?.amount || 0, taxable: true }]);
  const updateCharge = (id, patch) => setExtraCharges(extraCharges.map(c => c.id === id ? { ...c, ...patch } : c));
  const removeCharge = (id) => setExtraCharges(extraCharges.filter(c => c.id !== id));

  const showDiscount = editable || discountAmount > 0;
  const showCharges = editable || extraCharges.length > 0;

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
            <div className="text-slate-500 mb-1">Extra charges:</div>
            {extraCharges.map(c => (
              <div key={c.id} className="flex justify-between items-center gap-1.5 py-0.5">
                {editable ? (
                  <TextInput value={c.label} onChange={v => updateCharge(c.id, { label: v })} className="flex-1 !py-0.5 text-xs" />
                ) : (
                  <span className="text-slate-500 text-xs">{c.label}</span>
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
        <div className="flex justify-between py-1.5 font-bold text-slate-800"><span>Grand Total:</span><span>₹ {fmt(grand)}</span></div>
      </div>
    </div>
  );
}
