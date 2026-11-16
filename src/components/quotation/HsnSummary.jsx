import React from 'react';
import { hsnSummary, fmt } from '../../lib/calc';

/** HSN/SAC-wise tax summary printed on a Proforma Invoice, as GST
 * invoices normally carry. Rows add up to the totals block above. */
export function HsnSummary({ quotation }) {
  const s = hsnSummary(quotation);
  if (!s.rows.length || !s.rate) return null;
  const igst = s.mode === 'igst';
  const th = 'border border-slate-300 bg-slate-100 px-2 py-1 text-[10.5px] font-semibold text-slate-600';
  const td = 'border border-slate-300 px-2 py-1 text-[11px] text-slate-700 tabular-nums';
  return (
    <div className="mt-4 avoid-break">
      <div className="text-xs font-semibold text-slate-600 mb-1">Tax summary (HSN/SAC-wise)</div>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={`${th} text-left`}>HSN/SAC</th>
            <th className={`${th} text-right`}>Taxable value (₹)</th>
            {igst
              ? <th className={`${th} text-right`}>IGST @ {s.rate}% (₹)</th>
              : <>
                  <th className={`${th} text-right`}>CGST @ {s.rate / 2}% (₹)</th>
                  <th className={`${th} text-right`}>SGST @ {s.rate / 2}% (₹)</th>
                </>}
            <th className={`${th} text-right`}>Total tax (₹)</th>
          </tr>
        </thead>
        <tbody>
          {s.rows.map(r => (
            <tr key={r.hsn}>
              <td className={`${td} font-mono`}>{r.hsn}</td>
              <td className={`${td} text-right`}>{fmt(r.taxable)}</td>
              {igst
                ? <td className={`${td} text-right`}>{fmt(r.igst)}</td>
                : <><td className={`${td} text-right`}>{fmt(r.cgst)}</td><td className={`${td} text-right`}>{fmt(r.sgst)}</td></>}
              <td className={`${td} text-right`}>{fmt(r.tax)}</td>
            </tr>
          ))}
          <tr className="font-semibold">
            <td className={td}>Total</td>
            <td className={`${td} text-right`}>{fmt(s.total.taxable)}</td>
            {igst
              ? <td className={`${td} text-right`}>{fmt(s.total.igst)}</td>
              : <><td className={`${td} text-right`}>{fmt(s.total.cgst)}</td><td className={`${td} text-right`}>{fmt(s.total.sgst)}</td></>}
            <td className={`${td} text-right`}>{fmt(s.total.tax)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
