import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { DIVISIONS } from './lib/constants';
import { blankQuotation, convertToProformaInvoice } from './lib/model';
import { loadDivisionData, saveDivisionData, exportBackup, importBackupFile } from './lib/storage';
import { Btn } from './components/ui/atoms';
import { DivisionPicker } from './components/DivisionPicker';
import { TopNav } from './components/TopNav';
import { AdminPanel } from './components/admin/AdminPanel';
import { QuotationBuilder } from './components/QuotationBuilder';
import { QuotationHistory } from './components/QuotationHistory';
import { SettingsPanel } from './components/settings/SettingsPanel';

const PRINT_STYLES = `
@media print {
  .no-print { display: none !important; }
  body { background: white !important; }
  .print-area { border: none !important; box-shadow: none !important; padding: 0 !important; }
  input, textarea { border: none !important; background: transparent !important; padding: 0 !important; resize: none; }
  /* The on-screen table has a min-width (900-1000px) so it stays usable
     while editing, wider than a portrait A4 page's printable area. For
     print, drop that floor and shrink cell padding/font slightly so the
     browser's own table layout fits every column on the page instead of
     clipping the right-hand ones off. */
  .overflow-x-auto { overflow: visible !important; }
  table { page-break-inside: auto; border-collapse: collapse; width: 100% !important; min-width: 0 !important; table-layout: fixed !important; font-size: 9px !important; }
  th, td { padding: 3px 4px !important; overflow-wrap: break-word; word-break: break-word; }
  tr { page-break-inside: avoid; break-inside: avoid; }
  thead { display: table-header-group; }
  tfoot { display: table-footer-group; }
  .avoid-break { page-break-inside: avoid; break-inside: avoid; }
  input:focus, textarea:focus, select:focus { box-shadow: none !important; outline: none !important; }
}
`;

export default function App() {
  const [division, setDivision] = useState(null);
  const [view, setView] = useState('new');
  const [data, setData] = useState({ sf: null, wp: null });
  const [loading, setLoading] = useState(true);
  const [savingState, setSavingState] = useState('idle');
  const [draft, setDraft] = useState(null);
  const savingTimer = useRef(null);

  useEffect(() => {
    (async () => {
      const [sf, wp] = await Promise.all([loadDivisionData('sf'), loadDivisionData('wp')]);
      setData({ sf, wp });
      setLoading(false);
    })();
  }, []);

  const persist = useCallback(async (divKey, newDivData) => {
    setSavingState('saving');
    const ok = await saveDivisionData(divKey, newDivData);
    setSavingState(ok ? 'saved' : 'error');
    if (savingTimer.current) clearTimeout(savingTimer.current);
    savingTimer.current = setTimeout(() => setSavingState('idle'), 1800);
  }, []);

  const divData = division ? data[division] : null;

  const setDivDataAndPersist = (divKey) => (newDivData) => {
    setData(prev => ({ ...prev, [divKey]: newDivData }));
  };

  const handleChangeSystems = async (newSystems) => {
    const newDivData = { ...divData, systems: newSystems };
    setData(prev => ({ ...prev, [division]: newDivData }));
    await persist(division, newDivData);
  };

  const handleChangeSettings = async (newSettings) => {
    const newDivData = { ...divData, settings: newSettings };
    setData(prev => ({ ...prev, [division]: newDivData }));
    await persist(division, newDivData);
  };

  const handlePersistDivData = async (newDivData) => {
    await persist(division, newDivData);
  };

  const pickDivision = (key) => {
    setDivision(key);
    setView('new');
    setDraft(blankQuotation(DIVISIONS[key], data[key]?.settings));
  };

  const startNewQuotation = () => {
    setDraft(blankQuotation(DIVISIONS[division], divData?.settings));
    setView('new');
  };

  const editFromHistory = (item) => {
    setDraft(item);
    setView('new');
  };

  const convertToPI = (quotation) => {
    setDraft(convertToProformaInvoice(quotation));
    setView('new');
  };

  const deleteQuotation = async (id) => {
    const newDivData = { ...divData, quotations: divData.quotations.filter(x => x.id !== id) };
    setData(prev => ({ ...prev, [division]: newDivData }));
    await persist(division, newDivData);
  };

  const handleImportFile = async (file) => {
    try {
      const parsed = await importBackupFile(file);
      const ok = window.confirm('This will replace your current Systems, Settings and quotation history (for both divisions) with the contents of this backup file. This cannot be undone. Continue?');
      if (!ok) return;
      const newSf = parsed.sf || data.sf;
      const newWp = parsed.wp || data.wp;
      setData({ sf: newSf, wp: newWp });
      if (parsed.sf) await saveDivisionData('sf', newSf);
      if (parsed.wp) await saveDivisionData('wp', newWp);
      window.alert('Backup restored.');
    } catch (e) {
      window.alert("Couldn't read that file — is it a backup previously exported from this tool?");
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-slate-400">
        <Loader2 className="animate-spin mr-2" size={18} /> Loading your quotation data…
      </div>
    );
  }

  if (!division) {
    return (
      <div className="min-h-screen bg-slate-50">
        <DivisionPicker onPick={pickDivision} />
      </div>
    );
  }

  const div = DIVISIONS[division];

  return (
    <div className="min-h-screen bg-slate-50">
      <style>{PRINT_STYLES}</style>
      <TopNav
        div={div}
        view={view}
        setView={setView}
        onSwitchDivision={() => setDivision(null)}
        savingState={savingState}
        onExport={() => exportBackup(data)}
        onImportFile={handleImportFile}
      />
      {view === 'admin' && (
        <AdminPanel div={div} systems={divData.systems} onChangeSystems={handleChangeSystems} />
      )}
      {view === 'settings' && (
        <SettingsPanel div={div} settings={divData.settings} onChange={handleChangeSettings} />
      )}
      {view === 'new' && draft && (
        <QuotationBuilder
          div={div}
          systems={divData.systems}
          draft={draft}
          setDraft={setDraft}
          divData={divData}
          setDivData={setDivDataAndPersist(division)}
          persist={handlePersistDivData}
          settings={divData.settings}
          onSaved={() => setView('history')}
        />
      )}
      {view === 'history' && (
        <QuotationHistory
          div={div}
          quotations={divData.quotations}
          onEdit={editFromHistory}
          onDelete={deleteQuotation}
          onConvertToPI={convertToPI}
          settings={divData.settings}
        />
      )}
      {view !== 'new' && (
        <div className="no-print fixed bottom-5 right-5">
          <Btn accentClasses={`${div.bg} text-white ${div.bgHover} shadow-lg`} onClick={startNewQuotation}><Plus size={16} /> New Quotation</Btn>
        </div>
      )}
    </div>
  );
}
