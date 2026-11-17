'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';
import { ShieldCheck, Lock, Eye, EyeOff, User, Loader2, CheckCircle2, AlertCircle, Award } from 'lucide-react';
import { kabisigApi } from '../../src/lib/api';
import { composeFullName } from '../../src/lib/name';
import { KabisigLogo } from '../../src/components/PublicPages';

const INVALID_INVITE_MESSAGE = 'This invitation link has already been used or has expired. Please log in normally or contact the Super Admin.';
let setupSupabaseClient: SupabaseClient | null = null;

function getSetupSupabaseClient(): SupabaseClient {
  if (setupSupabaseClient) return setupSupabaseClient;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) throw new Error('Supabase authentication is not configured.');
  setupSupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  return setupSupabaseClient;
}

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
  const [supabaseClient, setSupabaseClient] = useState<SupabaseClient | null>(null);
  const [inviteStatus, setInviteStatus] = useState<'checking' | 'ready' | 'invalid'>('checking');
  const [email, setEmail] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [barangayName, setBarangayName] = useState('');
  const [barangayLogo, setBarangayLogo] = useState('');
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [suffix, setSuffix] = useState('');
  const [officialRole, setOfficialRole] = useState('SK Kagawad');
  const [phone, setPhone] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [sex, setSex] = useState<'Male' | 'Female' | 'Other' | 'Prefer not to say' | ''>('');
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMobileValidationModal, setShowMobileValidationModal] = useState(false);

  const composedFullName = composeFullName({ first_name: firstName, middle_name: middleName, last_name: lastName, suffix });

  useEffect(() => {
    let active = true;
    let subscription: { unsubscribe: () => void } | undefined;

    const verifyInvite = async () => {
      try {
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        const queryParams = new URLSearchParams(window.location.search);
        const authError = hashParams.get('error_description') || queryParams.get('error_description') ||
          hashParams.get('error') || queryParams.get('error');
        if (authError) throw new Error(authError);

        const client = getSetupSupabaseClient();
        if (!active) return;
        setSupabaseClient(client);
        const acceptSession = (session: Session) => {
          if (!active) return;
          setError(null);
          if (
            session.user.user_metadata?.setup_completed === true ||
            session.user.app_metadata?.setup_completed === true
          ) {
            router.replace('/');
            return;
          }
          const inviteEmail = queryParams.get('invite_email')?.trim().toLowerCase();
          if (inviteEmail && session.user.email?.toLowerCase() !== inviteEmail) {
            setInviteStatus('invalid');
            setError('This invitation link does not match the signed-in email address.');
            return;
          }
          setInviteStatus('ready');
        };
        const authState = client.auth.onAuthStateChange((_event, session) => {
          if (session) acceptSession(session);
        });
        subscription = authState.data.subscription;
        const { data, error: sessionError } = await client.auth.getSession();
        if (sessionError) throw sessionError;
        if (!data.session) {
          if (!window.location.hash) throw new Error(INVALID_INVITE_MESSAGE);
          throw new Error('Unable to establish a session from this invitation. Please reopen the invitation link.');
        }
        acceptSession(data.session);
      } catch (verificationError) {
        console.error('SK Official invitation verification failed:', verificationError);
        if (active) {
          setInviteStatus('invalid');
          setError(
            !window.location.hash && verificationError instanceof Error && verificationError.message === INVALID_INVITE_MESSAGE
              ? INVALID_INVITE_MESSAGE
              : verificationError instanceof Error
                ? verificationError.message
                : 'Unable to verify this invitation. Please reopen the invitation link.'
          );
        }
      }
    };

    void verifyInvite();
    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const inviteEmail = searchParams.get('invite_email');
    const tenant = searchParams.get('tenant_id') || searchParams.get('tenant') || searchParams.get('barangay');
    const roleParam = searchParams.get('official_role');
    if (inviteEmail) setEmail(inviteEmail);
    if (tenant) {
      setTenantId(tenant);
      setBarangayLogo('');
    }
    if (roleParam) setOfficialRole(roleParam);
    if (tenant) {
      kabisigApi.getBarangays().then((rows) => {
        if (!rows) return;
        const bgy = rows.find((b: any) => b.id === tenant || b.name?.toLowerCase() === tenant.toLowerCase());
        if (bgy) {
          if (bgy.name) setBarangayName(bgy.name);
          setBarangayLogo(bgy.logo || '');
          if (bgy.id) setTenantId(bgy.id);
        }
      }).catch((loadError) => console.error('Unable to load Official setup Barangay details:', loadError));
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (inviteStatus === 'checking') {
      setError('Please wait while we verify your invitation session.');
      return;
    }
    if (inviteStatus === 'invalid') return;
    if (!supabaseClient) {
      setError('Unable to access your invitation session. Please reload the page and try again.');
      return;
    }
    if (!/^09\d{9}$/.test(phone)) {
      setShowMobileValidationModal(true);
      return;
    }
    if (!birthdate || !sex || !address.trim()) {
      setError('Please complete your birthdate, biological sex, and address.');
      return;
    }
    if (new Date(birthdate) > new Date()) {
      setError('Birthdate cannot be in the future.');
      return;
    }
    const age = Math.floor((Date.now() - new Date(birthdate).getTime()) / 31557600000);
    if (age < 15 || age > 30) {
      setError('You must be between 15 and 30 years old (RA 10742).');
      return;
    }
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
      const { data: sessionData, error: sessionError } = await supabaseClient.auth.getSession();
      if (sessionError) {
        setError(`Unable to verify your invitation session: ${sessionError.message}`);
        return;
      }
      const session = sessionData.session;
      if (!session?.access_token) {
        setInviteStatus('invalid');
        setError('Your invitation session could not be restored. Please request a new invitation.');
        return;
      }
      const sessionEmail = session.user.email?.trim().toLowerCase() || null;
      if (
        session.user.user_metadata?.setup_completed === true ||
        session.user.app_metadata?.setup_completed === true
      ) {
        router.replace('/');
        setError('This account has already completed setup. Please sign in.');
        return;
      }
      if (
        session.user.user_metadata?.setup_completed !== false ||
        session.user.app_metadata?.setup_completed !== false
      ) {
        setError('This invitation is not pending setup. Please contact the Super Admin.');
        return;
      }
      if (!sessionEmail || sessionEmail !== cleanEmail) {
        setError('The email address must match the invitation.');
        return;
      }

      const res = await kabisigApi.setupOfficialPassword({
        email: sessionEmail,
        password: password,
        confirmPassword: confirmPassword,
        full_name: composedFullName || ('Hon. ' + firstName.trim() + ' ' + lastName.trim()).trim(),
        first_name: firstName.trim() || null,
        middle_name: middleName.trim() || null,
        last_name: lastName.trim() || null,
        suffix: suffix.trim() || null,
        phone: phone.trim(),
        birthdate,
        sex,
        address: address.trim(),
        official_role: officialRole,
        tenant_id: tenantId,
      }, session.access_token);
      if (!res.success) {
        const responseMessage = res.message || 'Password setup failed. Please check your inputs and try again.';
        const lowerMessage = responseMessage.toLowerCase();
        if (
          lowerMessage.includes('already been used') ||
          lowerMessage.includes('unauthorized') ||
          lowerMessage.includes('invitation session')
        ) {
          setInviteStatus('invalid');
          setError(INVALID_INVITE_MESSAGE);
        } else {
          setError(responseMessage);
        }
        return;
      }
      const loginRes = await kabisigApi.login(sessionEmail, password);
      if (!loginRes.success) {
        setError('Account configured. Please sign in manually with your new password.');
        return;
      }
      router.replace('/');
    } catch (err: any) {
      setError((err && err.message) ? err.message : 'Network error setting up SK Official password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const checks = validatePassword(password);
  const match = password.length > 0 && password === confirmPassword;
  const allPass = checks.minLength && checks.hasUpper && checks.hasLower && checks.hasNumber && checks.hasSymbol && match;
  const invalidMobileMessage = 'Mobile number must start with 09 and be exactly 11 digits.';

  return (
    <div className="min-h-screen bg-slate-50 grid lg:grid-cols-[2fr_3fr]">
      <div className="hidden lg:flex flex-col justify-between bg-[#091d64] text-white p-10">
        <div>
          <div className="flex items-center gap-3 mb-10">
            {barangayLogo ? (
              <img src={barangayLogo} alt={`${barangayName || 'Barangay'} logo`} className="w-10 h-10 rounded-full object-cover" onError={() => setBarangayLogo('')} />
            ) : (
              <KabisigLogo className="w-10 h-10" />
            )}
            <div>
              <p className="text-base font-black tracking-wide">KABISIG</p>
              <p className="text-[10px] text-slate-300 uppercase tracking-widest">Naga City SK Information System</p>
            </div>
          </div>
          <h2 className="text-2xl font-black leading-tight mb-3">Welcome, incoming {officialRole}</h2>
          <p className="text-sm text-slate-200 leading-relaxed max-w-md">
            Set up your password to activate your official account for Barangay{' '}
            <span className="font-bold text-amber-400">{barangayName || 'your Barangay'}</span>.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-[#091d64] border border-blue-100 rounded-full text-[10px] font-black uppercase tracking-wider mb-3">
              <Award className="w-3.5 h-3.5 text-amber-500" />
              SK Official First-Time Setup
            </span>
            <h1 className="text-lg font-black uppercase tracking-[0.14em] text-[#091d64]">Create Official Password</h1>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block text-xs font-bold text-slate-900">First Name <span className="text-rose-500">*</span>
                  <input type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)}
                    className="mt-1 w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                    placeholder="Enter your first name" />
                </label>
                <label className="block text-xs font-bold text-slate-900">Middle Name
                  <input type="text" value={middleName} onChange={(e) => setMiddleName(e.target.value)}
                    className="mt-1 w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                    placeholder="Enter your middle name" />
                </label>
                <label className="block text-xs font-bold text-slate-900">Last Name <span className="text-rose-500">*</span>
                  <input type="text" required value={lastName} onChange={(e) => setLastName(e.target.value)}
                    className="mt-1 w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                    placeholder="Enter your last name" />
                </label>
                <select value={suffix} onChange={(e) => setSuffix(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 cursor-pointer">
                  <option value="">Suffix — None</option>
                  <option value="Jr.">Jr.</option>
                  <option value="Sr.">Sr.</option>
                  <option value="II">II</option>
                  <option value="III">III</option>
                  <option value="IV">IV</option>
                  <option value="V">V</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">Mobile Contact <span className="text-rose-500">*</span></label>
                <input type="tel" inputMode="numeric" maxLength={11} value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder=""
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                  required />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">Birthdate <span className="text-rose-500">*</span></label>
                <input type="date" value={birthdate} max={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setBirthdate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                  required />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">Biological Sex <span className="text-rose-500">*</span></label>
                <select value={sex} required onChange={(e) => setSex(e.target.value as typeof sex)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 cursor-pointer">
                  <option value="" disabled>Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">Address <span className="text-rose-500">*</span></label>
                <input type="text" value={address} onChange={(e) => setAddress(e.target.value)}
                  placeholder=""
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                  required />
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

            <button type="submit" disabled={isSubmitting || inviteStatus !== 'ready'}
              className="w-full py-3.5 bg-[#133285] hover:bg-[#112d75] disabled:opacity-60 text-white font-bold rounded-xl shadow-sm transition-all active:scale-[0.99] text-xs flex items-center justify-center gap-2 cursor-pointer mt-2">
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Configuring SK Official Account...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-amber-300" />
                  <span>Save Password and Open SK Official Dashboard</span>
                </>
              )}
            </button>

          </form>
        </div>
      </div>
      {showMobileValidationModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4" role="presentation">
          <div role="alertdialog" aria-modal="true" aria-labelledby="official-mobile-validation-title"
            className="w-full max-w-sm rounded-2xl border border-rose-200 bg-white p-6 text-center shadow-2xl">
            <AlertCircle className="mx-auto mb-3 h-10 w-10 text-rose-600" />
            <h2 id="official-mobile-validation-title" className="mb-2 text-base font-black text-rose-700">Invalid Mobile Contact</h2>
            <p className="mb-5 text-sm text-slate-700">{invalidMobileMessage}</p>
            <button type="button" onClick={() => setShowMobileValidationModal(false)}
              className="rounded-lg bg-rose-600 px-5 py-2 text-sm font-bold text-white hover:bg-rose-700">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OfficialSetupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-sm text-slate-500">Loading...</div>}>
      <SetupForm />
    </Suspense>
  );
}