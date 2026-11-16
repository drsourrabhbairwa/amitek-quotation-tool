/* ============================================================
   SIGN-IN FROM THE ATTENDANCE APP
   The attendance app opens this tool as …/#from-attendance=<2-minute pass>.
   The pass goes to the attendance-signin Edge Function, which checks it with
   the attendance server and hands back a one-time Supabase sign-in token.
   People who came in this way are re-checked on every open and every 15
   minutes; the database itself refuses them once access is switched off.
   ============================================================ */
import { supabase } from './supabaseClient';

const KEY = 'from-attendance';

/** Reads the pass from the address bar once and removes it, so a refresh or a
 * shared link never carries it. */
export function takeHandoffCode() {
  const m = new RegExp('[#&]' + KEY + '=([^&]+)').exec(window.location.hash || '');
  if (!m) return null;
  try { window.history.replaceState(null, '', window.location.pathname + window.location.search); } catch { /* old browser: harmless */ }
  try { return decodeURIComponent(m[1]); } catch { return null; }
}

async function call(body) {
  const { data, error } = await supabase.functions.invoke('attendance-signin', { body });
  if (error) {
    let msg = error.message;
    try { const j = await error.context.json(); if (j && j.error) msg = j.error; } catch { /* keep the generic message */ }
    throw new Error(msg);
  }
  return data;
}

export async function signInFromAttendance(code) {
  const { data: cur } = await supabase.auth.getSession();
  if (cur.session) await supabase.auth.signOut(); // someone else may be signed in on this browser
  const r = await call({ code });
  if (!r || !r.token_hash) throw new Error('The sign-in did not complete. Open the Quotation Tool again from the attendance app.');
  let res = await supabase.auth.verifyOtp({ token_hash: r.token_hash, type: 'email' });
  if (res.error) res = await supabase.auth.verifyOtp({ token_hash: r.token_hash, type: 'magiclink' });
  if (res.error) throw new Error(res.error.message);
  return res.data.session;
}

export const isAttendanceUser = (session) => session?.user?.user_metadata?.source === 'attendance';

/** { active: boolean, error?: string } for an attendance-app login. */
export async function recheckAttendanceAccess() {
  return call({ action: 'refresh' });
}
