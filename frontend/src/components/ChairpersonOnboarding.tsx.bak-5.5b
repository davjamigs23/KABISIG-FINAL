import React, { useState } from 'react';
import { 
  ShieldCheck, 
  User, 
  Phone, 
  Calendar, 
  MapPin, 
  AlertCircle, 
  Loader2, 
  LogOut,
  Building2,
  CheckCircle2,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';
import { BarangayTenant } from '../types';
import { KabisigLogo, DecorativeBackground, validatePassword } from './PublicPages';
import { kabisigApi } from '../lib/api';

interface ChairpersonOnboardingProps {
  currentBarangay: BarangayTenant;
  userEmail: string;
  onProfileCompleted: (updatedUser: any) => void;
  onLogout: () => void;
}

export default function ChairpersonOnboarding({
  currentBarangay,
  userEmail,
  onProfileCompleted,
  onLogout
}: ChairpersonOnboardingProps) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [sex, setSex] = useState<'Male' | 'Female' | 'Other' | 'Prefer not to say'>('Male');
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Auto-calculate age for SK Reform Act verification
  const calculateAge = (dob: string): number => {
    if (!dob) return 0;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const calculatedAge = calculateAge(birthdate);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanName = fullName.trim();
    if (!cleanName || cleanName.split(/\s+/).length < 2) {
      setErrorMsg('Please enter your full name (both First Name and Last Name).');
      return;
    }

    if (!birthdate) {
      setErrorMsg('Please provide your date of birth.');
      return;
    }

    if (calculatedAge < 15 || calculatedAge > 30) {
      setErrorMsg(
        `Republic Act No. 10742 (SK Reform Act) requires SK Chairpersons and members to be between 15 and 30 years old. Your calculated age is ${calculatedAge}.`
      );
      return;
    }

    const cleanPhone = phone.replace(/[\s\-+]/g, '');
    if (cleanPhone) {
      const isPhMobile = (cleanPhone.startsWith('09') && cleanPhone.length === 11) || 
                         (cleanPhone.startsWith('639') && cleanPhone.length === 12);
      if (!isPhMobile) {
        setErrorMsg('Please enter a valid Philippine mobile number (e.g. 09171234567 or +639171234567).');
        return;
      }
    }

    if (!address.trim() || address.trim().length < 5) {
      setErrorMsg('Please provide your complete residential address (Purok/Zone, Street).');
      return;
    }

    if (!password || !confirmPassword) {
      setErrorMsg('Please create your password and confirm it before continuing.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Password and Confirm Password do not match.');
      return;
    }

    const passwordChecks = validatePassword(password);
    if (!passwordChecks.minLength || !passwordChecks.hasUpper || !passwordChecks.hasLower || !passwordChecks.hasNumber || !passwordChecks.hasSymbol) {
      setErrorMsg('Password must be at least 8 characters and include uppercase, lowercase, number, and symbol.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await kabisigApi.completeProfile({
        full_name: cleanName,
        phone: phone.trim(),
        birthdate,
        sex,
        address: address.trim(),
        password,
        confirmPassword,
      });

      if (!res.success) {
        setErrorMsg(res.message || 'Failed to complete profile. Please try again.');
        setIsSubmitting(false);
        return;
      }

      onProfileCompleted(res.data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Network connection failed. Please check server connection.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 relative overflow-x-hidden font-sans">
      <DecorativeBackground />

      <div className="relative z-10 w-full max-w-xl">
        <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden p-8 sm:p-10 relative">
          
          {/* Top Header */}
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-3">
              <KabisigLogo className="w-24" />
              <div className="h-8 w-px bg-slate-200"></div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full inline-block">
                  First-Time Official Onboarding
                </span>
                <h1 className="text-sm font-bold text-slate-900 mt-0.5">Complete Chairperson Profile</h1>
              </div>
            </div>

            <button
              onClick={onLogout}
              className="text-xs font-semibold text-slate-400 hover:text-rose-600 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          </div>

          {/* Assigned Barangay Jurisdiction Banner */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-3.5 mb-6">
            {currentBarangay?.logo ? (
              <img 
                src={currentBarangay.logo} 
                alt={`${currentBarangay.name} Seal`} 
                className="w-12 h-12 rounded-xl object-contain bg-white p-1 border border-slate-200 shadow-2xs shrink-0" 
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#091d64] border border-blue-100 flex items-center justify-center font-bold text-lg shrink-0">
                <Building2 className="w-6 h-6" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Assigned Jurisdiction</span>
                <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Tenant Bound
                </span>
              </div>
              <h2 className="font-extrabold text-[#091d64] text-sm truncate">
                Barangay {currentBarangay?.name}, Naga City
              </h2>
              <p className="text-[11px] text-slate-500 truncate">
                Account: <span className="font-mono text-slate-700">{userEmail}</span>
              </p>
            </div>
          </div>

          {/* RA 10742 Notice */}
          <div className="p-3.5 bg-blue-50/70 border border-blue-100 rounded-xl mb-6 text-xs text-blue-900 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Republic Act No. 10742 (SK Reform Act):</strong> To unlock full administrative access for Barangay {currentBarangay?.name}, please complete your permanent profile details below.
            </p>
          </div>

          {/* Error Message Display */}
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2.5 mb-6 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Onboarding Form */}
          <form onSubmit={handleSubmit} className="space-y-4 text-left">
            
            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Full Name (First Name, Middle Initial, Last Name) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input 
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Hon. Juan P. Dela Cruz"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#091d64] focus:border-[#091d64] transition-colors"
                  required
                />
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              </div>
            </div>

            {/* Philippine Contact Number */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Philippine Mobile Contact <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input 
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0917-123-4567"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#091d64] focus:border-[#091d64] transition-colors"
                  required
                />
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Format: 09XX-XXX-XXXX (Philippine Mobile)</p>
            </div>

            {/* Birthdate and Biological Sex Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold text-slate-800">
                    Birthdate <span className="text-rose-500">*</span>
                  </label>
                  {calculatedAge > 0 && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                      calculatedAge >= 15 && calculatedAge <= 30
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-rose-50 text-rose-700'
                    }`}>
                      Age: {calculatedAge} yrs
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input 
                    type="date"
                    value={birthdate}
                    onChange={(e) => setBirthdate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#091d64] focus:border-[#091d64] transition-colors"
                    required
                  />
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Must be 15-30 years old (RA 10742)</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Biological Sex <span className="text-rose-500">*</span>
                </label>
                <select 
                  value={sex}
                  onChange={(e) => setSex(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#091d64] focus:border-[#091d64] transition-colors"
                  required
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>
            </div>

            {/* Residential Address */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Residential Address in Barangay {currentBarangay?.name} <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input 
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder={`Zone / Purok, Barangay ${currentBarangay?.name}, Naga City`}
                  className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#091d64] focus:border-[#091d64] transition-colors"
                  required
                />
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              </div>
            </div>

            {/* Password Setup */}
            <div className="space-y-4 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Create Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a secure password"
                    className="w-full pl-9 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#091d64] focus:border-[#091d64] transition-colors"
                    required
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Confirm Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    className="w-full pl-9 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#091d64] focus:border-[#091d64] transition-colors"
                    required
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onLogout}
                className="px-4 py-2.5 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel & Sign Out
              </button>

              <button 
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-2.5 px-4 bg-[#091d64] hover:bg-[#112d75] disabled:opacity-60 text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Saving Profile & Unlocking Dashboard...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                    <span>Save Profile & Enter Portal</span>
                  </>
                )}
              </button>
            </div>

          </form>

        </div>
      </div>
    </div>
  );
}

