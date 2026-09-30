import React, { useRef } from 'react';
import { FileText, History, Settings2, ArrowLeft, Download, Upload, SlidersHorizontal } from 'lucide-react';
import { SavingIndicator } from './ui/atoms';

export function TopNav({ div, view, setView, onSwitchDivision, savingState, onExport, onImportFile }) {
  const tabs = [
    { key: 'new', label: 'New Quotation', Icon: FileText },
    { key: 'history', label: 'History', Icon: History },
    { key: 'admin', label: 'Manage Systems', Icon: Settings2 },
    { key: 'settings', label: 'Settings', Icon: SlidersHorizontal },
  ];
  const fileInputRef = useRef(null);
  return (
    <div className="no-print sticky top-0 z-20 bg-white border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-3 sm:px-4">
        <div className="flex items-center justify-between h-14 gap-2">
          <button onClick={onSwitchDivision} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 text-sm shrink-0">
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">Switch</span>
          </button>
          <div className="flex items-center gap-2 min-w-0 flex-1 justify-center">
            <div.Icon className={div.text} size={18} />
            <span className="font-semibold text-slate-800 text-sm truncate">{div.label}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <SavingIndicator state={savingState} />
            <button onClick={onExport} title="Download a backup of all your Systems and quotations" className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded">
              <Download size={16} />
            </button>
            <button onClick={() => fileInputRef.current?.click()} title="Restore from a backup file" className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded">
              <Upload size={16} />
            </button>
            <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={(e) => { if (e.target.files?.[0]) onImportFile(e.target.files[0]); e.target.value = ''; }} />
          </div>
        </div>
        <div className="flex gap-1 -mb-px overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setView(t.key)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 whitespace-nowrap ${view === t.key ? `${div.border} ${div.text}` : 'border-transparent text-slate-400 hover:text-slate-600'}`}
            >
              <t.Icon size={15} /> {t.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
