import React, { useState } from 'react';
import logoWBg from '../assets/images/Logo w bg.png';
import { 
  Building, 
  Users, 
  Calendar, 
  DollarSign, 
  Shield, 
  ArrowRight, 
  Check, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  BookOpen, 
  HeartHandshake, 
  FileText,
  Lock,
  Upload,
  Eye,
  ChevronLeft,
  ChevronDown,
  Globe,
  Loader2,
  AlertCircle,
  CheckCircle2,
  EyeOff,
  ShieldCheck
} from 'lucide-react';
import { BarangayTenant, Program, YouthProfile, UserRole } from '../types';
import { kabisigApi } from '../lib/api';

export function validatePassword(password: string) {
  return {
    minLength: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSymbol: /[^A-Za-z0-9]/.test(password),
  };
}

export function DecorativeBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      <svg className="absolute top-0 left-0 w-[min(64vw,64vh)] aspect-square opacity-90" viewBox="0 0 500 500" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M-80 -80 C 180 -80, 260 160, 160 320 C 80 440, -80 380, -80 380 Z" fill="rgba(30, 58, 138, 0.08)" />
        <path d="M-120 -120 C 120 -120, 220 70, 120 250 C 50 350, -120 300, -120 300 Z" fill="rgba(219, 39, 119, 0.06)" />
        <path d="M-50 -50 C 80 -50, 180 200, 110 210 C 20 280, -50 220, -50 220 Z" fill="rgba(251, 191, 36, 0.05)" />
        <circle cx="120" cy="120" r="5" fill="rgba(30, 58, 138, 0.35)" />
        <circle cx="220" cy="80" r="6" fill="rgba(30, 58, 138, 0.25)" />
        <circle cx="180" cy="250" r="5" fill="rgba(219, 39, 119, 0.3)" />
        <circle cx="60" cy="300" r="5" fill="rgba(30, 58, 138, 0.3)" />
        <line x1="120" y1="120" x2="220" y2="80" stroke="rgba(30, 58, 138, 0.15)" strokeWidth="1.5" />
        <line x1="120" y1="120" x2="180" y2="250" stroke="rgba(30, 58, 138, 0.15)" strokeWidth="1.5" />
        <line x1="180" y1="250" x2="60" y2="300" stroke="rgba(30, 58, 138, 0.15)" strokeWidth="1.5" />
        <line x1="60" y1="300" x2="120" y2="120" stroke="rgba(30, 58, 138, 0.15)" strokeWidth="1.5" />
      </svg>

      <svg className="absolute top-0 right-0 w-[min(54vw,54vh)] aspect-square opacity-90" viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M450 -50 C 280 -50, 220 120, 300 240 C 360 320, 450 280, 450 280 Z" fill="rgba(219, 39, 119, 0.06)" />
        <path d="M480 -80 C 320 -80, 250 50, 320 180 C 370 260, 480 220, 480 220 Z" fill="rgba(251, 191, 36, 0.05)" />
      </svg>

      <svg className="absolute bottom-0 left-0 w-[min(54vw,54vh)] aspect-square opacity-90" viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M-50 450 C 120 450, 180 280, 100 160 C 40 80, -50 120, -50 120 Z" fill="rgba(219, 39, 119, 0.06)" />
        <path d="M-80 480 C 80 480, 150 350, 80 220 C 30 140, -80 180, -80 180 Z" fill="rgba(251, 191, 36, 0.05)" />
      </svg>

      <svg className="absolute bottom-0 right-0 w-[min(64vw,64vh)] aspect-square opacity-90" viewBox="0 0 500 500" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M580 580 C 320 580, 240 340, 340 180 C 420 60, 580 120, 580 120 Z" fill="rgba(30, 58, 138, 0.08)" />
        <path d="M620 620 C 380 620, 280 430, 380 250 C 450 150, 620 200, 620 200 Z" fill="rgba(219, 39, 119, 0.06)" />
        <path d="M550 550 C 420 550, 320 300, 390 290 C 480 220, 550 280, 550 280 Z" fill="rgba(251, 191, 36, 0.05)" />
        <circle cx="380" cy="380" r="5" fill="rgba(30, 58, 138, 0.35)" />
        <circle cx="280" cy="420" r="6" fill="rgba(219, 39, 119, 0.3)" />
        <circle cx="320" cy="250" r="5" fill="rgba(30, 58, 138, 0.3)" />
        <circle cx="440" cy="200" r="5" fill="rgba(251, 191, 36, 0.4)" />
        <line x1="380" y1="380" x2="280" y2="420" stroke="rgba(30, 58, 138, 0.15)" strokeWidth="1.5" />
        <line x1="380" y1="380" x2="320" y2="250" stroke="rgba(30, 58, 138, 0.15)" strokeWidth="1.5" />
        <line x1="320" y1="250" x2="440" y2="200" stroke="rgba(30, 58, 138, 0.15)" strokeWidth="1.5" />
        <line x1="440" y1="200" x2="380" y2="380" stroke="rgba(30, 58, 138, 0.15)" strokeWidth="1.5" />
      </svg>
    </div>
  );
}

export function KabisigLogo({ className = "w-28" }: { className?: string }) {
  return (
    <div className={`flex flex-col items-center text-center select-none ${className}`}>
      <img 
        src={logoWBg.src}
        alt="KABISIG Logo" 
        className="w-[220px] max-w-full h-auto object-contain"
        referrerPolicy="no-referrer"
      />
    </div>
  );
}

