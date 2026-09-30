import React from 'react';
import { EF } from '../ui/atoms';

/** Optional "Ship To" / delivery logistics card — off by default, toggled
 * on per-quotation from the "Show shipping & delivery" checkbox in the
 * builder toolbar (same pattern as the Applicator/Contractor card). */
export function ShippingDeliveryBlock({ shipping, onChange, editable, div }) {
  const accent = div.key === 'sf' ? 'amber' : 'teal';
  const s = shipping || {};
  const set = (patch) => onChange({ ...s, ...patch });
  return (
    <div className="border border-slate-200 rounded-md p-3 mb-3 avoid-break">
      <div className="text-xs font-semibold text-slate-500 mb-1.5">🚚 SHIPPING &amp; DELIVERY</div>
      <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1">
        <EF editable={editable} value={s.consigneeName} onChange={(v) => set({ consigneeName: v })} placeholder="Consignee / Ship-to name (if different from client)" className="text-sm text-slate-600" accent={accent} />
        <EF editable={editable} value={s.mode} onChange={(v) => set({ mode: v })} placeholder="Mode of transport (Road / Courier / By hand)" className="text-sm text-slate-600" accent={accent} />
        <EF editable={editable} value={s.address} onChange={(v) => set({ address: v })} placeholder="Delivery address (if different from client address)" className="text-sm text-slate-600 sm:col-span-2" multiline accent={accent} />
        <EF editable={editable} value={s.deliveryTimeline} onChange={(v) => set({ deliveryTimeline: v })} placeholder="Delivery timeline (e.g. 7-10 working days from PO)" className="text-sm text-slate-600" accent={accent} />
        <EF editable={editable} value={s.freightTerms} onChange={(v) => set({ freightTerms: v })} placeholder="Freight terms (e.g. Freight extra as per actuals)" className="text-sm text-slate-600" accent={accent} />
        <EF editable={editable} value={s.notes} onChange={(v) => set({ notes: v })} placeholder="Additional shipping notes" className="text-sm text-slate-600 sm:col-span-2" multiline accent={accent} />
      </div>
    </div>
  );
}
