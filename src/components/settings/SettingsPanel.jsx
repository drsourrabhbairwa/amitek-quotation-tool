import React, { useState, useRef } from 'react';
import { Plus, Trash2, Upload, ImageOff, Star, FileText, Landmark, Percent, Palette } from 'lucide-react';
import { Field, TextInput, TextArea, Btn, readImageAsDataUrl } from '../ui/atoms';
import { uid } from '../../lib/ids';

/* ============================================================
   SETTINGS — per-division, no-code customization
   Letterhead · Bank & Signatory · Terms Templates · Tax & Charges
   Every change here only affects quotations created AFTER the
   change (existing quotations keep their own snapshot) — a note to
   that effect is shown at the top of each tab.
   ============================================================ */

const NOTE = "Changes here apply to new quotations. Quotations you've already saved keep the letterhead, bank, terms and numbering they were created with.";

function SectionNote() {
  return <p className="text-xs text-slate-400 mb-4">{NOTE}</p>;
}

function ImagePicker({ label, dataUrl, onPick, onClear, accent, height = 60 }) {
  const ref = useRef(null);
  const [error, setError] = useState('');
  const handle = async (file) => {
    setError('');
    try { onPick(await readImageAsDataUrl(file)); }
    catch (e) { setError(e.message); }
  };
  return (
    <Field label={label}>
      <div className="flex items-center gap-3">
        <div className="border border-dashed border-slate-300 rounded-md flex items-center justify-center bg-slate-50 shrink-0" style={{ width: height * 2.4, height }}>
          {dataUrl ? <img src={dataUrl} alt={label} className="max-h-full max-w-full object-contain" /> : <ImageOff size={16} className="text-slate-300" />}
        </div>
        <div className="flex flex-col gap-1.5">
          <Btn variant="outline" onClick={() => ref.current?.click()}><Upload size={13} /> {dataUrl ? 'Replace' : 'Upload'}</Btn>
          {dataUrl && <Btn variant="ghost" onClick={onClear} className="!text-red-600 text-xs">Remove</Btn>}
          <input ref={ref} type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) handle(e.target.files[0]); e.target.value = ''; }} />
        </div>
      </div>
      {error && <span className="text-xs text-red-600 mt-1 block">{error}</span>}
    </Field>
  );
}

