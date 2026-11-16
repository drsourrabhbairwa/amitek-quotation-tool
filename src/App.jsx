import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { DIVISIONS } from './lib/constants';
import { blankQuotation, convertToProformaInvoice } from './lib/model';
import { loadDivisionData, saveDivisionData, upsertQuotation, setQuotationTracking, replaceSystems, replaceSettings, deleteQuotationRow, exportBackup, importBackupFile } from './lib/storage';
import { supabase } from './lib/supabaseClient';
import { takeHandoffCode, signInFromAttendance, isAttendanceUser, recheckAttendanceAccess } from './lib/attendanceLink';
import { Btn } from './components/ui/atoms';
import { DivisionPicker } from './components/DivisionPicker';
import { LoginScreen } from './components/LoginScreen';
import { TopNav } from './components/TopNav';
import { AdminPanel } from './components/admin/AdminPanel';
import { QuotationBuilder } from './components/QuotationBuilder';
import { QuotationHistory } from './components/QuotationHistory';
import { Dashboard } from './components/Dashboard';
import { ClientsView } from './components/ClientsView';
import { buildClientDirectory } from './lib/clients';
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
  th, td { padding: 2px 4px !important; line-height: 1.25 !important; overflow-wrap: break-word; word-break: break-word; }
  /* Let a System (several rows glued together by rowspan cells) flow
     across pages instead of jumping whole to the next one — that jump
     left every page ~half empty. Chrome treats a rowspan group as one
     unbreakable block whenever its <tr>s are marked avoid, so rows stay
     breakable and each individual cell (never a rowspan one) is kept
     whole instead, so no line of text is ever cut in half. */
  tr { page-break-inside: auto; break-inside: auto; }
  td:not([rowspan]) { break-inside: avoid; page-break-inside: avoid; }
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
  const [session, setSession] = useState(undefined); // undefined = still checking, null = signed out
  const [loadError, setLoadError] = useState(null);

  const [notice, setNotice] = useState(''); // shown on the sign-in screen (e.g. access ended)

  useEffect(() => {
    const code = takeHandoffCode();
    (async () => {
      if (code) {
        try { await signInFromAttendance(code); }
        catch (e) { setNotice(e.message || 'Could not sign you in from the attendance app.'); }
      }
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
    })();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => setSession(newSession));
    return () => listener.subscription.unsubscribe();
  }, []);

  // A login that came from the attendance app is re-checked now and every 15 minutes.
  const endAttendanceAccess = useCallback(async (msg) => {
    setNotice(msg || 'Your Quotation Tool access has ended. Ask the Super Admin in the attendance app.');
    await supabase.auth.signOut();
  }, []);
  useEffect(() => {
    if (!isAttendanceUser(session)) return;
    const t = setInterval(() => {
      recheckAttendanceAccess().then(r => { if (r && r.active === false) endAttendanceAccess(r.error); }).catch(() => {});
    }, 15 * 60 * 1000);
    return () => clearInterval(t);
  }, [session?.user?.id, endAttendanceAccess]);

  useEffect(() => {
    if (!session) return;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        if (isAttendanceUser(session)) {
          const r = await recheckAttendanceAccess();
          if (r && r.active === false) { await endAttendanceAccess(r.error); return; }
        }
        const [sf, wp] = await Promise.all([loadDivisionData('sf'), loadDivisionData('wp')]);
        setData({ sf, wp });
      } catch (e) {
        setLoadError(e.message || 'Could not load your data.');
      } finally {
        setLoading(false);
      }
    })();
  }, [session]);

  // Wraps one Supabase write with the saving/saved/error indicator. Each
  // caller below writes only the single column it changed (via the
  // per-record functions in lib/storage.js), computed server-side against
  // the row as it stands at call time — not the whole division blob — so
  // two signed-in people saving around the same moment can't silently
  // erase each other's changes (see supabase/schema.sql's upsert_quotation
  // and friends for how that's made atomic).
  const withSavingState = useCallback(async (fn) => {
    setSavingState('saving');
    try {
      await fn();
      setSavingState('saved');
    } catch (e) {
      setSavingState('error');
      throw e;
    } finally {
      if (savingTimer.current) clearTimeout(savingTimer.current);
      savingTimer.current = setTimeout(() => setSavingState('idle'), 1800);
    }
  }, []);

  const divData = division ? data[division] : null;
  const clientDirectory = useMemo(
    () => buildClientDirectory({ sf: data.sf?.quotations || [], wp: data.wp?.quotations || [] }),
    [data.sf?.quotations, data.wp?.quotations]);

  const setDivDataAndPersist = (divKey) => (newDivData) => {
    setData(prev => ({ ...prev, [divKey]: newDivData }));
  };

  const handleChangeSystems = async (newSystems) => {
    setData(prev => ({ ...prev, [division]: { ...prev[division], systems: newSystems } }));
    try {
      await withSavingState(() => replaceSystems(division, newSystems));
    } catch (e) {
      window.alert("Couldn't save Systems — check your connection and try again.");
    }
  };

  const handleChangeSettings = async (newSettings) => {
    setData(prev => ({ ...prev, [division]: { ...prev[division], settings: newSettings } }));
    try {
      await withSavingState(() => replaceSettings(division, newSettings));
    } catch (e) {
      window.alert("Couldn't save Settings — check your connection and try again.");
    }
  };

  const [focusId, setFocusId] = useState(null); // quotation to open when History mounts

  const replaceLocalQuotation = (divKey, q) => setData(prev => ({
    ...prev,
    [divKey]: { ...prev[divKey], quotations: prev[divKey].quotations.map(x => x.id === q.id ? q : x) },
  }));

  // Status / follow-up change: shown at once, then confirmed by the server
  // copy (which also logs who changed it). No new revision.
  const updateTracking = async (id, patch) => {
    const divKey = division;
    const before = data[divKey].quotations.find(x => x.id === id);
    if (!before) return;
    replaceLocalQuotation(divKey, { ...before, ...patch });
    try {
      let stored = null;
      await withSavingState(async () => { stored = await setQuotationTracking(divKey, id, patch); });
      if (stored) replaceLocalQuotation(divKey, stored);
    } catch (e) {
      replaceLocalQuotation(divKey, before);
      throw new Error(/set_quotation_tracking|function/i.test(e.message)
        ? 'Status tracking needs the latest database update (the .sql file) to be run once in Supabase.'
        : "Couldn't update the status — check your connection and try again.");
    }
  };

  const saveQuotation = async (quotation) => {
    let saved = quotation;
    await withSavingState(async () => { saved = await upsertQuotation(division, quotation); });
    // A Proforma Invoice raised from an open quotation means that quotation was won.
    if (saved.docType === 'proforma' && saved.convertedFromId) {
      const src = data[division].quotations.find(x => x.id === saved.convertedFromId);
      if (src && ['sent', 'followup', undefined, null, ''].includes(src.status)) {
        updateTracking(src.id, { status: 'won', statusNote: `PI ${saved.refNo || ''}`.trim() }).catch(() => {});
      }
    }
    return saved;
  };

  const openQuotation = (q) => { setFocusId(q.id); setView('history'); };
  const openQuotationIn = (divKey, q) => { setDivision(divKey); setFocusId(q.id); setView('history'); };
  const newForClient = (c) => {
    const blank = blankQuotation(DIVISIONS[division], data[division]?.settings);
    setDraft({ ...blank, client: { ...blank.client, ...c.details } });
    setView('new');
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
    setData(prev => ({ ...prev, [division]: { ...prev[division], quotations: prev[division].quotations.filter(x => x.id !== id) } }));
    try {
      await withSavingState(() => deleteQuotationRow(division, id));
    } catch (e) {
      window.alert("Couldn't delete — check your connection and try again.");
    }
  };

  const handleSignOut = () => supabase.auth.signOut();

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

  if (session === undefined) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-slate-400">
        <Loader2 className="animate-spin mr-2" size={18} /> Checking your login…
      </div>
    );
  }

  if (!session) {
    return <LoginScreen notice={notice} />;
  }

  if (loadError) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 gap-3">
        <div className="text-red-600 text-sm max-w-sm">{loadError}</div>
        <Btn variant="outline" onClick={() => setSession(s => ({ ...s }))}>Try again</Btn>
      </div>
    );
  }

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
        onSignOut={handleSignOut}
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
          saveQuotation={saveQuotation}
          settings={divData.settings}
          clients={clientDirectory}
          onSaved={() => setView('history')}
        />
      )}
      {view === 'dashboard' && (
        <Dashboard div={div} quotations={divData.quotations} onOpen={openQuotation} onTrack={updateTracking} onShowHistory={() => { setFocusId(null); setView('history'); }} />
      )}
      {view === 'clients' && (
        <ClientsView div={div} directory={clientDirectory} onOpen={openQuotationIn} onNewForClient={newForClient} />
      )}
      {view === 'history' && (
        <QuotationHistory
          key={focusId || 'list'}
          initialViewId={focusId}
          onTrack={updateTracking}
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
