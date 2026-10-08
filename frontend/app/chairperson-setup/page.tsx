'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldCheck, Lock, Eye, EyeOff, User, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { kabisigApi } from '../../src/lib/api';
import { KabisigLogo } from '../../src/components/PublicPages';

function validatePassword(pw: string) {
  return {
    minLength: pw.length >= 8,
    hasUpper: /[A-Z]/.test(pw),
    hasLower: /[a-z]/.test(pw),
    hasNumber: /[0-9]/.test(pw),
    hasSymbol: /[^A-Za-z0-9]/.test(pw),
  };
}

function SetupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [barangayName, setBarangayName] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const inviteEmail = searchParams.get('invite_email');
    const tenant = searchParams.get('tenant_id');
    if (inviteEmail) setEmail(inviteEmail);
    if (tenant) setTenantId(tenant);
    if (tenant) {
      kabisigApi.getBarangays().then((rows) => {
        if (!rows) return;
        const bgy = rows.find((b: any) => b.id === tenant);
        if (bgy && bgy.name) setBarangayName(bgy.name);
      }).catch(() => {});
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) { setError('Please enter your KABISIG email address.'); return; }
    if (!password) { setError('Please create your password.'); return; }
    if (!confirmPassword) { setError('Please confirm your password.'); return; }
    if (password !== confirmPassword) { setError('Password and Confirm Password do not match.'); return; }
    const checks = validatePassword(password);
    if (!checks.minLength || !checks.hasUpper || !checks.hasLower || !checks.hasNumber || !checks.hasSymbol) {
      setError('Password does not meet all security criteria listed below.');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await kabisigApi.setupChairpersonPassword({
        email: cleanEmail,
        password: password,
        confirmPassword: confirmPassword,
        full_name: fullName.trim() || 'Hon. SK Chairperson',
      });
      if (!res.success) {
        setError(res.message || 'Password setup failed. Please check your inputs and try again.');
        return;
      }
      const loginRes = await kabisigApi.login(cleanEmail, password);
      if (!loginRes.success) {
        setError('Account configured. Please sign in manually with your new password.');
        return;
      }
      router.replace('/');
    } catch (err: any) {
      setError((err && err.message) ? err.message : 'Network error setting up Chairperson password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const checks = validatePassword(password);
  const match = password.length > 0 && password === confirmPassword;
  const allPass = checks.minLength && checks.hasUpper && checks.hasLower && checks.hasNumber && checks.hasSymbol && match;

  return (
    <div className="min-h-screen bg-slate-50 grid lg:grid-cols-[2fr_3fr]">
      <div className="hidden lg:flex flex-col justify-between bg-[#091d64] text-white p-10">
        <div>
          <div className="flex items-center gap-3 mb-10">
            <KabisigLogo className="w-10 h-10" />
            <div>
              <p className="text-base font-black tracking-wide">KABISIG</p>
              <p className="text-[10px] text-slate-300 uppercase tracking-widest">Naga City SK Information System</p>
            </div>
          </div>
          <h2 className="text-2xl font-black leading-tight mb-3">Welcome, incoming SK Chairperson</h2>
          <p className="text-sm text-slate-200 leading-relaxed max-w-md">
            Set up your password to activate your official account for Barangay{' '}
            <span className="font-bold text-amber-400">{barangayName || 'your Barangay'}</span>.
          </p>
        </div>
        <div className="space-y-2 text-xs text-slate-300">
          <p>Password is stored encrypted</p>
          <p>You will not be asked for a temporary password</p>
          <p>You may change it anytime from Settings</p>
        </div>
      </div>

      <div className="flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-[#091d64] border border-blue-100 rounded-full text-[10px] font-black uppercase tracking-wider mb-3">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
              SK Chairperson First-Time Setup
            </span>
            <h1 className="text-lg font-black uppercase tracking-[0.14em] text-[#091d64]">Create Chairperson Password</h1>
            <p className="text-xs text-slate-500 mt-1">
              {barangayName ? ('Jurisdiction: Barangay ' + barangayName) : 'Set up your password to activate your official account'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">Official Email Address <span className="text-rose-500">*</span></label>
              <div className="relative">
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                  placeholder="you@example.com" required />
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">Chairperson Full Name <span className="text-slate-400 font-normal">(Optional)</span></label>
              <div className="relative">
                <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                  placeholder="Hon. Ashley Kyla D. Vinzon" />
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">Create Password <span className="text-rose-500">*</span></label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                  placeholder="Create strong password" required />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">Confirm Password <span className="text-rose-500">*</span></label>
              <div className="relative">
                <input type={showConfirm ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                  placeholder="Confirm strong password" required />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer">
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {!allPass && password.length > 0 && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-[11px]">
                <p className="font-bold text-slate-600 mb-1">Password Requirements:</p>
                <div className="grid grid-cols-2 gap-1 text-[10px]">
                  {[
                    ['At least 8 characters', checks.minLength],
                    ['One uppercase letter', checks.hasUpper],
                    ['One lowercase letter', checks.hasLower],
                    ['One number', checks.hasNumber],
                    ['One symbol', checks.hasSymbol],
                    ['Passwords match', match],
                  ].map(([label, ok]) => (
                    <div key={String(label)} className={'flex items-center gap-1.5 ' + (ok ? 'text-emerald-700 font-bold' : 'text-slate-400')}>
                      {ok ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <div className="w-3 h-3 rounded-full border border-slate-300 shrink-0" />}
                      <span>{String(label)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span className="leading-snug">{error}</span>
              </div>
            )}

            <button type="submit" disabled={isSubmitting}
              className="w-full py-3.5 bg-[#133285] hover:bg-[#112d75] disabled:opacity-60 text-white font-bold rounded-xl shadow-sm transition-all active:scale-[0.99] text-xs flex items-center justify-center gap-2 cursor-pointer mt-2">
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Configuring Chairperson Account...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-amber-300" />
                  <span>Save Password and Open Chairperson Dashboard</span>
                </>
              )}
            </button>

            <div className="text-center pt-2">
              <button type="button" onClick={() => router.push('/')}
                className="text-xs text-slate-500 hover:text-slate-800 font-medium hover:underline cursor-pointer">
                Already have a password? Return to standard sign in
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function ChairpersonSetupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-sm text-slate-500">Loading...</div>}>
      <SetupForm />
    </Suspense>
  );
}