function LetterheadTab({ settings, patch, div }) {
  const accent = div.accent;
  const lh = settings.letterhead;
  const setLh = (p) => patch({ letterhead: { ...lh, ...p } });
  const ci = settings.companyIdentity || {};
  const setCi = (p) => patch({ companyIdentity: { ...ci, ...p } });
  return (
    <div className="space-y-4 max-w-2xl">
      <SectionNote />
      <ImagePicker label="Logo (shown at the top of every quotation)" dataUrl={lh.logoDataUrl} onPick={(url) => setLh({ logoDataUrl: url })} onClear={() => setLh({ logoDataUrl: null })} accent={accent} height={70} />
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Division name (shown on quotations)"><TextInput value={lh.divisionLabel} onChange={v => setLh({ divisionLabel: v })} accent={accent} /></Field>
        <Field label="Legal company name"><TextInput value={lh.legalName} onChange={v => setLh({ legalName: v })} accent={accent} /></Field>
        <Field label="GSTIN"><TextInput value={lh.gstin} onChange={v => setLh({ gstin: v })} accent={accent} /></Field>
        <Field label="Website(s)"><TextInput value={lh.website} onChange={v => setLh({ website: v })} accent={accent} /></Field>
        <Field label="Contact number(s)"><TextInput value={lh.contact} onChange={v => setLh({ contact: v })} accent={accent} /></Field>
        <Field label="Email"><TextInput type="email" value={lh.email} onChange={v => setLh({ email: v })} accent={accent} /></Field>
      </div>
      <Field label="Address"><TextArea value={lh.address} onChange={v => setLh({ address: v })} rows={2} accent={accent} /></Field>

      <div className="pt-4 border-t border-slate-100">
        <div className="font-medium text-slate-700 text-sm mb-1">Alternate letterhead — parent company</div>
        <p className="text-xs text-slate-500 mb-3">
          A quotation's "Print as" toolbar option can print under this identity instead of {div.label} — e.g. to send it as Amitek Paint and Coating / APP Paints Chemicals Pvt. LTD. rather than either division by name.
        </p>
        <ImagePicker label="Logo" dataUrl={ci.logoDataUrl} onPick={(url) => setCi({ logoDataUrl: url })} onClear={() => setCi({ logoDataUrl: null })} accent={accent} height={70} />
        <div className="grid sm:grid-cols-2 gap-3 mt-3">
          <Field label="Heading (shown on quotations)"><TextInput value={ci.divisionLabel} onChange={v => setCi({ divisionLabel: v })} accent={accent} /></Field>
          <Field label="Legal company name"><TextInput value={ci.legalName} onChange={v => setCi({ legalName: v })} accent={accent} /></Field>
          <Field label="GSTIN"><TextInput value={ci.gstin} onChange={v => setCi({ gstin: v })} accent={accent} /></Field>
          <Field label="Website(s)"><TextInput value={ci.website} onChange={v => setCi({ website: v })} accent={accent} /></Field>
          <Field label="Contact number(s)"><TextInput value={ci.contact} onChange={v => setCi({ contact: v })} accent={accent} /></Field>
          <Field label="Email"><TextInput type="email" value={ci.email} onChange={v => setCi({ email: v })} accent={accent} /></Field>
        </div>
        <Field label="Address" className="mt-3"><TextArea value={ci.address} onChange={v => setCi({ address: v })} rows={2} accent={accent} /></Field>
      </div>
    </div>
  );
}

function BankSignatoryTab({ settings, patch, div }) {
  const accent = div.accent;
  const bank = settings.bank;
  const setBank = (p) => patch({ bank: { ...bank, ...p } });
  const signatories = settings.signatories || [];
  const defaultId = settings.defaultSignatoryId || signatories[0]?.id;

  const updateSig = (id, p) => patch({ signatories: signatories.map(s => s.id === id ? { ...s, ...p } : s) });
  const addSig = () => patch({ signatories: [...signatories, { id: uid('sig'), name: '', role: '' }] });
  const removeSig = (id) => {
    const next = signatories.filter(s => s.id !== id);
    patch({ signatories: next.length ? next : [{ id: uid('sig'), name: '', role: '' }], defaultSignatoryId: defaultId === id ? null : defaultId });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <SectionNote />
      <div>
        <div className="flex items-center gap-1.5 font-medium text-slate-700 text-sm mb-2"><Landmark size={15} /> Bank Details</div>
        <label className="flex items-center gap-1.5 text-xs text-slate-500 mb-2">
          <input type="checkbox" checked={bank.showOnQuotation !== false} onChange={e => setBank({ showOnQuotation: e.target.checked })} />
          Show bank details on quotations
        </label>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Bank name"><TextInput value={bank.bankName} onChange={v => setBank({ bankName: v })} accent={accent} /></Field>
          <Field label="Account holder"><TextInput value={bank.accountHolder} onChange={v => setBank({ accountHolder: v })} accent={accent} /></Field>
          <Field label="Account number"><TextInput value={bank.accountNo} onChange={v => setBank({ accountNo: v })} accent={accent} /></Field>
          <Field label="IFSC"><TextInput value={bank.ifsc} onChange={v => setBank({ ifsc: v })} accent={accent} /></Field>
          <Field label="Branch"><TextInput value={bank.branch} onChange={v => setBank({ branch: v })} accent={accent} /></Field>
          <Field label="Account type"><TextInput value={bank.accountType} onChange={v => setBank({ accountType: v })} accent={accent} /></Field>
        </div>
      </div>

      <div className="pt-4 border-t border-slate-100">
        <div className="font-medium text-slate-700 text-sm mb-2">Signatories</div>
        <ImagePicker label="Signature / stamp image (optional)" dataUrl={settings.signatureImageDataUrl} onPick={(url) => patch({ signatureImageDataUrl: url })} onClear={() => patch({ signatureImageDataUrl: null })} accent={accent} />
        <div className="space-y-2 mt-3">
          {signatories.map(s => (
            <div key={s.id} className="flex items-center gap-2 border border-slate-200 rounded-md p-2 bg-white">
              <button onClick={() => patch({ defaultSignatoryId: s.id })} title={s.id === defaultId ? 'Default signatory' : 'Set as default'} className={s.id === defaultId ? 'text-amber-500' : 'text-slate-300 hover:text-slate-500'}>
                <Star size={15} fill={s.id === defaultId ? 'currentColor' : 'none'} />
              </button>
              <TextInput value={s.name} onChange={v => updateSig(s.id, { name: v })} placeholder="Name" accent={accent} className="flex-1" />
              <TextInput value={s.role} onChange={v => updateSig(s.id, { role: v })} placeholder="Role / title" accent={accent} className="flex-1" />
              <button onClick={() => removeSig(s.id)} className="text-slate-300 hover:text-red-600 shrink-0"><Trash2 size={15} /></button>
            </div>
          ))}
        </div>
        <Btn variant="outline" onClick={addSig} className="mt-2"><Plus size={13} /> Add signatory</Btn>
      </div>
    </div>
  );
}

