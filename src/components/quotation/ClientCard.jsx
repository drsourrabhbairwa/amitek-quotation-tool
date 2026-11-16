import React, { useState } from 'react';
import { EF, TextInput } from '../ui/atoms';
import { suggestClients, CLIENT_FIELDS } from '../../lib/clients';

/** Client / Project name with suggestions from the client master: picking
 * one fills contact, address, phone, state and GSTIN from that client's
 * most recent quotation. Typing a new name simply makes a new client. */
function ClientNameInput({ value, onChange, onPick, clients, accent }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const list = open ? suggestClients(clients || [], value) : [];

  const pick = (c) => { onPick(c); setOpen(false); };

  return (
    <div className="relative">
      <TextInput
        value={value}
        onChange={(v) => { onChange(v); setOpen(true); setActive(0); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (!list.length) return;
          if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => (a + 1) % list.length); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => (a - 1 + list.length) % list.length); }
          else if (e.key === 'Enter') { e.preventDefault(); pick(list[active]); }
          else if (e.key === 'Escape') setOpen(false);
        }}
        placeholder="Client / Project name — type to search saved clients"
        className="font-semibold text-slate-800 text-sm"
        accent={accent}
        autoComplete="off"
        role="combobox"
        aria-expanded={list.length > 0}
        aria-autocomplete="list"
      />
      {list.length > 0 && (
        <ul role="listbox" className="no-print absolute z-30 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-md shadow-lg overflow-hidden">
          {list.map((c, i) => (
            <li key={c.key} role="option" aria-selected={i === active}>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); pick(c); }}
                onMouseEnter={() => setActive(i)}
                className={`w-full text-left px-3 py-2 ${i === active ? 'bg-slate-50' : ''}`}
              >
                <div className="text-sm font-medium text-slate-800">{c.details.name}</div>
                <div className="text-[11px] text-slate-400 truncate">
                  {[c.details.contact, c.details.phone, c.details.state].filter(Boolean).join(' · ') || 'No other details yet'}
                  {` · ${c.items.length} quotation${c.items.length === 1 ? '' : 's'}`}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ClientCard({ client, onChange, editable, div, clients }) {
  const accent = div.key === 'sf' ? 'amber' : 'teal';
  const fill = (c) => {
    const next = { ...client };
    for (const f of CLIENT_FIELDS) if (c.details[f]) next[f] = c.details[f];
    onChange(next);
  };
  return (
    <div className="border border-slate-200 rounded-md p-3 mb-3 avoid-break">
      <div className="text-xs font-semibold text-slate-500 mb-1.5">👤 CLIENT DETAILS</div>
      <div className="space-y-1">
        {editable
          ? <ClientNameInput value={client.name} onChange={(v) => onChange({ ...client, name: v })} onPick={fill} clients={clients} accent={accent} />
          : <EF editable={false} value={client.name} className="font-semibold text-slate-800 text-sm" />}
        <EF editable={editable} value={client.contact} onChange={(v) => onChange({ ...client, contact: v })} placeholder="Contact person" className="text-sm text-slate-600" accent={accent} />
        <EF editable={editable} value={client.address} onChange={(v) => onChange({ ...client, address: v })} placeholder="Address" className="text-sm text-slate-600" multiline accent={accent} />
        <EF editable={editable} value={client.phone} onChange={(v) => onChange({ ...client, phone: v })} placeholder="Phone / Email" className="text-sm text-slate-600" accent={accent} />
        <EF editable={editable} value={client.state} onChange={(v) => onChange({ ...client, state: v })} placeholder="State (for GST place of supply — e.g. Rajasthan)" className="text-sm text-slate-600" accent={accent} />
        {editable
          ? <EF editable value={client.gstin} onChange={(v) => onChange({ ...client, gstin: v.toUpperCase() })} placeholder="Client GSTIN (optional)" className="text-sm text-slate-600 font-mono" accent={accent} />
          : client.gstin ? <div className="text-sm text-slate-600">GSTIN: <span className="font-mono">{client.gstin}</span></div> : null}
      </div>
    </div>
  );
}
