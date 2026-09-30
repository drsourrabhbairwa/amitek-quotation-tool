import React from 'react';
import { EF } from '../ui/atoms';

export function ClientCard({ client, onChange, editable, div }) {
  const accent = div.key === 'sf' ? 'amber' : 'teal';
  return (
    <div className="border border-slate-200 rounded-md p-3 mb-3 avoid-break">
      <div className="text-xs font-semibold text-slate-500 mb-1.5">👤 CLIENT DETAILS</div>
      <div className="space-y-1">
        <EF editable={editable} value={client.name} onChange={(v) => onChange({ ...client, name: v })} placeholder="Client / Project name" className="font-semibold text-slate-800 text-sm" accent={accent} />
        <EF editable={editable} value={client.contact} onChange={(v) => onChange({ ...client, contact: v })} placeholder="Contact person" className="text-sm text-slate-600" accent={accent} />
        <EF editable={editable} value={client.address} onChange={(v) => onChange({ ...client, address: v })} placeholder="Address" className="text-sm text-slate-600" multiline accent={accent} />
        <EF editable={editable} value={client.phone} onChange={(v) => onChange({ ...client, phone: v })} placeholder="Phone / Email" className="text-sm text-slate-600" accent={accent} />
        <EF editable={editable} value={client.state} onChange={(v) => onChange({ ...client, state: v })} placeholder="State (for GST place of supply — e.g. Rajasthan)" className="text-sm text-slate-600" accent={accent} />
      </div>
    </div>
  );
}