function TermsTemplatesTab({ settings, patch, div }) {
  const accent = div.accent;
  const templates = settings.termsTemplates || [];
  const defaultId = settings.defaultTermsTemplateId || templates[0]?.id;
  const [openId, setOpenId] = useState(templates[0]?.id || null);

  const updateTemplate = (id, p) => patch({ termsTemplates: templates.map(t => t.id === id ? { ...t, ...p } : t) });
  const addTemplate = () => {
    const t = { id: uid('tt'), name: `Template ${templates.length + 1}`, boxes: [{ id: uid('box'), title: 'New Section', content: '' }] };
    patch({ termsTemplates: [...templates, t] });
    setOpenId(t.id);
  };
  const duplicateTemplate = (id) => {
    const src = templates.find(t => t.id === id);
    if (!src) return;
    const copy = { id: uid('tt'), name: `${src.name} (copy)`, boxes: src.boxes.map(b => ({ ...b, id: uid('box') })) };
    patch({ termsTemplates: [...templates, copy] });
    setOpenId(copy.id);
  };
  const removeTemplate = (id) => {
    const next = templates.filter(t => t.id !== id);
    if (!next.length) return; // always keep at least one
    patch({ termsTemplates: next, defaultTermsTemplateId: defaultId === id ? null : defaultId });
    if (openId === id) setOpenId(next[0].id);
  };

  const updateBox = (tId, bId, p) => updateTemplate(tId, { boxes: templates.find(t => t.id === tId).boxes.map(b => b.id === bId ? { ...b, ...p } : b) });
  const addBox = (tId) => updateTemplate(tId, { boxes: [...templates.find(t => t.id === tId).boxes, { id: uid('box'), title: 'New Section', content: '' }] });
  const removeBox = (tId, bId) => updateTemplate(tId, { boxes: templates.find(t => t.id === tId).boxes.filter(b => b.id !== bId) });

  return (
    <div className="max-w-2xl">
      <SectionNote />
      <p className="text-xs text-slate-500 mb-3">Save reusable Terms &amp; Conditions sets, then pick one per quotation (or free-edit the text directly on any quotation — that never changes the saved template).</p>
      <div className="space-y-2">
        {templates.map(t => (
          <div key={t.id} className="border border-slate-200 rounded-lg bg-white">
            <div className="flex items-center gap-2 p-2.5">
              <button onClick={() => patch({ defaultTermsTemplateId: t.id })} title={t.id === defaultId ? 'Default template' : 'Set as default'} className={t.id === defaultId ? 'text-amber-500 shrink-0' : 'text-slate-300 hover:text-slate-500 shrink-0'}>
                <Star size={15} fill={t.id === defaultId ? 'currentColor' : 'none'} />
              </button>
              <TextInput value={t.name} onChange={v => updateTemplate(t.id, { name: v })} accent={accent} className="flex-1" />
              <span className="text-[11px] text-slate-400 shrink-0">{t.boxes.length} section{t.boxes.length === 1 ? '' : 's'}</span>
              <Btn variant="ghost" onClick={() => setOpenId(openId === t.id ? null : t.id)} className="!px-2 text-xs shrink-0">{openId === t.id ? 'Collapse' : 'Edit'}</Btn>
              <Btn variant="ghost" onClick={() => duplicateTemplate(t.id)} className="!px-2 text-xs shrink-0">Duplicate</Btn>
              {templates.length > 1 && <button onClick={() => removeTemplate(t.id)} className="text-slate-300 hover:text-red-600 shrink-0"><Trash2 size={15} /></button>}
            </div>
            {openId === t.id && (
              <div className="border-t border-slate-100 p-2.5 space-y-2.5">
                {t.boxes.map(b => (
                  <div key={b.id} className="border border-slate-100 rounded-md p-2 bg-slate-50">
                    <div className="flex items-center gap-2 mb-1.5">
                      <TextInput value={b.title} onChange={v => updateBox(t.id, b.id, { title: v })} placeholder="Section title" accent={accent} className="flex-1" />
                      <button onClick={() => removeBox(t.id, b.id)} className="text-slate-300 hover:text-red-600 shrink-0"><Trash2 size={14} /></button>
                    </div>
                    <TextArea value={b.content} onChange={v => updateBox(t.id, b.id, { content: v })} rows={3} accent={accent} />
                  </div>
                ))}
                <Btn variant="outline" onClick={() => addBox(t.id)}><Plus size={13} /> Add section</Btn>
              </div>
            )}
          </div>
        ))}
      </div>
      <Btn variant="outline" onClick={addTemplate} className="mt-3"><Plus size={14} /> New template</Btn>
    </div>
  );
}

