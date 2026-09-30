// src/components/LoginScreen.jsx
import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { TextInput, Btn } from './ui/atoms';
import { AmitekLogo } from './ui/atoms';

export function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (signInError) setError(signInError.message || 'Could not sign in.');
  };

  const handleForgotPassword = async () => {
    if (!email) { setError('Enter your email above first, then click "Forgot password".'); return; }
    setBusy(true);
    setError('');
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email);
    setBusy(false);
    if (resetError) setError(resetError.message || 'Could not send reset email.');
    else setResetSent(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white border border-slate-200 rounded-lg p-6">
        <AmitekLogo w={160} />
        <div className="text-center text-sm text-slate-500 mt-2 mb-5">Sign in to the quotation tool</div>
        <div className="space-y-3">
          <TextInput type="email" value={email} onChange={setEmail} placeholder="Email" />
          <TextInput type="password" value={password} onChange={setPassword} placeholder="Password" />
        </div>
        {error && <div className="text-red-600 text-xs mt-3">{error}</div>}
        {resetSent && <div className="text-emerald-600 text-xs mt-3">Password reset email sent — check your inbox.</div>}
        <Btn type="submit" disabled={busy} className="w-full justify-center mt-4">
          {busy ? <Loader2 size={14} className="animate-spin" /> : null} Sign in
        </Btn>
        <button type="button" onClick={handleForgotPassword} className="block w-full text-center text-xs text-slate-400 hover:text-slate-600 mt-3">
          Forgot password?
        </button>
      </form>
    </div>
  );
}
