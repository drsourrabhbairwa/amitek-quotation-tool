import React from 'react';

export function BankDetailsBlock({ bank, div }) {
  if (!bank || bank.showOnQuotation === false) return null;
  return (
    <div className="mt-4 border-t border-dashed border-slate-200 pt-3 text-[11px] text-slate-500 avoid-break">
      <div className="font-semibold text-slate-600 text-xs mb-1">Bank Details</div>
      <div>BANK: {bank.bankName} | A/C HOLDER: {bank.accountHolder}</div>
      <div>A/C No: {bank.accountNo} | IFSC: {bank.ifsc}</div>
      <div>Branch: {bank.branch} | Type: {bank.accountType}</div>
    </div>
  );
}