function TaxChargesTab({ settings, patch, div }) {
  const accent = div.accent;
  const tax = settings.tax;
  const setTax = (p) => patch({ tax: { ...tax, ...p } });
  const presets = tax.extraChargePresets || [];
  const updatePreset = (id, p) => setTax({ extraChargePresets: presets.map(x => x.id === id ? { ...x, ...p } : x) });
  const addPreset = () => setTax({ extraChargePresets: [...presets, { id: uid('ec'), label: 'New charge', amount: 0 }] });
  const removePreset = (id) => setTax({ extraChargePresets: presets.filter(x => x.id !== id) });

  return (
    <div className="max-w-2xl space-y-6">
      <SectionNote />
      <div>
        <div className="flex items-center gap-1.5 font-medium text-slate-700 text-sm mb-2"><Percent size={15} /> Tax &amp; discount defaults</div>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Default GST %"><TextInput type="number" value={tax.defaultGstPercent} onChange={v => setTax({ defaultGstPercent: v })} accent={accent} /></Field>
          <Field label="Default discount">
            <div className="flex gap-1.5">
              <TextInput type="number" value={tax.defaultDiscount.value} onChange={v => setTax({ defaultDiscount: { ...tax.defaultDiscount, value: v } })} accent={accent} />
              <select value={tax.defaultDiscount.type} onChange={e => setTax({ defaultDiscount: { ...tax.defaultDiscount, type: e.target.value } })} className="text-sm border border-slate-300 rounded-md px-2">
                <option value="percent">%</option>
                <option value="flat">₹ flat</option>
              </select>
            </div>
          </Field>
        </div>
      </div>

      <div className="pt-4 border-t border-slate-100">
        <div className="font-medium text-slate-700 text-sm mb-2">Extra charge presets</div>
        <p className="text-xs text-slate-500 mb-2">Quick-add buttons that appear under Extra Charges on every quotation (e.g. Transportation, Labour). Amounts can still be edited per quotation.</p>
        <div className="space-y-2">
          {presets.map(p => (
            <div key={p.id} className="flex items-center gap-2">
              <TextInput value={p.label} onChange={v => updatePreset(p.id, { label: v })} className="flex-1" accent={accent} />
              <TextInput type="number" value={p.amount} onChange={v => updatePreset(p.id, { amount: v })} className="w-28" accent={accent} />
              <button onClick={() => removePreset(p.id)} className="text-slate-300 hover:text-red-600 shrink-0"><Trash2 size={15} /></button>
            </div>
          ))}
        </div>
        <Btn variant="outline" onClick={addPreset} className="mt-2"><Plus size={13} /> Add preset</Btn>
      </div>

      <div className="pt-4 border-t border-slate-100">
        <div className="font-medium text-slate-700 text-sm mb-2">Numbering</div>
        <p className="text-xs text-slate-500 mb-2">Quotations and Proforma Invoices are numbered in two separate series, each resetting to 001 every new year (e.g. PREFIX/2026/001).</p>
        <div className="grid sm:grid-cols-2 gap-3 max-w-xl">
          <Field label="Quotation prefix">
            <TextInput value={settings.numberingPrefix} onChange={v => patch({ numberingPrefix: v })} accent={accent} />
          </Field>
          <Field label="Proforma Invoice prefix">
            <TextInput value={settings.piNumberingPrefix} onChange={v => patch({ piNumberingPrefix: v })} accent={accent} />
          </Field>
        </div>
      </div>

      {div.key === 'sf' && (
        <div className="pt-4 border-t border-slate-100">
          <div className="flex items-center gap-1.5 font-medium text-slate-700 text-sm mb-2"><Palette size={15} /> Columns</div>
          <label className="flex items-center gap-1.5 text-xs text-slate-500">
            <input type="checkbox" checked={settings.colorColumnEnabled} onChange={e => patch({ colorColumnEnabled: e.target.checked })} />
            New quotations show the Color / Pigment column by default
          </label>
        </div>
      )}
    </div>
  );
}

