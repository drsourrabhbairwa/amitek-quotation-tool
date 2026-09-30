import React from 'react';
import { AmitekLogo } from '../ui/atoms';

export function LetterheadHeader({ div, letterhead, refNo, date, editable, onDateChange, docType }) {
  const lh = letterhead || {};
  const heading = docType === 'proforma' ? 'PROFORMA INVOICE' : 'QUOTATION';
  return (
    <div className="border-b-2 border-slate-800 pb-3 mb-4 avoid-break">
      <div className="flex justify-center mb-3"><AmitekLogo w={190} dataUrl={lh.logoDataUrl} /></div>
      <div className="flex flex-col sm:flex-row sm:justify-between gap-2">
        <div>
          <div className="font-bold text-slate-800">{lh.divisionLabel || div.label}</div>
          <div className={`text-xs font-semibold ${div.text}`}>{lh.legalName}</div>
          <div className="text-[11px] text-slate-500">GSTIN: {lh.gstin}</div>
          <div className="text-[11px] text-slate-500">Websites: {lh.website}</div>
          <div className="text-[11px] text-slate-500 mt-1">{lh.address}</div>
          <div className="text-[11px] text-slate-500">Contact: {lh.contact}{lh.email ? ` | Email: ${lh.email}` : ''}</div>
        </div>
        <div className="sm:text-right shrink-0">
          <div className="font-bold text-slate-800 tracking-wide">{heading}</div>
          <div className="text-xs text-slate-500 font-mono">Ref No: {refNo || 'will be assigned on save'}</div>
          <div className="text-xs text-slate-500 flex sm:justify-end items-center gap-1">
            Date: {editable
              ? <input type="text" value={date} onChange={e => onDateChange(e.target.value)} className="border-b border-slate-300 focus:outline-none w-24 text-xs" />
              : <span>{date}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
