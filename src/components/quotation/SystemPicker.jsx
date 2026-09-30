import React, { useState } from 'react';
import { Search, FilePlus2, Heading } from 'lucide-react';

export function SystemPicker({ systems, onAdd, onAddBlank, onAddSection, div }) {
  const [q, setQ] = useState('');
  const filtered = systems.filter(s => s.name.toLowerCase().includes(q.toLowerCase()));

  // Group by category so a division with many Systems (Nano Topping,
  // Lime, Araish, Under-Tile, Nano Pore, Swimming Pool…) stays easy to
  // scan while picking — collapses to one flat group while searching.
  const groups = [];
  if (q.trim()) {
    groups.push([null, filtered]);
  } else {
    const map = new Map();
    for (const s of filtered) {
      const cat = s.category || 'Other';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat).push(s);
    }
    for (const entry of map) groups.push(entry);
  }

  return (
    <div className="border border-dashed border-slate-300 rounded-lg p-3 mb-4 no-print">
      <div className="flex items-center gap-2 mb-2">
        <Search size={14} className="text-slate-400" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search systems to add…" className="flex-1 text-sm focus:outline-none" />
        <button onClick={onAddSection} title="Add a section heading to group the rows below it (e.g. Hotel Block, Villa Block)" className="shrink-0 flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-full border border-dashed border-slate-400 text-slate-500 hover:bg-slate-50">
          <Heading size={13} /> Section heading
        </button>
        <button onClick={onAddBlank} title="Add a one-off row not tied to any saved System" className={`shrink-0 flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-full border border-dashed ${div.border} ${div.text} hover:bg-slate-50`}>
          <FilePlus2 size={13} /> Blank row
        </button>
      </div>
      <div className="max-h-48 overflow-y-auto space-y-2">
        {groups.map(([cat, list]) => (
          <div key={cat || '_flat'}>
            {cat && <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">{cat}</div>}
            <div className="flex flex-wrap gap-1.5">
              {list.map(s => (
                <button key={s.id} onClick={() => onAdd(s)} className={`text-xs px-2.5 py-1.5 rounded-full border ${div.border} ${div.text} hover:${div.bg} hover:text-white transition-colors`}>
                  + {s.name}
                </button>
              ))}
            </div>
          </div>
        ))}
        {filtered.length === 0 && <span className="text-xs text-slate-400">No matching systems. Add one under "Manage Systems".</span>}
      </div>
    </div>
  );
}
