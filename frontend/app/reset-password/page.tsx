'use client';

import { useEffect, useState } from 'react';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Eye, EyeOff, Lock, ShieldCheck, ChevronLeft, CheckCircle2 } from 'lucide-react';

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export default function ResetPasswordPage() {
  const [status, setStatus] = useState<'checking' | 'ready' | 'invalid' | 'success'>('checking');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [client, setClient] = useState<SupabaseClient | null>(null);

  useEffect(() => {
    if (!SB_URL || !SB_KEY) {
      setStatus('invalid');
      setError('Supabase environment variables are missing.');
      return;
    }
    const sb = createClient(SB_URL, SB_KEY, {
      auth: { persistSession: false, detectSessionInUrl: false },
    });
    setClient(sb);

    const hash = window.location.hash || '';
    const params = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token') || '';
    const type = params.get('type');

    const query = new URLSearchParams(window.location.search);
    const code = query.get('code');

    (async () => {
      try {
        if (accessToken && type === 'recovery') {
          const { error: sessErr } = await sb.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
          if (sessErr) { setStatus('invalid'); setError(sessErr.message); return; }
          setStatus('ready');
        } else if (code) {
          const { error: exchErr } = await sb.auth.exchangeCodeForSession(code);
          if (exchErr) { setStatus('invalid'); setError(exchErr.message); return; }
          setStatus('ready');
        } else {
          setStatus('invalid');
          setError('No recovery token found in the link.');
        }
      } catch (err: any) {
        setStatus('invalid');
        setError(err?.message || 'Failed to verify the reset link.');
      }
    })();
  }, []);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setError('');
    if (!client) { setError('Client not ready.'); return; }
    const checks = {
      len: password.length >= 8,
      up: /[A-Z]/.test(password),
      low: /[a-z]/.test(password),
      num: /[0-9]/.test(password),
      sym: /[^A-Za-z0-9]/.test(password),
    };
    if (!checks.len || !checks.up || !checks.low || !checks.num || !checks.sym) {
      setError('Password must be at least 8 characters and include uppercase, lowercase, number, and symbol.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      const { error: upErr } = await client.auth.updateUser({ password });
      if (upErr) { setError(upErr.message); setBusy(false); return; }
      await client.auth.signOut();
      setStatus('success');
      setTimeout(() => { window.location.href = '/'; }, 2200);
    } catch (err: any) {
      setError(err?.message || 'Failed to update password.');
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[2fr_3fr] font-sans bg-white">
      {/* LEFT — Navy branding panel */}
      <div className="hidden lg:flex relative flex-col justify-between bg-gradient-to-br from-[#091d64] via-[#0d2a80] to-[#091d64] p-12 overflow-hidden">
        <div className="absolute top-0 left-0 w-[55%] h-[55%] opacity-40 pointer-events-none">
          <svg viewBox="0 0 500 500" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <path d="M-80 -80 C 180 -80, 260 160, 160 320 C 80 440, -80 380, -80 380 Z" fill="rgba(255,255,255,0.05)" />
            <path d="M-120 -120 C 120 -120, 220 70, 120 250 C 50 350, -120 300, -120 300 Z" fill="rgba(251,191,36,0.06)" />
          </svg>
        </div>
        <div className="relative z-10">
          <div className="w-24 h-24 rounded-2xl bg-white flex items-center justify-center p-2 shadow-lg">
            <img src="/images/Kabisig_logo.png" alt="KABISIG" className="w-full h-full object-contain" />
          </div>
        </div>
        <div className="relative z-10 my-10">
          <p className="text-amber-400 font-extrabold text-[10px] tracking-[0.3em] uppercase mb-3">Naga City - Sangguniang Kabataan</p>
          <h2 className="text-white font-black text-3xl mb-4 leading-tight">Secure your account.</h2>
          <p className="text-blue-100/90 text-sm mb-8 leading-relaxed max-w-sm">
            Set a new password to regain access to your KABISIG portal. Password changes apply to your entire account across all SK workflows.
          </p>
          <ul className="space-y-3 text-blue-100/90 text-xs font-semibold">
            <li className="flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
              <span>Encrypted password storage</span>
            </li>
            <li className="flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
              <span>RA 10173 Data Privacy compliant</span>
            </li>
            <li className="flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
              <span>Instant access restoration</span>
            </li>
          </ul>
        </div>
        <div className="relative z-10">
          <p className="text-blue-200/60 text-[10px] font-medium leading-relaxed">Ateneo de Naga University - BS Information Technology - 2026</p>
        </div>
      </div>

      {/* RIGHT — Form */}
      <div className="relative flex items-center justify-center bg-[#f8fafc] px-4 py-12 min-h-screen lg:min-h-0">
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-60">
          <svg viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute bottom-0 right-0 w-[45%] h-[45%]">
            <path d="M450 -50 C 280 -50, 220 120, 300 240 C 360 320, 450 280, 450 280 Z" fill="rgba(219,39,119,0.05)" />
            <path d="M480 -80 C 320 -80, 250 50, 320 180 C 370 260, 480 220, 480 220 Z" fill="rgba(251,191,36,0.04)" />
          </svg>
        </div>

        <div className="relative z-10 w-full max-w-[440px]">
          <a href="/" className="self-start mb-4 inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#091d64] transition-colors">
            <ChevronLeft className="w-4 h-4" /> Back to Home
          </a>

          <div className="w-full bg-white rounded-[2rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 sm:p-10 flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 text-[#091d64] flex items-center justify-center mb-4">
              <Lock className="w-7 h-7" />
            </div>
            <h1 className="text-lg font-black text-[#091d64] uppercase tracking-[0.14em] text-center mb-1">Reset Password</h1>
            <p className="text-xs text-slate-500 text-center mb-6 max-w-xs">
              {status === 'ready' && 'Choose a new password for your KABISIG account.'}
              {status === 'checking' && 'Verifying your reset link...'}
              {status === 'invalid' && 'The reset link is invalid or has expired.'}
              {status === 'success' && 'Your password has been updated.'}
            </p>

            {status === 'checking' && (
              <div className="w-full py-8 flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-3 border-slate-200 border-t-[#091d64] rounded-full animate-spin"></div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Verifying</p>
              </div>
            )}

            {status === 'invalid' && (
              <div className="w-full rounded-lg border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">
                <p className="font-bold mb-1">Link invalid or expired</p>
                <p className="mb-3">{error || 'Please request a new password reset from the Sign In page.'}</p>
                <a href="/" className="inline-block px-4 py-2 bg-[#091d64] text-white rounded-lg font-bold text-[10px] uppercase tracking-wider hover:bg-[#122878]">Back to Sign In</a>
              </div>
            )}

            {status === 'ready' && (
              <form onSubmit={handleSubmit} className="w-full space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1.5">New Password <span className="text-rose-500">*</span></label>
                  <div className="relative w-full">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                      placeholder="Enter new password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1.5">Confirm Password <span className="text-rose-500">*</span></label>
                  <div className="relative w-full">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                      placeholder="Confirm new password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="rounded-lg bg-slate-50 border border-slate-100 p-3 text-[10px] text-slate-500 leading-relaxed">
                  <span className="font-bold text-slate-600 block mb-1">Password must contain:</span>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                    <span className={password.length >= 8 ? 'text-emerald-600 font-bold' : ''}>- 8+ characters</span>
                    <span className={/[A-Z]/.test(password) ? 'text-emerald-600 font-bold' : ''}>- Uppercase letter</span>
                    <span className={/[a-z]/.test(password) ? 'text-emerald-600 font-bold' : ''}>- Lowercase letter</span>
                    <span className={/[0-9]/.test(password) ? 'text-emerald-600 font-bold' : ''}>- Number</span>
                    <span className={/[^A-Za-z0-9]/.test(password) ? 'text-emerald-600 font-bold' : ''}>- Symbol</span>
                  </div>
                </div>

                {error && <p className="text-xs text-rose-600 font-bold">{error}</p>}

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full py-3 bg-[#091d64] hover:bg-[#122878] text-white font-bold rounded-lg text-xs uppercase tracking-wider disabled:opacity-60 cursor-pointer"
                >
                  {busy ? 'Saving...' : 'Update Password'}
                </button>
              </form>
            )}

            {status === 'success' && (
              <div className="w-full rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800 flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold mb-1">Password updated successfully</p>
                  <p>Redirecting to the homepage...</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}