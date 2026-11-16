// Signs a person into the Quotation Tool with their attendance-app sign-in.
//
//   POST { code }            (no session) - code is the 2-minute pass the attendance app put after #from-attendance=
//                            -> the attendance server checks it (quoteRedeem): Super Admin switched this person on,
//                               not signed out, password unchanged. Then a Supabase account for their email is made
//                               if needed, and a one-time sign-in token is returned for supabase.auth.verifyOtp.
//   POST { action:'refresh' } (with the user's session) - re-checks access with the saved 30-day link; the
//                               database refuses every read and write once `active` is false or the check is
//                               older than a day (see quote_access_ok in schema.sql).
//
// Deployed with verify_jwt = false because the first call happens before there is any session.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const ATTENDANCE_API = 'https://asia-south1-amitek-attendance-59ccc.cloudfunctions.net/api';
const ATTENDANCE_SHARED_WORD = 'CHANGE_THIS_SECRET'; // the same public word the attendance page sends; the real check is the signed pass

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

async function redeem(code: string) {
  const res = await fetch(ATTENDANCE_API, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'quoteRedeem', secret: ATTENDANCE_SHARED_WORD, code }),
  });
  if (!res.ok) throw new Error('The attendance server did not answer (' + res.status + ')');
  return await res.json() as { ok: boolean; error?: string; data?: { id: string; name: string; email: string; link: string } };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return reply('ok');
  if (req.method !== 'POST') return reply({ error: 'POST only' }, 405);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { return reply({ error: 'Bad request' }, 400); }

  try {
    // ── Re-check an existing session ──
    if (body.action === 'refresh') {
      const jwt = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
      const { data: u } = await admin.auth.getUser(jwt);
      const email = u?.user?.email?.toLowerCase();
      if (!email) return reply({ error: 'Not signed in' }, 401);
      const { data: row } = await admin.from('quotation_access').select('link').eq('email', email).maybeSingle();
      if (!row) return reply({ active: true, source: 'direct' }); // a Quotation Tool login of its own, not linked to attendance
      const r = await redeem(String(row.link || ''));
      if (!r.ok || !r.data) {
        await admin.from('quotation_access').update({ active: false, checked_at: new Date().toISOString(), note: r.error || 'refused' }).eq('email', email);
        return reply({ active: false, error: r.error || 'Access ended' });
      }
      await admin.from('quotation_access').update({ active: true, link: r.data.link, name: r.data.name, checked_at: new Date().toISOString(), note: null }).eq('email', email);
      return reply({ active: true, source: 'attendance' });
    }

    // ── First sign-in from the attendance app ──
    const code = String(body.code || '');
    if (!code || code.length > 2000) return reply({ error: 'Missing sign-in pass' }, 400);
    const r = await redeem(code);
    if (!r.ok || !r.data) return reply({ error: r.error || 'This link has expired. Open the Quotation Tool again from the attendance app.' }, 403);
    const { email, name, id, link } = r.data;

    // Never take over a login someone made directly in the Quotation Tool: those stay with their own password.
    const { data: existing } = await admin.from('quotation_access').select('email').eq('email', email).maybeSingle();
    if (!existing) {
      const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const direct = (list?.users || []).find((x) => (x.email || '').toLowerCase() === email && x.user_metadata?.source !== 'attendance');
      if (direct) return reply({ error: 'This email already has its own Quotation Tool password. Sign in with that instead.' }, 409);
    }

    const created = await admin.auth.admin.createUser({ email, email_confirm: true, user_metadata: { name, empId: id, source: 'attendance' } });
    if (created.error && !/already|registered|exists/i.test(created.error.message)) throw created.error;

    const { error: upErr } = await admin.from('quotation_access').upsert({
      email, emp_id: id, name, link, active: true, checked_at: new Date().toISOString(), note: null,
    });
    if (upErr) throw upErr;

    const { data: gl, error: glErr } = await admin.auth.admin.generateLink({ type: 'magiclink', email });
    if (glErr) throw glErr;
    return reply({ token_hash: gl.properties.hashed_token, email });
  } catch (e) {
    return reply({ error: 'Could not sign you in: ' + String((e as Error)?.message || e).slice(0, 200) }, 500);
  }
});
