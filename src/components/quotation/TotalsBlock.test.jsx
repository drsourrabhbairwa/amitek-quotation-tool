import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { TotalsBlock } from './TotalsBlock';

const q = (advance, docType = 'quotation') => ({
  docType, gstPercent: 18, client: { state: 'Rajasthan' },
  lineItems: [{ itemType: 'line', area: 100, rate: 100 }],
  advance,
});

describe('TotalsBlock advance section', () => {
  it('shows payments, total advance and balance in the read-only (print) view for both doc types', () => {
    const adv = { enabled: true, payments: [{ id: 'a', date: '2026-11-05', amount: 5000, mode: 'UPI', ref: 'UTR123' }] };
    for (const docType of ['quotation', 'proforma']) {
      const html = renderToStaticMarkup(<TotalsBlock quotation={q(adv, docType)} editable={false} onChange={() => {}} />);
      expect(html).toContain('05-11-2026');
      expect(html).toContain('UTR123');
      expect(html).toContain('Balance Payable');
      expect(html).toContain('6800.00');
    }
  });
  it('shows nothing advance-related when switched off, or on with no amount (print view)', () => {
    for (const adv of [{ enabled: false, payments: [{ id: 'a', amount: 5000 }] }, { enabled: true, payments: [] }, undefined]) {
      const html = renderToStaticMarkup(<TotalsBlock quotation={q(adv)} editable={false} onChange={() => {}} />);
      expect(html).not.toContain('Balance Payable');
    }
  });
  it('offers the switch in the editor', () => {
    const html = renderToStaticMarkup(<TotalsBlock quotation={q({ enabled: false, payments: [] })} editable onChange={() => {}} />);
    expect(html).toContain('Show advance payment received');
  });
});