interface PublicPagesProps {
  onLogin: (email: string, role: UserRole, barangayId?: string, userObj?: any) => void;
  onSignUp: (profile: Partial<YouthProfile>) => void;
  barangays: BarangayTenant[];
  programs: Program[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function PublicPages({
  onLogin,
  onSignUp,
  barangays,
  programs,
  activeTab,
  setActiveTab
}: PublicPagesProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSubmittingSignUp, setIsSubmittingSignUp] = useState(false);

  // Chairperson Password Setup State
  const [isChairpersonSetup, setIsChairpersonSetup] = useState(false);
  const [chairpersonFullName, setChairpersonFullName] = useState('');
  const [chairpersonPassword, setChairpersonPassword] = useState('');
  const [chairpersonConfirmPassword, setChairpersonConfirmPassword] = useState('');
  const [showChairpersonPass, setShowChairpersonPass] = useState(false);
  const [showChairpersonConfirm, setShowChairpersonConfirm] = useState(false);
  const [setupBarangayName, setSetupBarangayName] = useState('');
  const [setupTenantId, setSetupTenantId] = useState('');
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);

  // Auto-detect invite link parameter on mount
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const inviteEmail = params.get('invite_email');
      const tenantId = params.get('tenant_id');
      if (inviteEmail) {
        setEmail(inviteEmail);
        setIsChairpersonSetup(true);
        if (tenantId) {
          setSetupTenantId(tenantId);
          const bgy = barangays.find((b) => b.id === tenantId);
          if (bgy) setSetupBarangayName(bgy.name);
        }
      }
    }
  }, [barangays]);

  // Sign up state (Multi-step)
  const [signUpStep, setSignUpStep] = useState(1);
  const [signUpBarangayId, setSignUpBarangayId] = useState('');
  const [signUpForm, setSignUpForm] = useState({
    name: '',
    sex: 'Male' as 'Male' | 'Female',
    birthdate: '',
    age: 0,
    mobile: '',
    email: '',
    address: '',
    zone: 'Zone 1',
    school: '',
    educationalLevel: 'College' as any,
    course: '',
    year: '1st Year',
    scholarStatus: 'Non-Scholar' as 'Scholar' | 'Non-Scholar',
    password: '',
    confirmPassword: '',
    agreeTerms: false,
    profilePic: undefined,
    registeredRole: '' as any
  });

  const handleBirthdateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dob = e.target.value;
    const birthDate = new Date(dob);
    const difference = Date.now() - birthDate.getTime();
    const ageDate = new Date(difference);
    const calculatedAge = Math.abs(ageDate.getUTCFullYear() - 1970);
    setSignUpForm({
      ...signUpForm,
      birthdate: dob,
      age: isNaN(calculatedAge) ? 0 : calculatedAge
    });
  };

  const handleSignIn = async () => {
    setLoginError(null);
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setLoginError('Please enter your KABISIG email address.');
      return;
    }
    if (!password) {
      setLoginError('Please enter your password.');
      return;
    }

    setIsLoggingIn(true);
    try {
      const res = await kabisigApi.login(cleanEmail, password);
      if (!res.success || !res.token) {
        setLoginError(res.message || 'Invalid login credentials. Please check your email and password.');
        setIsLoggingIn(false);
        return;
      }

      const dbUser = res.user;
      const roleId = dbUser?.role_id;
      let finalRole: UserRole = 'Youth Constituent';
      let finalBarangay = dbUser?.tenant_id || '';

      // Direct Role Resolution from Database
      if (roleId === 1) {
        finalRole = 'Super Admin';
        finalBarangay = '';
      } else if (roleId === 2) {
        finalRole = 'Barangay Admin';
      } else if (roleId === 3) {
        const registeredRole = dbUser?.official_position
          || dbUser?.user_metadata?.role
          || dbUser?.role;
        finalRole = registeredRole === 'SK Secretary'
          ? 'SK Secretary'
          : registeredRole === 'SK Treasurer'
            ? 'SK Treasurer'
            : 'SK Kagawad';
      } else {
        finalRole = 'Youth Constituent';
      }

      if (dbUser?.status === 'pending') {
        alert('Access Denied!\n\nYour account is currently PENDING approval by your Sangguniang Kabataan Chairperson.');
        setIsLoggingIn(false);
        return;
      }
      if (dbUser?.status === 'rejected') {
        alert('Access Denied!\n\nYour account application was rejected.');
        setIsLoggingIn(false);
        return;
      }

      onLogin(cleanEmail, finalRole, finalBarangay, dbUser);
    } catch (err: any) {
      setLoginError(err.message || 'Network error: Backend server unavailable.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSetupChairpersonPassword = async () => {
    setSetupError(null);
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setSetupError('Please enter your KABISIG email address.');
      return;
    }
    if (!chairpersonPassword) {
      setSetupError('Please create your password.');
      return;
    }
    if (!chairpersonConfirmPassword) {
      setSetupError('Please confirm your password.');
      return;
    }
    if (chairpersonPassword !== chairpersonConfirmPassword) {
      setSetupError('Password and Confirm Password do not match.');
      return;
    }

    const checks = validatePassword(chairpersonPassword);
    if (!checks.minLength || !checks.hasUpper || !checks.hasLower || !checks.hasNumber || !checks.hasSymbol) {
      setSetupError('Password does not meet all security criteria listed below.');
      return;
    }

    setIsSettingUp(true);
    try {
      const res = await kabisigApi.setupChairpersonPassword({
        email: cleanEmail,
        password: chairpersonPassword,
        confirmPassword: chairpersonConfirmPassword,
        full_name: chairpersonFullName.trim() || 'Hon. SK Chairperson',
      });

      if (!res.success || !res.user) {
        setSetupError(res.message || 'Password setup failed. Please check your inputs and try again.');
        setIsSettingUp(false);
        return;
      }

      const dbUser = res.user;
      const targetTenant = dbUser.tenant_id || setupTenantId || 'b0222222-2222-4000-8000-000000000012';

      // Automatically log in as Barangay Admin to route directly into Chairperson Dashboard
      onLogin(cleanEmail, 'Barangay Admin', targetTenant, dbUser);
    } catch (err: any) {
      setSetupError(err.message || 'Network error setting up Chairperson password.');
    } finally {
      setIsSettingUp(false);
    }
  };

  const handleSignUpSubmit = async () => {
    const resolvedBarangayId = signUpBarangayId || barangays[0]?.id || '';
    if (!resolvedBarangayId) {
      alert('Barangay registry is unavailable right now. Please try again later.');
      return;
    }
    if (!signUpForm.registeredRole) {
      alert('Please select your Desired KABISIG Role.');
      return;
    }
    if (!signUpForm.email.trim()) {
      alert('Please enter your KABISIG email address.');
      return;
    }
    if (!signUpForm.agreeTerms) {
      alert('Please consent to the Data Privacy guidelines before proceeding.');
      return;
    }

    const checks = validatePassword(signUpForm.password);
    if (!checks.minLength || !checks.hasUpper || !checks.hasLower || !checks.hasNumber || !checks.hasSymbol) {
      alert('Password is not secure! It must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, one number, and one symbol.');
      return;
    }

    if (signUpForm.password !== signUpForm.confirmPassword) {
      alert('Passwords do not match.');
      return;
    }

    setIsSubmittingSignUp(true);

    const newProfile: Partial<YouthProfile> = {
      name: signUpForm.name || 'Anonymous User',
      sex: signUpForm.sex,
      birthdate: signUpForm.birthdate,
      age: signUpForm.age,
      mobile: signUpForm.mobile,
      email: signUpForm.email,
      address: signUpForm.address,
      zone: signUpForm.zone,
      school: signUpForm.school,
      educationalLevel: signUpForm.educationalLevel,
      course: signUpForm.course,
      year: signUpForm.year,
      scholarStatus: signUpForm.scholarStatus,
      status: 'Pending',
      dateRegistered: new Date().toISOString().split('T')[0],
      profilePic: signUpForm.profilePic,
      registeredRole: signUpForm.registeredRole,
      barangayId: resolvedBarangayId
    };

    try {
      const isOfficial = signUpForm.registeredRole !== 'Youth Constituent';
      if (isOfficial) {
        const res = await kabisigApi.registerOfficial({
          email: signUpForm.email.trim(),
          password: signUpForm.password,
          full_name: signUpForm.name.trim(),
          barangay_id: resolvedBarangayId,
          role: signUpForm.registeredRole || 'SK_OFFICIAL',
          phone: signUpForm.mobile.trim(),
        });
        if (!res.success) {
          const detail = typeof res.error === 'object' && res.error !== null
            ? Object.entries(res.error).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join('; ')
            : (typeof res.error === 'string' ? res.error : '');
          alert(`Official registration failed: ${res.message || 'Error occurred.'}${detail ? `\nDetails: ${detail}` : ''}`);
          setIsSubmittingSignUp(false);
          return;
        }
      } else {
        const validEduStatuses = ['Elementary', 'High School', 'Vocational', 'College', 'Post-Graduate', 'Out of School Youth'];
        const isEdu = validEduStatuses.includes(signUpForm.educationalLevel);
        const educationalStatus = isEdu ? signUpForm.educationalLevel : undefined;
        let employmentStatus: 'Employed' | 'Unemployed' | 'Self-Employed' | 'Student' | undefined;
        if (signUpForm.educationalLevel === 'Employed') {
          employmentStatus = 'Employed';
        } else if (signUpForm.educationalLevel === 'Unemployed' || signUpForm.educationalLevel === 'Out of School Youth') {
          employmentStatus = 'Unemployed';
        } else {
          employmentStatus = 'Student';
        }

        const res = await kabisigApi.registerYouth({
          email: signUpForm.email.trim(),
          password: signUpForm.password,
          full_name: signUpForm.name.trim(),
          barangay_id: resolvedBarangayId,
          phone: signUpForm.mobile.trim(),
          profile_pic: typeof signUpForm.profilePic === 'string' ? signUpForm.profilePic : undefined,
          birthdate: signUpForm.birthdate,
          sex: signUpForm.sex,
          address: `${signUpForm.address}, ${signUpForm.zone}`,
          educational_status: educationalStatus,
          employment_status: employmentStatus,
          school: signUpForm.school,
          course: signUpForm.course,
          year: signUpForm.year,
          is_registered_voter: true,
        });
        if (!res.success) {
          const detail = typeof res.error === 'object' && res.error !== null
            ? Object.entries(res.error).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join('; ')
            : (typeof res.error === 'string' ? res.error : '');
          const isExistingEmail = res.error?.code === 'EMAIL_ALREADY_REGISTERED';
          alert(`Youth registration failed: ${res.message || 'Error occurred.'}${isExistingEmail ? '\n\nPlease use the Login tab for this account, or register with a different email address.' : ''}${detail && !isExistingEmail ? `\nDetails: ${detail}` : ''}`);
          setIsSubmittingSignUp(false);
          return;
        }
      }

      onSignUp(newProfile);
      alert('Registration submitted successfully!\n\nYour profile has been saved into the database and is pending validation by your Sangguniang Kabataan officials.');
      setActiveTab('login');
      setSignUpStep(1);
    } catch (err: any) {
      alert(`Registration error: ${err.message || 'Network error.'}`);
    } finally {
      setIsSubmittingSignUp(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 relative overflow-x-hidden">
      <main className="flex-grow">
        {(activeTab === 'home' || activeTab === 'login') && (
          <section className="relative min-h-screen">
            <div className="relative flex min-h-screen w-full items-center justify-center bg-[#f8fafc] px-4 py-12 sm:px-8">
              <DecorativeBackground />

            <div className="relative z-10 w-full max-w-[440px] flex flex-col items-center animate-in fade-in zoom-in-95 duration-300">
              <button onClick={() => setActiveTab('_landing')} className="self-start mb-4 inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#091d64] cursor-pointer transition-colors"><ChevronLeft className="w-4 h-4" /> Back to Home</button>
              <div className="w-full bg-white rounded-[2rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 sm:p-10 flex flex-col items-center">
                <KabisigLogo className="mb-0" />
                
                <div className="w-6 h-0.5 bg-amber-400 rounded-full mb-2"></div>
                
                {isChairpersonSetup ? (
                  <>
                    <div className="mb-4 text-center">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-[#091d64] border border-blue-100 rounded-full text-[10px] font-black uppercase tracking-wider mb-2">
                        <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                        SK Chairperson First-Time Setup
                      </span>
                      <p className="text-lg font-black uppercase tracking-[0.14em] text-[#091d64]">
                        Create Chairperson Password
                      </p>
                      <p className="text-xs text-slate-500 mt-1 max-w-xs">
                        {setupBarangayName ? `Jurisdiction: Barangay ${setupBarangayName}` : 'Set up your password to activate your official account'}
                      </p>
                    </div>

                    <div className="w-full space-y-3.5">
                      {/* Chairperson Email */}
                      <div>
                        <label className="block text-xs font-bold text-slate-900 mb-1 font-sans">
                          Official Email Address <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative w-full">
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 transition-colors font-mono text-xs"
                            placeholder="e.g. avinzon@gbox.adnu.edu.ph"
                            required
                          />
                          <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </div>

                      {/* Chairperson Full Name (Optional) */}
                      <div>
                        <label className="block text-xs font-bold text-slate-900 mb-1 font-sans">
                          Chairperson Full Name <span className="text-slate-400 font-normal">(Optional)</span>
                        </label>
                        <div className="relative w-full">
                          <input
                            type="text"
                            value={chairpersonFullName}
                            onChange={(e) => setChairpersonFullName(e.target.value)}
                            className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 transition-colors"
                            placeholder="Hon. Ashley Kyla D. Vinzon"
                          />
                          <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </div>

                      {/* Create Password */}
                      <div>
                        <label className="block text-xs font-bold text-slate-900 mb-1 font-sans">
                          Create Password <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative w-full">
                          <input
                            type={showChairpersonPass ? "text" : "password"}
                            value={chairpersonPassword}
                            onChange={(e) => setChairpersonPassword(e.target.value)}
                            className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 transition-colors"
                            placeholder="Create strong password"
                            required
                          />
                          <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <button
                            type="button"
                            onClick={() => setShowChairpersonPass(!showChairpersonPass)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                          >
                            {showChairpersonPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Confirm Password */}
                      <div>
                        <label className="block text-xs font-bold text-slate-900 mb-1 font-sans">
                          Confirm Password <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative w-full">
                          <input
                            type={showChairpersonConfirm ? "text" : "password"}
                            value={chairpersonConfirmPassword}
                            onChange={(e) => setChairpersonConfirmPassword(e.target.value)}
                            className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 transition-colors"
                            placeholder="Confirm strong password"
                            required
                          />
                          <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <button
                            type="button"
                            onClick={() => setShowChairpersonConfirm(!showChairpersonConfirm)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                          >
                            {showChairpersonConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Password Checklist */}
                      {(() => {
                        const checks = validatePassword(chairpersonPassword);
                        const match = chairpersonPassword.length > 0 && chairpersonPassword === chairpersonConfirmPassword;
                        const allPass = checks.minLength && checks.hasUpper && checks.hasLower && checks.hasNumber && checks.hasSymbol && match;
                        if (allPass) return null;
                        return (
                          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-[11px]">
                            <p className="font-bold text-slate-600 mb-1">Password Requirements:</p>
                            <div className="grid grid-cols-2 gap-1 text-[10px]">
                              <div className={`flex items-center gap-1.5 ${checks.minLength ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
                                {checks.minLength ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <div className="w-3 h-3 rounded-full border border-slate-300 shrink-0" />}
                                <span>8+ characters</span>
                              </div>
                              <div className={`flex items-center gap-1.5 ${checks.hasUpper ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
                                {checks.hasUpper ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <div className="w-3 h-3 rounded-full border border-slate-300 shrink-0" />}
                                <span>Uppercase (A-Z)</span>
                              </div>
                              <div className={`flex items-center gap-1.5 ${checks.hasLower ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
                                {checks.hasLower ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <div className="w-3 h-3 rounded-full border border-slate-300 shrink-0" />}
                                <span>Lowercase (a-z)</span>
                              </div>
                              <div className={`flex items-center gap-1.5 ${checks.hasNumber ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
                                {checks.hasNumber ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <div className="w-3 h-3 rounded-full border border-slate-300 shrink-0" />}
                                <span>Number (0-9)</span>
                              </div>
                              <div className={`flex items-center gap-1.5 ${checks.hasSymbol ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
                                {checks.hasSymbol ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <div className="w-3 h-3 rounded-full border border-slate-300 shrink-0" />}
                                <span>Symbol (!@#$...)</span>
                              </div>
                              <div className={`flex items-center gap-1.5 ${match ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
                                {match ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <div className="w-3 h-3 rounded-full border border-slate-300 shrink-0" />}
                                <span>Passwords match</span>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {setupError && (
                        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2 animate-in fade-in">
                          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                          <span className="leading-snug">{setupError}</span>
                        </div>
                      )}

                      <button
                        type="button"
                        disabled={isSettingUp}
                        onClick={handleSetupChairpersonPassword}
                        className="w-full py-3.5 bg-[#133285] hover:bg-[#112d75] disabled:opacity-60 text-white font-sans font-bold rounded-xl shadow-sm transition-all active:scale-[0.99] text-xs flex items-center justify-center gap-2 cursor-pointer mt-2"
                      >
                        {isSettingUp ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-white" />
                            <span>Configuring Chairperson Account...</span>
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="w-4 h-4 text-amber-300" />
                            <span>Save Password & Open Chairperson Dashboard</span>
                          </>
                        )}
                      </button>

                      <div className="text-center pt-2">
                        <button
                          type="button"
                          onClick={() => setIsChairpersonSetup(false)}
                          className="text-xs text-slate-500 hover:text-slate-800 font-medium hover:underline cursor-pointer"
                        >
                          Already have a password? Return to standard sign in
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mb-4 text-center">
                      <p className="text-lg font-black uppercase tracking-[0.18em] text-[#091d64]">Welcome to KABISIG</p>
                    </div>

                    <div className="w-full space-y-4">
                      {/* Email */}
                      <div>
                        <label className="block text-xs font-bold text-slate-900 mb-1.5 font-sans">
                          KABISIG Email
                        </label>
                        <div className="relative w-full">
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300 focus:border-slate-300 transition-colors"
                            placeholder="Enter KABISIG Email"
                            required
                          />
                          <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </div>

                      {/* Password */}
                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <label className="block text-xs font-bold text-slate-900 font-sans">
                            Password
                          </label>
                          <button type="button" onClick={async () => { if (!email.trim()) { alert('Please enter your registered email address first, then click Forgot Password.'); return; } try { const res = await kabisigApi.requestPasswordReset(email.trim()); alert(res.success ? 'Password reset instructions have been sent to ' + email + '. Please check your inbox.' : 'Error: ' + (res.message || 'Could not send reset link.')); } catch (err) { alert('Error: ' + (err.message || 'Could not send reset link.')); } }} className="text-xs text-[#1a237e] font-bold hover:underline cursor-pointer">Forgot Password?</button>
                        </div>
                        <div className="relative w-full">
                          <input
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300 focus:border-slate-300 transition-colors"
                            placeholder="Enter Password"
                            required
                          />
                          <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Link to Chairperson First-Time Setup */}
                      <div className="text-center pt-0.5">
                      </div>

                      {/* Login Error Notification */}
                      {loginError && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2 animate-in fade-in">
                          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                          <span className="leading-snug">{loginError}</span>
                        </div>
                      )}

                      <button
                        disabled={isLoggingIn}
                        onClick={handleSignIn}
                        className="w-full py-3.5 bg-[#133285] hover:bg-[#112d75] disabled:opacity-60 text-white font-sans font-bold rounded-xl shadow-sm transition-all active:scale-[0.99] text-sm flex items-center justify-center gap-2 cursor-pointer mt-2"
                      >
                        {isLoggingIn ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-white" />
                            <span>Authenticating with Database...</span>
                          </>
                        ) : (
                          <span>Sign In to Portal</span>
                        )}
                      </button>
                    </div>
                  </>
                )}
                
                <div className="relative flex py-5 items-center w-full">
                  <div className="flex-grow border-t border-slate-100"></div>
                  <span className="flex-shrink mx-4 text-xs text-slate-400 font-normal">or</span>
                  <div className="flex-grow border-t border-slate-100"></div>
                </div>

                {/* Transparency Button */}
                <div className="w-full">
                  <button
                    onClick={() => onLogin('viewer@kabisig.ph', 'Viewer')}
                    className="w-full py-3 bg-[#eef2ff] hover:bg-[#e0e7ff] text-[#4f46e5] font-sans font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Globe className="w-4 h-4 text-[#4f46e5]" />
                    View Public Transparency Portal
                  </button>
                </div>

                {/* Register Link */}
                <div className="mt-6 text-center text-xs text-slate-500 font-sans">
                  New to KABISIG?{' '}
                  <button 
                    onClick={() => { setActiveTab('signup'); setSignUpStep(1); }}
                    className="text-[#1a237e] font-bold hover:underline transition-colors cursor-pointer"
                  >
                    Create Account
                  </button>
                </div>
              </div>
            </div>
            </div>
          </section>
        )}

        {/* YOUTH SIGN UP MULTI-STEP PAGE */}
        {activeTab === 'signup' && (
          <section className="relative min-h-screen flex flex-col items-center justify-center bg-white px-4 py-12">
            <DecorativeBackground />

            <div className="relative z-10 w-full max-w-[500px]">
              <div id="signup-card" className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden p-8 sm:p-10 relative">
                
                {signUpStep > 1 && (
                  <button 
                    type="button"
                    onClick={() => setSignUpStep(signUpStep - 1)}
                    className="absolute top-6 left-6 text-slate-500 hover:text-slate-800 flex items-center gap-1.5 text-xs font-bold transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Back
                  </button>
                )}

                <div className="flex flex-col items-center mb-4">
                  <KabisigLogo className="mb-2" />
                  <div className="w-6 h-0.5 bg-amber-400 rounded-full mb-3"></div>
                </div>

                <div className="flex w-full p-1 bg-slate-100 rounded-xl mb-5 border border-slate-200/70">
                  <button
                    type="button"
                    onClick={() => { setActiveTab('login'); }}
                    className="flex-1 py-2 text-xs font-bold rounded-lg transition-all text-slate-500 hover:text-slate-900 cursor-pointer"
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => { setActiveTab('signup'); setSignUpStep(1); }}
                    className="flex-1 py-2 text-xs font-bold rounded-lg transition-all bg-white text-[#133285] shadow-xs cursor-pointer"
                  >
                    Create Account
                  </button>
                </div>

                <div className="text-center mb-6">
                  {signUpStep === 1 && (
                    <>
                      <h2 className="font-sans font-extrabold text-[#091d64] text-lg tracking-[0.1em] uppercase mb-1.5">
                        CREATE YOUR PROFILE
                      </h2>
                      <p className="text-xs text-slate-500">
                        Select your role and provide your basic personal details.
                      </p>
                    </>
                  )}
                  {signUpStep === 2 && (
                    <>
                      <h2 className="font-sans font-extrabold text-[#091d64] text-lg tracking-[0.1em] uppercase mb-1.5">
                        CONTACT & RESIDENCY
                      </h2>
                      <p className="text-xs text-slate-500">
                        Provide your current phone number and purok/zone.
                      </p>
                    </>
                  )}
                  {signUpStep === 3 && (
                    <>
                      <h2 className="font-sans font-extrabold text-[#091d64] text-lg tracking-[0.1em] uppercase mb-1.5">
                        EDUCATION & STATUS
                      </h2>
                      <p className="text-xs text-slate-500">
                        Specify your current status and school or institution.
                      </p>
                    </>
                  )}
                  {signUpStep === 4 && (
                    <>
                      <h2 className="font-sans font-extrabold text-[#091d64] text-lg tracking-[0.1em] uppercase mb-1.5">
                        CREATE YOUR ACCOUNT
                      </h2>
                      <p className="text-xs text-slate-500">
                        Fill in the details below to complete your KABISIG account.
                      </p>
                    </>
                  )}
                </div>

                <div className="space-y-4">
                  {signUpStep === 1 && (
                    <div className="space-y-4">
                      {/* Barangay Selection */}
                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <label className="block text-xs font-bold text-slate-700 font-sans">
                            Home Barangay<span className="text-red-500">*</span>
                          </label>
                          <a 
                            href="#barangay-info" 
                            onClick={(e) => { e.preventDefault(); alert('Barangay information is sourced from the official KABISIG registry and is used for tenant association.'); }}
                            className="text-[10px] text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded"
                          >
                            27 Naga Barangays
                          </a>
                        </div>
                        <div className="relative w-full">
                          <select 
                            value={signUpBarangayId}
                            onChange={(e) => setSignUpBarangayId(e.target.value)}
                            className="w-full pl-3.5 pr-10 py-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300 focus:border-slate-300 transition-colors font-bold cursor-pointer appearance-none"
                          >
                            <option value=""></option>
                            {barangays.map(b => (
                              <option key={b.id} value={b.id}>Barangay {b.name}</option>
                            ))}
                          </select>
                          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </div>

                      {/* Role Selection */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5 font-sans">
                          Select Role / Position <span className="text-red-500">*</span>
                        </label>
                        <div className="relative w-full">
                          <select 
                            value={signUpForm.registeredRole}
                            onChange={(e) => setSignUpForm({...signUpForm, registeredRole: e.target.value as any})}
                            className="w-full pl-3.5 pr-10 py-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300 focus:border-slate-300 transition-colors font-semibold cursor-pointer appearance-none"
                          >
                            <option value=""></option>
                            <option value="Youth Constituent">Youth Constituent (KK Member)</option>
                            <option value="SK Kagawad">SK Kagawad</option>
                            <option value="SK Secretary">SK Secretary</option>
                            <option value="SK Treasurer">SK Treasurer</option>
                          </select>
                          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </div>

                      {/* Full Name */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5 font-sans">
                          Full Name <span className="text-red-500">*</span>
                        </label>
                        <div className="relative w-full">
                          <input
                            type="text"
                            value={signUpForm.name}
                            onChange={(e) => setSignUpForm({...signUpForm, name: e.target.value})}
                            className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300 focus:border-slate-300 transition-colors"
                            placeholder="Enter your full name"
                            required
                          />
                          <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5 font-sans">
                            Biological Sex <span className="text-red-500">*</span>
                          </label>
                          <div className="relative w-full">
                            <select 
                              value={signUpForm.sex}
                              onChange={(e) => setSignUpForm({...signUpForm, sex: e.target.value as any})}
                              className="w-full pl-3.5 pr-8 py-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none appearance-none cursor-pointer"
                            >
                              <option value="Male">Male</option>
                              <option value="Female">Female</option>
                            </select>
                            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5 font-sans">
                            Birthdate <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="date"
                            value={signUpForm.birthdate}
                            onChange={handleBirthdateChange}
                            className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {signUpStep === 2 && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5 font-sans">
                          Mobile Phone Number <span className="text-red-500">*</span>
                        </label>
                        <div className="relative w-full">
                          <input
                            type="tel"
                            value={signUpForm.mobile}
                            onChange={(e) => {
                              const sanitized = e.target.value.replace(/[^0-9+\s()-]/g, '');
                              setSignUpForm({...signUpForm, mobile: sanitized});
                            }}
                            className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300 focus:border-slate-300 transition-colors"
                            placeholder="09123456789 (Numbers only)"
                            required
                          />
                          <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-2">
                          <label className="block text-xs font-bold text-slate-700 mb-1.5 font-sans">
                            Street Address <span className="text-red-500">*</span>
                          </label>
                          <div className="relative w-full">
                            <input
                              type="text"
                              value={signUpForm.address}
                              onChange={(e) => setSignUpForm({...signUpForm, address: e.target.value})}
                              className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
                              placeholder="House No., Street"
                              required
                            />
                            <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5 font-sans">
                            Zone / Purok <span className="text-red-500">*</span>
                          </label>
                          <div className="relative w-full">
                            <select
                              value={signUpForm.zone}
                              onChange={(e) => setSignUpForm({...signUpForm, zone: e.target.value})}
                              className="w-full pl-2 pr-7 py-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none appearance-none cursor-pointer"
                            >
                              <option value="Zone 1">Zone 1</option>
                              <option value="Zone 2">Zone 2</option>
                              <option value="Zone 3">Zone 3</option>
                              <option value="Zone 4">Zone 4</option>
                              <option value="Zone 5">Zone 5</option>
                              <option value="Zone 6">Zone 6</option>
                              <option value="Zone 7">Zone 7</option>
                            </select>
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {signUpStep === 3 && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5 font-sans">
                          Status <span className="text-red-500">*</span>
                        </label>
                        <div className="relative w-full">
                          <select 
                            value={signUpForm.educationalLevel}
                            onChange={(e) => setSignUpForm({...signUpForm, educationalLevel: e.target.value as any})}
                            className="w-full pl-3 pr-8 py-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none appearance-none cursor-pointer"
                          >
                            <option value="High School">High School</option>
                            <option value="College">College Student</option>
                            <option value="Vocational">Vocational</option>
                            <option value="Employed">Employed / Working</option>
                            <option value="Unemployed">Unemployed</option>
                            <option value="Out of School Youth">Out of School</option>
                          </select>
                          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5 font-sans">
                          School / Institution
                        </label>
                        <div className="relative w-full">
                          <input
                            type="text"
                            value={signUpForm.school}
                            onChange={(e) => setSignUpForm({...signUpForm, school: e.target.value})}
                            className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
                            placeholder="Enter your school or institution"
                          />
                          <BookOpen className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                        </div>
                      </div>
                    </div>
                  )}

                  {signUpStep === 4 && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5 font-sans">
                          KABISIG Email
                        </label>
                        <div className="relative w-full">
                          <input
                            type="email"
                            value={signUpForm.email}
                            onChange={(e) => setSignUpForm({...signUpForm, email: e.target.value})}
                            className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300 focus:border-slate-300 transition-colors"
                            placeholder="Enter your KABISIG email address"
                            required
                          />
                          <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5 font-sans">
                          Password
                        </label>
                        <div className="relative w-full">
                          <input
                            type={showPassword ? "text" : "password"}
                            value={signUpForm.password}
                            onChange={(e) => setSignUpForm({...signUpForm, password: e.target.value})}
                            className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300 focus:border-slate-300 transition-colors"
                            placeholder="Enter secure password"
                            required
                          />
                          <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                        
                        {(() => {
                          const checks = validatePassword(signUpForm.password);
                          const allPass = checks.minLength && checks.hasUpper && checks.hasLower && checks.hasNumber && checks.hasSymbol;
                          if (allPass) return null;
                          return (
                            <div className="mt-2 p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1.5 text-[11px]">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                                Password Requirements:
                              </span>
                              <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                                <div className={`flex items-center gap-1.5 ${checks.minLength ? 'text-emerald-600 font-semibold' : 'text-slate-400'}`}>
                                  <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${checks.minLength ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                                    {checks.minLength ? '✓' : '•'}
                                  </span>
                                  <span>At least 8 characters</span>
                                </div>
                                <div className={`flex items-center gap-1.5 ${checks.hasUpper ? 'text-emerald-600 font-semibold' : 'text-slate-400'}`}>
                                  <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${checks.hasUpper ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                                    {checks.hasUpper ? '✓' : '•'}
                                  </span>
                                  <span>1 Uppercase (A-Z)</span>
                                </div>
                                <div className={`flex items-center gap-1.5 ${checks.hasLower ? 'text-emerald-600 font-semibold' : 'text-slate-400'}`}>
                                  <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${checks.hasLower ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                                    {checks.hasLower ? '✓' : '•'}
                                  </span>
                                  <span>1 Lowercase (a-z)</span>
                                </div>
                                <div className={`flex items-center gap-1.5 ${checks.hasNumber ? 'text-emerald-600 font-semibold' : 'text-slate-400'}`}>
                                  <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${checks.hasNumber ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                                    {checks.hasNumber ? '✓' : '•'}
                                  </span>
                                  <span>1 Number (0-9)</span>
                                </div>
                                <div className={`flex items-center gap-1.5 col-span-2 ${checks.hasSymbol ? 'text-emerald-600 font-semibold' : 'text-slate-400'}`}>
                                  <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${checks.hasSymbol ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                                    {checks.hasSymbol ? '✓' : '•'}
                                  </span>
                                  <span>1 Symbol (!@#$%^&*...)</span>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5 font-sans">
                          Confirm Password
                        </label>
                        <div className="relative w-full">
                          <input
                            type={showConfirmPassword ? "text" : "password"}
                            value={signUpForm.confirmPassword}
                            onChange={(e) => setSignUpForm({...signUpForm, confirmPassword: e.target.value})}
                            className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300 focus:border-slate-300 transition-colors"
                            placeholder="Confirm your password"
                            required
                          />
                          <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-start gap-2 text-left mt-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-[10px] text-slate-500 leading-snug font-sans">
                        <input 
                          type="checkbox" 
                          id="privacy-consent" 
                          checked={signUpForm.agreeTerms} 
                          onChange={(e) => setSignUpForm({...signUpForm, agreeTerms: e.target.checked})} 
                          className="mt-0.5 h-4 w-4 rounded border border-slate-300 bg-slate-200 accent-[#091d64] checked:bg-[#091d64] checked:border-[#091d64] focus:ring-0" 
                        />
                        <label htmlFor="privacy-consent" className="cursor-pointer select-none">
                          I voluntarily consent to the secure collection and processing of my profiling data per <a href="/docs/privacy-consent.pdf" target="_blank" rel="noopener noreferrer" className="text-[#091d64] font-bold underline hover:text-blue-700">RA 10173 Privacy guidelines</a>.
                        </label>
                      </div>
                    </div>
                  )}

                  {signUpStep < 4 ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (signUpStep === 1) {
                          if (!signUpForm.registeredRole) { alert('Please select your Desired KABISIG Role.'); return; }
                          if (!signUpForm.name.trim()) { alert('Full Name is required.'); return; }
                          if (!signUpForm.birthdate) { alert('Birthdate is required.'); return; }
                        }
                        if (signUpStep === 2) {
                          if (!signUpForm.mobile.trim()) { alert('Mobile phone number is required.'); return; }
                          if (/[a-zA-Z]/i.test(signUpForm.mobile)) { alert('Mobile phone number can only contain numbers and cannot accept alphabetic letters.'); return; }
                          if (signUpForm.mobile.replace(/[^0-9]/g, '').length < 10) { alert('Please enter a valid mobile number (at least 10 digits).'); return; }
                          if (!signUpForm.address.trim()) { alert('Street address is required.'); return; }
                        }
                        if (signUpStep === 3) {
                          if (!signUpForm.educationalLevel.trim()) { alert('Status is required.'); return; }
                        }
                        setSignUpStep(signUpStep + 1);
                      }}
                      className="w-full mt-4 py-3 bg-[#091d64] hover:bg-[#061344] text-white font-bold rounded-lg shadow-sm transition-all active:scale-[0.99] text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
                    >
                      Continue
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isSubmittingSignUp || !signUpForm.agreeTerms}
                      onClick={handleSignUpSubmit}
                      className={`w-full mt-4 py-3 font-bold rounded-lg shadow-sm transition-all active:scale-[0.99] text-xs uppercase tracking-wider flex items-center justify-center gap-2 ${
                        signUpForm.agreeTerms
                          ? 'bg-[#091d64] hover:bg-[#061344] text-white cursor-pointer'
                          : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      {isSubmittingSignUp ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-white" />
                          <span>Saving to Database...</span>
                        </>
                      ) : (
                        <span>Complete Registration</span>
                      )}
                    </button>
                  )}
                </div>

                <div className="relative flex py-4 items-center w-full">
                  <div className="flex-grow border-t border-slate-100"></div>
                  <span className="flex-shrink mx-4 text-xs text-slate-400 font-normal">or</span>
                  <div className="flex-grow border-t border-slate-100"></div>
                </div>

                <div className="text-center text-xs text-slate-700 font-sans">
                  Already have an account?{' '}
                  <button 
                    type="button"
                    onClick={() => { setActiveTab('login'); setSignUpStep(1); }}
                    className="text-[#091d64] font-bold hover:underline transition-colors"
                  >
                    Log in
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}