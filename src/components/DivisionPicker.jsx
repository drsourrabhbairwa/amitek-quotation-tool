import React from 'react';
import { ChevronRight } from 'lucide-react';
import { DIVISIONS } from '../lib/constants';
import { AmitekLogo } from './ui/atoms';

export function DivisionPicker({ onPick }) {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6 bg-slate-50">
      <div className="max-w-xl w-full">
        <div className="text-center mb-8">
          <AmitekLogo w={170} />
          <h1 className="mt-4 text-2xl font-bold text-slate-800">Amitek Paint and Coating</h1>
          <p className="text-sm text-slate-500 mt-1">Choose a division to continue</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {Object.values(DIVISIONS).map((d) => (
            <button
              key={d.key}
              onClick={() => onPick(d.key)}
              className={`group text-left rounded-xl border-2 border-slate-200 hover:border-transparent p-5 bg-white hover:${d.bg} transition-colors shadow-sm hover:shadow-md`}
            >
              <d.Icon className={`${d.text} group-hover:text-white`} size={28} strokeWidth={1.75} />
              <div className="mt-3 font-semibold text-slate-800 group-hover:text-white">{d.label}</div>
              <div className="mt-1 text-xs text-slate-400 group-hover:text-white/80">APP Paints Chemicals Pvt. LTD.</div>
              <div className="mt-3 flex items-center gap-1 text-xs font-medium text-slate-400 group-hover:text-white/90">
                Open <ChevronRight size={14} />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