export function SettingsPanel({ div, settings, onChange }) {
  const [tab, setTab] = useState('letterhead');
  const patch = (p) => onChange({ ...settings, ...p });
  const tabs = [
    { key: 'letterhead', label: 'Letterhead', Icon: FileText },
    { key: 'bank', label: 'Bank & Signatory', Icon: Landmark },
    { key: 'terms', label: 'Terms Templates', Icon: FileText },
    { key: 'tax', label: 'Tax & Charges', Icon: Percent },
  ];
  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-5">
      <h2 className="font-semibold text-slate-800 mb-1">Settings — {div.label}</h2>
      <p className="text-xs text-slate-500 mb-4">No code needed — everything here is stored right in this browser, same as your Systems and quotations.</p>
      <div className="flex gap-1 border-b border-slate-200 mb-5 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 whitespace-nowrap ${tab === t.key ? `${div.border} ${div.text}` : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
            <t.Icon size={14} /> {t.label}
          </button>
        ))}
      </div>
      {tab === 'letterhead' && <LetterheadTab settings={settings} patch={patch} div={div} />}
      {tab === 'bank' && <BankSignatoryTab settings={settings} patch={patch} div={div} />}
      {tab === 'terms' && <TermsTemplatesTab settings={settings} patch={patch} div={div} />}
      {tab === 'tax' && <TaxChargesTab settings={settings} patch={patch} div={div} />}
    </div>
  );
}
