import React, { useEffect, useRef } from 'react';
import { Check, Loader2, AlertCircle } from 'lucide-react';

/* ============================================================
   SMALL UI ATOMS — shared, presentation-only building blocks
   ============================================================ */

export function Field({ label, children, className = '', hint }) {
  return (
    <label className={`block ${className}`}>
      {label && <span className="block text-xs font-medium text-slate-500 mb-1">{label}</span>}
      {children}
      {hint && <span className="block text-[11px] text-slate-400 mt-0.5">{hint}</span>}
    </label>
  );
}

export const inputCls = "w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:border-transparent placeholder:text-slate-400";

export function TextInput({ value, onChange, placeholder, type = 'text', accent = 'slate', className = '', ...rest }) {
  return (
    <input
      type={type}
      value={value ?? ''}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={`${inputCls} focus:ring-${accent}-700 ${className}`}
      {...rest}
    />
  );
}

export function TextArea({ value, onChange, placeholder, rows = 2, accent = 'slate', className = '' }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      value={value ?? ''}
      placeholder={placeholder}
      rows={rows}
      onChange={(e) => onChange(e.target.value)}
      className={`${inputCls} focus:ring-${accent}-700 resize-none overflow-hidden ${className}`}
    />
  );
}

export function Btn({ children, onClick, variant = 'primary', accentClasses, className = '', type = 'button', disabled, title }) {
  const base = "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: accentClasses || 'bg-slate-900 text-white hover:bg-slate-800',
    ghost: 'bg-transparent text-slate-600 hover:bg-slate-100',
    outline: 'border border-slate-300 text-slate-700 hover:bg-slate-50 bg-white',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    subtleDanger: 'text-red-600 hover:bg-red-50',
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} title={title} className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
}

/** Editable Field — renders plain text when not editable, an input/
 * textarea when it is. The one control almost every document cell
 * and form field in this app is built from. */
export function EF({ editable, value, onChange, className = '', placeholder = '', multiline = false, accent = 'slate', rows = 2 }) {
  if (!editable) {
    return multiline
      ? <div className={`whitespace-pre-wrap ${className}`}>{value || ''}</div>
      : <span className={className}>{value || ''}</span>;
  }
  return multiline
    ? <TextArea value={value} onChange={onChange} placeholder={placeholder} accent={accent} className={className} rows={rows} />
    : <TextInput value={value} onChange={onChange} placeholder={placeholder} accent={accent} className={className} />;
}

export function AmitekLogo({ w = 150, dataUrl = null }) {
  if (dataUrl) {
    // eslint-disable-next-line jsx-a11y/alt-text
    return <img src={dataUrl} style={{ width: w, maxHeight: w * 0.5 }} className="mx-auto object-contain" alt="Company logo" />;
  }
  return (
    <svg viewBox="0 0 300 70" width={w} className="mx-auto">
      <rect x="0" y="0" width="300" height="70" rx="10" fill="#0f172a" />
      <text x="150" y="46" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="700" fontSize="34" letterSpacing="8" fill="#ffffff">AMITEK</text>
    </svg>
  );
}

export function SavingIndicator({ state }) {
  if (state === 'idle') return null;
  if (state === 'saving') return <span className="inline-flex items-center gap-1 text-xs text-slate-400"><Loader2 size={12} className="animate-spin" /> Saving…</span>;
  if (state === 'saved') return <span className="inline-flex items-center gap-1 text-xs text-emerald-600"><Check size={12} /> Saved</span>;
  if (state === 'error') return <span className="inline-flex items-center gap-1 text-xs text-red-600"><AlertCircle size={12} /> Couldn't save — changes may be lost</span>;
  return null;
}

/** Sets the A4 page orientation for the browser's native Print /
 * Save-as-PDF (Ctrl/Cmd+P), matching whatever the quotation's own
 * orientation choice is. Only one screen is ever mounted at a time,
 * so each one owns this independently. */
export function PrintOrientationStyle({ orientation = 'portrait' }) {
  return <style>{`@media print { @page { size: A4 ${orientation}; margin: 12mm; } }`}</style>;
}

/** Reads an <input type="file"> image selection into a data: URL,
 * suitable for storing directly in localStorage (logo / signature
 * images — small, infrequent, no server to upload to). */
export function readImageAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error('No file'));
    if (!file.type.startsWith('image/')) return reject(new Error('Please choose an image file'));
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
}
