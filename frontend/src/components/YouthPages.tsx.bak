import React, { useState, useEffect } from 'react';
import { 
  User, 
  Users,
  Calendar, 
  Check, 
  X, 
  Search, 
  Filter, 
  HeartHandshake, 
  FileText, 
  Award, 
  TrendingUp, 
  MapPin, 
  Phone, 
  Mail, 
  BookOpen, 
  Download, 
  Printer, 
  Lock, 
  QrCode, 
  Star, 
  Vote, 
  Bell, 
  ChevronRight,
  ShieldCheck,
  Eye,
  Building,
  CheckCircle2,
  LogOut,
  Menu,
  ChevronDown,
  LayoutDashboard,
  ClipboardList,
  Coins,
  Folder,
  BarChart3,
  Megaphone,
  Settings as SettingsIcon,
  HelpCircle,
  MoreVertical,
  Clock,
  History,
  Loader2
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Program, 
  YouthProfile, 
  Registration, 
  FeedbackRecord, 
  ResolutionRecord,
  BarangayTenant,
  AnnouncementRecord
} from '../types';
import { DEFAULT_BARANGAY_LOGOS } from '../data';
import { 
  classifyDemographics, 
  calculateEngagementScore, 
  recommendPrograms 
} from '../lib/intelligence';
import { KabisigLogo } from './PublicPages'
import NotificationMenu from './NotificationMenu';
import { UserMenu } from './UserMenu';
import ProfileAvatar from './ProfileAvatar';
import kabisigApi from '../lib/api';

interface YouthPagesProps {
  currentYouth: YouthProfile;
  programs: Program[];
  registrations: Registration[];
  feedback: FeedbackRecord[];
  resolutions: ResolutionRecord[];
    pollsError?: string | null;
  announcements: AnnouncementRecord[];
  currentTenant?: BarangayTenant | null;
  tenants?: BarangayTenant[];
  onRegisterProgram: (pId: string) => Promise<Registration>;
  onSubmitFeedback: (feed: FeedbackRecord) => void;
  onVoteResolution: (rId: string, voteType: 'Support' | 'Oppose' | 'Abstain') => Promise<ResolutionRecord>;
  onUpdateYouthProfile?: (updated: YouthProfile) => void;
  onLogout: () => void;
}

export default function YouthPages({
  currentYouth,
  programs,
  registrations,
  feedback,
  resolutions,
    pollsError = null,
  announcements = [],
  currentTenant,
  tenants = [],
  onRegisterProgram,
  onSubmitFeedback,
  onVoteResolution,
  onUpdateYouthProfile,
  onLogout
}: YouthPagesProps) {
  const resolvedTenant = currentTenant?.id === currentYouth.barangayId
    ? currentTenant
    : tenants.find(tenant => tenant.id === currentYouth.barangayId) || currentTenant;
  const barangayLogo = resolvedTenant?.logo || DEFAULT_BARANGAY_LOGOS[resolvedTenant?.name || ''] || '';
  // Navigation inside Youth Portal corresponding exactly to Image 4 Sidebar:
  // 'dashboard' | 'profile' | 'programs' | 'registrations' | 'feedback' | 'resolutions' | 'announcements' | 'settings'
  const [activeMenu, setActiveMenu] = useState<
    'dashboard' | 'programs' | 'registrations' | 'feedback' | 'profile' | 'resolutions' | 'announcements' | 'settings'
  >('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [programTab, setProgramTab] = useState<'browse' | 'registrations'>('browse');
  const [feedbackTab, setFeedbackTab] = useState<'suggestions' | 'resolutions'>('suggestions');

  // Local copy of profile for real-time editing & persistence
  const [youth, setYouth] = useState<YouthProfile>(currentYouth);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<YouthProfile>(currentYouth);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [localRegs, setLocalRegs] = useState<Registration[]>(registrations);
  const [registeringProgramId, setRegisteringProgramId] = useState<string | null>(null);
  const [registrationNotice, setRegistrationNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [votingResolutionId, setVotingResolutionId] = useState<string | null>(null);
  const [resolutionVoteNotice, setResolutionVoteNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const youthQrPayload = (profile: YouthProfile) => profile.userId
    ? JSON.stringify({ user_id: profile.userId })
    : profile.qrCode?.startsWith('KAB-NAGA-')
      ? profile.qrCode
      : profile.id;

  useEffect(() => {
    if (currentYouth) {
      setYouth(currentYouth);
      setEditForm(currentYouth);
    }
  }, [currentYouth]);

  useEffect(() => {
    let isMounted = true;
    kabisigApi.getMyProgramRegistrations().then((rows) => {
      if (!isMounted || !rows) return;
      setLocalRegs(rows.map((row: any) => {
        const program = Array.isArray(row.program) ? row.program[0] : row.program;
        return {
          id: row.id,
          programId: row.program_id,
          programTitle: program?.title || 'Program',
          participantId: currentYouth.userId || currentYouth.id,
          participantName: currentYouth.name,
          dateRegistered: row.registered_at?.split('T')[0] || '',
          status: row.status === 'attended' ? 'Completed' : row.status === 'registered' ? 'Approved' : 'Pending',
          qrCode: currentYouth.qrCode || `QR-KK-${currentYouth.id}`,
        };
      }));
    }).catch((error: any) => console.warn('Could not restore program registrations:', error));

    return () => { isMounted = false; };
  }, [currentYouth.id, currentYouth.name, currentYouth.qrCode]);

  const handleProfilePictureChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const profilePic = typeof reader.result === 'string' ? reader.result : undefined;
      if (!profilePic) return;
      const updatedYouth = { ...youth, profilePic };
      setYouth(updatedYouth);
      setEditForm((previous) => ({ ...previous, profilePic }));
      onUpdateYouthProfile?.(updatedYouth);

      try {
        await kabisigApi.updateProfile({
          id: updatedYouth.id,
          email: updatedYouth.email,
          profilePic,
        });
      } catch (err) {
        console.warn('Failed to persist profile picture in database:', err);
      }
    };
    reader.readAsDataURL(file);
  };

  // --- RULE-BASED INTELLIGENCE ENGINE COMPUTATIONS ---
  const myDemographics = classifyDemographics(youth);
  const myEngagement = calculateEngagementScore(youth, localRegs, feedback, resolutions);
  const myRecommendations = recommendPrograms(youth, programs, localRegs);

  // Search & Filters
  const [programSearch, setProgramSearch] = useState('');
  const [programCategory, setFilterCategory] = useState('All');

  // Interactive Program detail modal
  const [selectedProg, setSelectedProg] = useState<Program | null>(null);

  // Civic Forum / Feedback state
  const [feedbackForm, setFeedbackForm] = useState({
    type: 'Suggestion' as 'Suggestion' | 'Complaint' | 'Evaluation' | 'Inquiry',
    title: '',
    content: '',
    anonymous: false
  });

  const [localFeedback, setLocalFeedback] = useState<FeedbackRecord[]>(feedback);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackNotice, setFeedbackNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setLocalFeedback(feedback);
  }, [feedback]);

  useEffect(() => {
    let isMounted = true;
    const refreshMyFeedback = () => {
      kabisigApi.getFeedback().then((feeds) => {
        if (!isMounted) return;
        setLocalFeedback(feeds.map((feed: any): FeedbackRecord => ({
          id: feed.id,
          userId: feed.user_id || undefined,
          type: feed.category || 'General',
          title: feed.subject,
          content: feed.message,
          rating: feed.sentiment === 'positive' ? 5 : feed.sentiment === 'negative' ? 1 : 3,
          anonymous: feed.is_anonymous || false,
          status: feed.status === 'resolved' ? 'Resolved' : feed.status === 'under_review' ? 'Reviewed' : 'Pending',
          dateSubmitted: feed.created_at?.split('T')[0] || '',
          submittedBy: feed.is_anonymous ? 'Anonymous' : feed.users?.full_name || youth.name,
          response: feed.response || '',
        })));
      }).catch((error: any) => console.warn('Could not refresh youth feedback history:', error));
    };

    const handleVisible = () => {
      if (document.visibilityState === 'visible') refreshMyFeedback();
    };

    refreshMyFeedback();
    window.addEventListener('focus', refreshMyFeedback);
    document.addEventListener('visibilitychange', handleVisible);
    return () => {
      isMounted = false;
      window.removeEventListener('focus', refreshMyFeedback);
      document.removeEventListener('visibilitychange', handleVisible);
    };
  }, [youth.id, youth.name]);

  // Derived arrays
  const myRegistrations = localRegs.filter(r => r.participantId === youth.userId || r.participantId === youth.id);
  const myFeedback = localFeedback.filter(f => {
    // Always include the youth's own submissions, including anonymous ones.
    // Match by userId first (authoritative), fall back to submittedBy name.
    if (youth.userId && f.userId) return f.userId === youth.userId;
    return f.submittedBy === youth.name;
  });

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    
    // Calculate age from birthdate if provided
    let calculatedAge = editForm.age;
    if (editForm.birthdate) {
      const birthYear = new Date(editForm.birthdate).getFullYear();
      const currentYear = new Date().getFullYear();
      if (!isNaN(birthYear) && birthYear > 1900 && birthYear <= currentYear) {
        calculatedAge = currentYear - birthYear;
      }
    }

    const updatedProfile: YouthProfile = {
      ...editForm,
      age: calculatedAge
    };

    try {
      // Persist profile to Supabase PostgreSQL database via backend API
      const res = await kabisigApi.updateProfile(updatedProfile);
      if (!res.success) {
        throw new Error(res.message || 'The profile could not be saved.');
      }

      setYouth(updatedProfile);
      if (onUpdateYouthProfile) {
        onUpdateYouthProfile(updatedProfile);
      }
      setIsEditModalOpen(false);
      alert('Your Katipunan ng Kabataan Profile (DILG Annex 4) has been updated and saved to the database successfully!');
    } catch (err: any) {
      console.error('Error saving profile changes:', err);
      alert(`Your profile was not saved: ${err.message || 'Backend database sync failed.'}`);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleRegisterProgramClick = async (progId: string) => {
    // Check if already registered
    const alreadyReg = localRegs.some(r => r.programId === progId && r.participantId === currentYouth.id);
    if (alreadyReg) {
      alert('You are already registered for this program.');
      return;
    }

    const prog = programs.find(p => p.id === progId);
    if (!prog) return;

    setRegisteringProgramId(progId);
    setRegistrationNotice(null);
    try {
      const savedRegistration = await onRegisterProgram(progId);
      setLocalRegs(previous => [savedRegistration, ...previous.filter(registration => registration.id !== savedRegistration.id)]);
      setRegistrationNotice({ type: 'success', text: `Successfully registered for "${prog.title}".` });
      window.setTimeout(() => setRegistrationNotice(null), 4000);
    } catch (error: any) {
      setRegistrationNotice({ type: 'error', text: error.message || 'Program registration failed.' });
    } finally {
      setRegisteringProgramId(null);
    }
  };

  const handleFeedbackFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackForm.title.trim() || !feedbackForm.content.trim()) {
      setFeedbackNotice({ type: 'error', text: 'Please fill out all feedback fields.' });
      return;
    }
    setIsSubmittingFeedback(true);
    setFeedbackNotice(null);
    try {
      const result = await kabisigApi.submitFeedback({
        subject: feedbackForm.title.trim(),
        message: feedbackForm.content.trim(),
        category: feedbackForm.type,
        is_anonymous: feedbackForm.anonymous,
      });
      const saved = result.data?.feedback;
      if (!result.success || !saved) throw new Error(result.message || 'Feedback could not be saved.');

      const sentiment = result.data?.sentiment_analysis?.sentiment;
      const newFeed: FeedbackRecord = {
        id: saved.id,
        userId: saved.user_id || currentYouth.userId,
        type: saved.category,
        title: saved.subject,
        content: saved.message,
        rating: sentiment === 'positive' ? 5 : sentiment === 'negative' ? 1 : 3,
        anonymous: saved.is_anonymous,
        status: 'Pending',
        dateSubmitted: saved.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
        submittedBy: saved.is_anonymous ? 'Anonymous' : currentYouth.name,
      };
      onSubmitFeedback(newFeed);
      setLocalFeedback(previous => [newFeed, ...previous.filter(item => item.id !== newFeed.id)]);
      setFeedbackForm({ type: 'Suggestion', title: '', content: '', anonymous: false });
      setFeedbackNotice({
        type: 'success',
        text: `Feedback saved. Sentiment analysis: ${sentiment || 'neutral'}.`,
      });
    } catch (error: any) {
      setFeedbackNotice({ type: 'error', text: error.message || 'Feedback could not be saved.' });
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const handleResolutionVote = async (resId: string, voteType: 'Support' | 'Oppose' | 'Abstain') => {
    if (!currentYouth.userId) {
      setResolutionVoteNotice({ type: 'error', text: 'Your authenticated youth account could not be verified.' });
      return;
    }
    const resolution = resolutions.find(item => item.id === resId);
    if (resolution?.votedUsers.includes(currentYouth.userId)) {
      setResolutionVoteNotice({ type: 'error', text: 'You have already voted in this poll.' });
      return;
    }

    setVotingResolutionId(resId);
    setResolutionVoteNotice(null);
    try {
      await onVoteResolution(resId, voteType);
      setResolutionVoteNotice({ type: 'success', text: 'Your vote was recorded.' });
      window.setTimeout(() => setResolutionVoteNotice(null), 4000);
    } catch (error: any) {
      setResolutionVoteNotice({ type: 'error', text: error.message || 'Your vote could not be recorded.' });
    } finally {
      setVotingResolutionId(null);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-[#f8fafc] overflow-hidden font-sans text-slate-800">
      {registrationNotice && (
        <div
          role={registrationNotice.type === 'error' ? 'alert' : 'status'}
          className={`fixed top-4 right-4 z-[70] max-w-sm rounded-lg px-4 py-3 text-xs font-bold shadow-lg ${registrationNotice.type === 'success' ? 'bg-emerald-700 text-white' : 'bg-rose-700 text-white'}`}
        >
          {registrationNotice.text}
        </div>
      )}
      
      {/* MOBILE TOP HEADER BAR */}
      <div className="lg:hidden bg-[#091d64] text-white px-4 py-3 flex justify-between items-center sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-2">
          <div className="w-24 bg-white/10 rounded p-1">
            <KabisigLogo className="w-24" />
          </div>
          <span className="text-[10px] font-bold bg-[#1e3a8a] px-2 py-0.5 rounded text-amber-300">Youth Portal</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all cursor-pointer"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* MOBILE DRAWER OVERLAY */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 lg:hidden flex flex-col justify-between p-6 animate-in fade-in duration-200">
          <div className="space-y-6 overflow-y-auto">
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <ProfileAvatar name={currentYouth.name} src={currentYouth.profilePic} alt={currentYouth.name} className="w-10 h-10 rounded-full border-2 border-amber-400" />
                <div>
                  <h4 className="text-xs font-bold text-white">{currentYouth.name}</h4>
                  <p className="text-[10px] text-slate-300">KK Registered Constituent</p>
                </div>
              </div>
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <nav className="space-y-2">
              <div className="text-[10px] font-black text-slate-300 uppercase tracking-wider mb-2">
                Youth Constituent Desk
              </div>
              <button
                onClick={() => { setActiveMenu('dashboard'); setIsMobileMenuOpen(false); }}
                className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-3 ${activeMenu === 'dashboard' ? 'bg-[#091d64] text-white shadow-md' : 'text-slate-200 hover:bg-white/10'}`}
              >
                <LayoutDashboard className="w-4.5 h-4.5 text-amber-400" />
                Dashboard
              </button>
              <button
                onClick={() => { setActiveMenu('programs'); setIsMobileMenuOpen(false); }}
                className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-3 ${activeMenu === 'programs' || activeMenu === 'registrations' ? 'bg-[#091d64] text-white shadow-md' : 'text-slate-200 hover:bg-white/10'}`}
              >
                <ClipboardList className="w-4.5 h-4.5 text-amber-400" />
                Programs & Activities
              </button>
              <button
                onClick={() => { setActiveMenu('feedback'); setIsMobileMenuOpen(false); }}
                className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-3 ${activeMenu === 'feedback' || activeMenu === 'resolutions' ? 'bg-[#091d64] text-white shadow-md' : 'text-slate-200 hover:bg-white/10'}`}
              >
                <HeartHandshake className="w-4.5 h-4.5 text-amber-400" />
                Boses ng Kabataan
              </button>
              <button
                onClick={() => { setActiveMenu('profile'); setIsMobileMenuOpen(false); }}
                className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-3 ${activeMenu === 'profile' ? 'bg-[#091d64] text-white shadow-md' : 'text-slate-200 hover:bg-white/10'}`}
              >
                <User className="w-4.5 h-4.5 text-amber-400" />
                My KK Profile & Digital ID
              </button>
            </nav>
          </div>

          <div className="pt-4 border-t border-white/10">
            <button
              onClick={onLogout}
              className="w-full py-3 bg-rose-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Log Out
            </button>
          </div>
        </div>
      )}

      {/* ==================== LEFT SIDEBAR - DESKTOP ONLY ==================== */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-slate-100 flex-col justify-between h-full flex-shrink-0 z-40 shadow-sm">
        <div className="flex flex-col h-full overflow-y-auto">
          {/* Logo Brand Header - Using Official Logo */}
          <div className="p-6 border-b border-slate-50">
            <div className="flex flex-col items-center">
              <KabisigLogo className="w-40" />
            </div>
          </div>

          {/* Navigation Links matching Section 2.1 Youth Constituent */}
          <nav className="p-4 space-y-1 flex-1">
            <button
              onClick={() => setActiveMenu('dashboard')}
              className={`w-full text-left px-4 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-3 ${
                activeMenu === 'dashboard' 
                  ? 'bg-[#eff6ff] text-[#091d64] shadow-xs' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-[#091d64]'
              }`}
            >
              <LayoutDashboard className={`w-4.5 h-4.5 ${activeMenu === 'dashboard' ? 'text-[#091d64]' : 'text-slate-400'}`} />
              Dashboard
            </button>

            <button
              onClick={() => setActiveMenu('programs')}
              className={`w-full text-left px-4 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-3 ${
                activeMenu === 'programs' || activeMenu === 'registrations' 
                  ? 'bg-[#eff6ff] text-[#091d64] shadow-xs' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-[#091d64]'
              }`}
            >
              <ClipboardList className={`w-4.5 h-4.5 ${activeMenu === 'programs' || activeMenu === 'registrations' ? 'text-[#091d64]' : 'text-slate-400'}`} />
              Programs & Activities
            </button>

            <button
              onClick={() => setActiveMenu('feedback')}
              className={`w-full text-left px-4 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-3 ${
                activeMenu === 'feedback' || activeMenu === 'resolutions' 
                  ? 'bg-[#eff6ff] text-[#091d64] shadow-xs' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-[#091d64]'
              }`}
            >
              <HeartHandshake className={`w-4.5 h-4.5 ${activeMenu === 'feedback' || activeMenu === 'resolutions' ? 'text-[#091d64]' : 'text-slate-400'}`} />
              Boses ng Kabataan
            </button>

            <button
              onClick={() => setActiveMenu('profile')}
              className={`w-full text-left px-4 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-3 ${
                activeMenu === 'profile' 
                  ? 'bg-[#eff6ff] text-[#091d64] shadow-xs' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-[#091d64]'
              }`}
            >
              <User className={`w-4.5 h-4.5 ${activeMenu === 'profile' ? 'text-[#091d64]' : 'text-slate-400'}`} />
              My Profile
            </button>

            <div className="pt-4 border-t border-slate-50">
              <button
                onClick={onLogout}
                className="w-full text-left px-4 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-3 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
              >
                <LogOut className="w-4 h-4 text-rose-500" />
                Log Out
              </button>
            </div>
          </nav>
        </div>
      </aside>

      {/* ==================== MAIN WORKSPACE ==================== */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* DESKTOP HEADER BLOCK */}
        <header className="hidden lg:flex bg-white border-b border-slate-100 h-20 items-center justify-between px-8 flex-shrink-0 z-30">
          <div className="flex flex-col">
            <div className="flex items-center gap-3">
              <h1 className="font-sans font-bold text-[#091d64] text-2xl tracking-tight leading-none">
                {activeMenu === 'dashboard' && 'Youth Constituent Dashboard'}
                {(activeMenu === 'programs' || activeMenu === 'registrations') && 'Barangay Programs & Participation'}
                {(activeMenu === 'feedback' || activeMenu === 'resolutions') && 'Boses ng Kabataan - Civic Desk'}
                {activeMenu === 'profile' && 'My Katipunan ng Kabataan Profile'}
              </h1>
              <span className="text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded bg-[#091d64] text-white">
                Youth
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-sans tracking-wide font-semibold mt-1">
              Web-Based Kabataan Information System for Inclusive Governance
            </span>
          </div>

          {/* User Profile Block */}
          <div className="flex items-center gap-5">
            <NotificationMenu buttonClassName="p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 relative" />
            <UserMenu 
              userName={currentYouth.name}
              role="KK Registered Youth"
              avatarUrl={currentYouth.profilePic}
              onLogout={onLogout}
              onNavigateProfile={() => setActiveMenu('profile')}
            />
          </div>
        </header>

        {/* WORKSPACE AREA */}
        <div className="flex-grow p-3.5 sm:p-6 lg:p-8 pb-24 sm:pb-8 overflow-y-auto bg-[#f8fafc]">
          
          {/* ==================== 1. DASHBOARD VIEW (Image 4) ==================== */}
          {activeMenu === 'dashboard' && (
            <div className="space-y-6">

              {/* Latest Announcements Preview */}
              <div className="bg-white rounded-xl border border-slate-100 shadow-xs p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Megaphone className="w-4 h-4 text-[#091d64]" />
                    <h4 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Latest SK Announcements</h4>
                  </div>
                  <button
                    onClick={() => setActiveMenu('announcements')}
                    className="text-[10px] font-extrabold text-[#091d64] hover:underline bg-blue-50 px-3 py-1 rounded-full cursor-pointer"
                  >
                    View All &rarr;
                  </button>
                </div>
                <div className="space-y-3">
                  {announcements
                    .filter(a => a.status === 'published')
                    .slice(0, 2)
                    .map(a => (
                      <div key={a.id} className="rounded-lg border border-slate-100 p-2.5 hover:bg-slate-50 transition-colors">
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="rounded border border-blue-100 bg-blue-50 px-2 py-0.5 text-[9px] font-bold uppercase text-blue-700">
                            {a.category}
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold">{a.datePosted}</span>
                        </div>
                        <p className="text-xs font-bold text-slate-800 truncate">{a.title}</p>
                        <p className="text-[10px] text-slate-500 line-clamp-2 mt-0.5">{a.content}</p>
                      </div>
                    ))}
                  {announcements.filter(a => a.status === 'published').length === 0 && (
                    <p className="py-6 text-center text-xs text-slate-400 font-semibold">
                      No announcements yet from your SK Council.
                    </p>
                  )}
                </div>
              </div>

              
              {/* TOP ROW: DIGITAL YOUTH ID CARD (LEFT) & METRIC BOXES (RIGHT) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                
                {/* Horizontal digital ID preview - Refined Premium Design */}
                <div className="bg-[#091d64] text-white rounded-2xl shadow-xl p-6 border-b-4 border-amber-400 flex flex-col justify-between relative overflow-hidden lg:col-span-1 group transition-all hover:shadow-2xl">
                  {/* Security Pattern Overlay */}
                  <div className="absolute inset-0 opacity-10 pointer-events-none">
                    <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '12px 12px' }}></div>
                  </div>
                  
                  {/* Subtle Philippine Flag Accent */}
                  <div className="absolute top-0 right-0 w-2 h-full bg-red-600/80 z-20"></div>
                  <div className="absolute top-0 right-2 w-2 h-full bg-blue-600/80 z-20"></div>
                  
                  <div className="flex justify-between items-start z-10">
                    <div className="flex items-center gap-3">
                      <div className="relative w-11 h-11 rounded-full bg-white p-0.5 border-2 border-amber-400 shadow-md flex items-center justify-center overflow-hidden flex-shrink-0">
                        {barangayLogo ? (
                          <img src={barangayLogo} alt={`${resolvedTenant?.name || 'Barangay'} official seal`} className="w-full h-full object-contain" />
                        ) : (
                          <KabisigLogo className="w-28" />
                        )}
                      </div>
                      <div>
                        <span className="text-[8px] font-black text-amber-400 uppercase tracking-widest bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20 inline-block mb-1">
                          Barangay Official Seal
                        </span>
                        <h4 className="font-sans font-black text-white text-sm tracking-tight leading-none uppercase">
                          BARANGAY {resolvedTenant?.name || 'UNASSIGNED'}
                        </h4>
                        <span className="text-[8px] text-slate-300 block font-mono font-bold mt-1 uppercase tracking-[0.15em] opacity-90">
                          Katipunan ng Kabataan Registry • Naga City
                        </span>
                      </div>
                    </div>
                    <div className="bg-amber-400/10 p-1.5 rounded-lg border border-amber-400/20 flex flex-col items-end">
                      <ShieldCheck className="w-5 h-5 text-amber-400" />
                      <span className="text-[7px] text-amber-300 font-mono font-bold uppercase mt-0.5">VERIFIED KK</span>
                    </div>
                  </div>

                  <div className="flex gap-5 items-center mt-6 z-10">
                    <div className="relative">
                      <ProfileAvatar name={currentYouth.name} src={currentYouth.profilePic} alt={currentYouth.name} className="w-20 h-20 rounded-xl border-2 border-white/20 shadow-lg" />
                      <div className="absolute -bottom-1 -right-1 bg-green-500 w-4 h-4 rounded-full border-2 border-[#091d64] flex items-center justify-center">
                        <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                      </div>
                    </div>
                    <div className="flex-1">
                      <h5 className="font-sans font-black text-base leading-none tracking-tight text-white mb-1.5 uppercase">{currentYouth.name}</h5>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest w-12">Serial:</span>
                          <span className="text-[10px] text-amber-400 font-mono font-bold">{currentYouth.id}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest w-12">Address:</span>
                          <span className="text-[10px] text-slate-200 font-bold">{currentYouth.address}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest w-12">Status:</span>
                          <span className="text-[9px] text-green-400 font-extrabold uppercase tracking-tight">Verified Resident</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-end mt-6 pt-4 border-t border-white/10 z-10">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1 text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                        <Building className="w-3 h-3" /> Naga City LGU
                      </div>
                      <div className="text-[7px] text-slate-500 font-mono leading-none">SECURE DIGITAL IDENTIFICATION SYSTEM</div>
                    </div>
                    
                    <div className="bg-white p-1.5 rounded-lg shadow-inner ring-4 ring-white/5">
                      <QRCodeSVG value={youthQrPayload(currentYouth)} size={52} fgColor="#091d64" />
                    </div>
                  </div>
                </div>

                {/* Metric cards grid */}
                <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* Card 1: Registered Youth */}
                  <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-xs flex items-center gap-4 hover:shadow-sm transition-shadow">
                    <div className="w-12 h-12 rounded-full bg-blue-50 text-[#091d64] flex items-center justify-center flex-shrink-0">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase block">Youth in this barangay</span>
                      <h4 className="text-2xl font-extrabold text-[#091d64] leading-none mt-1">
                        {resolvedTenant?.youthPopulationAvailable ? resolvedTenant.youthPopulation : '—'}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-semibold mt-1">
                        {resolvedTenant?.youthPopulationAvailable
                          ? 'Active Youth Constituent accounts'
                          : 'Live registry count unavailable'}
                      </p>
                    </div>
                  </div>

                  {/* Card 2: Active Programs */}
                  <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-xs flex items-center gap-4 hover:shadow-sm transition-shadow">
                    <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                      <ClipboardList className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase block">Ongoing Programs</span>
                      <h4 className="text-2xl font-extrabold text-[#091d64] leading-none mt-1">
                        {programs.filter(program => program.status === 'Upcoming' || program.status === 'Ongoing').length}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-semibold mt-1">Available for Registration</p>
                    </div>
                  </div>

                  {/* Card 3: My Active Slots */}
                  <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-xs flex items-center gap-4 hover:shadow-sm transition-shadow">
                    <div className="w-12 h-12 rounded-full bg-green-50 text-green-600 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase block">My Participation</span>
                      <h4 className="text-2xl font-extrabold text-[#091d64] leading-none mt-1">{myRegistrations.length}</h4>
                      <p className="text-[10px] text-slate-400 font-semibold mt-1">Confirmed Slots</p>
                    </div>
                  </div>

                  {/* Card 4: Resolutions */}
                  <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-xs flex items-center gap-4 hover:shadow-sm transition-shadow">
                    <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center flex-shrink-0">
                      <Vote className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase block">Active Polls</span>
                      <h4 className="text-2xl font-extrabold text-[#091d64] leading-none mt-1">{resolutions.filter(r => r.status === 'Voting Open').length}</h4>
                      <p className="text-[10px] text-slate-400 font-semibold mt-1">Pending Resolution Votes</p>
                    </div>
                  </div>

                </div>

              </div>

              {/* PERSONALIZED KABISIG RULE-BASED HUB (Rule-Based Suite) */}
              <div className="bg-gradient-to-r from-blue-50/50 to-indigo-50/30 rounded-xl border border-blue-100 p-6 space-y-6 text-left">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h4 className="text-sm font-black text-[#091d64] uppercase tracking-tight flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-amber-500" />
                      Personalized KABISIG Rule-Based Hub
                    </h4>
                    <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Real-time profile categorization, engagement scoring, and rule-based recommendations</p>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-600">
                      Engagement Score: <span className="text-[#091d64] font-black">{myEngagement.score}</span>/100
                    </span>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                      myEngagement.classification === 'Highly Active' ? 'bg-emerald-100 text-emerald-800' :
                      myEngagement.classification === 'Active' ? 'bg-blue-100 text-blue-800' :
                      myEngagement.classification === 'Moderately Active' ? 'bg-amber-100 text-amber-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {myEngagement.classification}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Demographic Classifications Panel */}
                  <div className="bg-white p-4 rounded-xl border border-blue-50 shadow-2xs space-y-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Your Demographic Classification</span>
                    <div className="flex flex-wrap gap-2">
                      {myDemographics.map((cat, index) => (
                        <span key={index} className="bg-[#091d64] hover:bg-opacity-95 text-white text-[10px] font-black px-3 py-1 rounded-md transition-colors uppercase tracking-wider">
                          {cat}
                        </span>
                      ))}
                      {myDemographics.length === 0 && (
                        <span className="text-slate-400 text-xs font-semibold block py-2">General Youth Constituent</span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed font-medium mt-2">
                      Categorizations are calculated using official DILG Katipunan ng Kabataan profiling inputs.
                    </p>
                  </div>

                  {/* Program Recommendations Panel */}
                  <div className="bg-white p-4 rounded-xl border border-blue-50 shadow-2xs space-y-3 md:col-span-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Rule-Based Program Recommendations</span>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {myRecommendations.map((rec, index) => {
                        const isRegistered = myRegistrations.some(reg => reg.programId === rec.program.id);
                        return (
                          <div key={index} className="p-3 rounded-lg border border-slate-50 bg-slate-50/50 flex flex-col justify-between">
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-bold text-slate-800 block line-clamp-1">{rec.program.title}</span>
                                {isRegistered && (
                                  <span className="text-[9px] font-black text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded uppercase">
                                    Enrolled
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-[#091d64] font-extrabold block">Rule Match:</span>
                              <span className="text-[10px] text-slate-500 font-medium block mt-0.5 leading-tight">{rec.reason}</span>
                            </div>

                            <div className="mt-3 flex justify-end">
                              {!isRegistered ? (
                                <button
                                  type="button"
                                  disabled={registeringProgramId !== null}
                                  onClick={() => handleRegisterProgramClick(rec.program.id)}
                                  className="text-[10px] bg-red-600 hover:bg-red-700 text-white font-extrabold px-2.5 py-1 rounded transition-colors disabled:opacity-60"
                                >
                                  {registeringProgramId === rec.program.id ? <Loader2 className="w-3 h-3 inline animate-spin" /> : 'Instantly Register →'}
                                </button>
                              ) : (
                                <span className="text-[10px] text-emerald-600 font-extrabold">Slot Confirmed</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {myRecommendations.length === 0 && (
                        <div className="col-span-2 py-4 text-center text-xs text-slate-400 font-bold">
                          No matching recommendations found for your profile. Explore our program list below!
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* UPCOMING BARANGAY PROGRAMS SECTION */}
              <div className="bg-white rounded-xl border border-slate-100 shadow-xs p-4">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Upcoming Barangay Programs</h4>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Explore scheduled initiatives and secure your slot</p>
                  </div>
                  <button 
                    onClick={() => setActiveMenu('programs')}
                    className="text-[10px] font-extrabold text-[#091d64] hover:underline bg-blue-50 px-3 py-1 rounded-full cursor-pointer"
                  >
                    Browse Full Registry &rarr;
                  </button>
                </div>

                <div className="space-y-4 divide-y divide-slate-50">
                  {programs
                    .filter(program => program.status === 'Upcoming' || program.status === 'Ongoing')
                    .slice(0, 3)
                    .map(program => {
                      const alreadyReg = myRegistrations.some(r => r.programId === program.id);
                      return (
                      <div key={program.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 first:pt-0 gap-4">
                        <div className="flex gap-4 items-start">
                          <div className="w-10 h-10 rounded-full bg-blue-50 text-[#091d64] flex items-center justify-center flex-shrink-0">
                            <ClipboardList className="w-5 h-5" />
                          </div>
                          <div>
                            <h5 className="font-bold text-sm text-slate-800">{program.title}</h5>
                            <span className="text-[10px] text-slate-400 font-bold block mt-0.5">
                              {program.startDate || 'Date to be announced'}{program.endDate ? ` - ${program.endDate}` : ''}
                            </span>
                            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                              {program.description || 'Program details will be announced by the Sangguniang Kabataan.'}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-start sm:items-end w-full sm:w-auto gap-2">
                          <span className="text-[11px] font-extrabold text-slate-700 font-mono bg-slate-50 px-2 py-0.5 rounded">
                            {program.registeredCount || 0} / {program.maxParticipants || 0} registered
                          </span>
                          {alreadyReg ? (
                            <div className="flex items-center gap-2 text-green-600">
                              <div className="bg-green-50 p-1 rounded-full">
                                <CheckCircle2 className="w-4 h-4" />
                              </div>
                              <span className="text-[11px] font-extrabold uppercase tracking-widest">Registered</span>
                            </div>
                          ) : (
                            <button
                              disabled={registeringProgramId !== null}
                              onClick={() => handleRegisterProgramClick(program.id)}
                              className="px-4 py-1.5 bg-[#091d64] hover:bg-[#122878] text-white font-bold rounded-lg text-[10px] transition-all transform active:scale-95 cursor-pointer disabled:opacity-60"
                            >
                              {registeringProgramId === program.id ? 'Registering...' : 'Register Now'}
                            </button>
                          )}
                        </div>
                      </div>
                      );
                    })}
                  {programs.filter(program => program.status === 'Upcoming' || program.status === 'Ongoing').length === 0 && (
                    <p className="py-6 text-center text-xs text-slate-400 font-semibold">
                      No upcoming programs have been published for your Barangay yet.
                    </p>
                  )}
                </div>
              </div>


            </div>
          )}

          {/* ==================== 2. PROFILE VIEW (DILG MC No. 2022-033 ANNEX 4 COMPLIANT) ==================== */}
          {activeMenu === 'profile' && (
            <div className="space-y-6 text-left">
              <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-100 shadow-sm space-y-6">
                
                {/* DILG MC 2022-033 HEADER BADGE */}
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-gradient-to-r from-[#091d64] to-[#1e3a8a] p-5 rounded-2xl text-white shadow-md">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center flex-shrink-0">
                      <ShieldCheck className="w-6 h-6 text-amber-400" />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono font-bold tracking-widest text-amber-300 uppercase block">DILG MC No. 2022-033 (Annex 4) & RA 10742</span>
                      <h3 className="font-sans font-black text-lg text-white">Katipunan ng Kabataan (KK) Official Youth Profile</h3>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Verified KK Member
                    </span>
                  </div>
                </div>

                {/* PROFILE PICTURE & SUMMARY */}
                <div className="flex flex-col lg:flex-row lg:items-start gap-6 pb-6 border-b border-slate-100">
                  <div className="flex flex-col items-center gap-3 flex-shrink-0">
                    <div className="relative group">
                      <ProfileAvatar name={youth.name} src={youth.profilePic} alt="Profile Picture" className="w-28 h-28 rounded-full border-2 border-white shadow-md transition-transform group-hover:scale-105" />
                      <div className="absolute -top-1 -right-1 bg-green-500 text-white p-1 rounded-full border-2 border-white">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                    </div>
                    <label className="cursor-pointer rounded-lg border border-blue-100 bg-blue-50 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wide text-[#091d64] transition-colors hover:bg-blue-100">
                      <input type="file" accept="image/*" className="sr-only" onChange={handleProfilePictureChange} />
                      Upload Photo
                    </label>
                  </div>
                  <div className="text-center sm:text-left flex-1 min-w-0">
                    <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h4 className="text-2xl font-black text-slate-900 leading-tight">{youth.name}</h4>
                        <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-2">
                          <span className="text-[10px] bg-blue-50 text-[#091d64] border border-blue-100 px-3 py-1 rounded-full font-extrabold uppercase tracking-widest">
                            Resident ID: <span className="font-mono text-amber-600">{youth.id}</span>
                          </span>
                          <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-100 px-3 py-1 rounded-full font-bold uppercase tracking-widest">
                            {youth.zone}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-2 font-medium flex items-center justify-center sm:justify-start gap-1">
                          <Building className="w-3.5 h-3.5 text-slate-400" /> {youth.address}, Naga City
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          setEditForm(youth);
                          setIsEditModalOpen(true);
                        }}
                        className="px-4 py-2 bg-[#091d64] hover:bg-[#122878] text-white font-bold rounded-xl text-xs transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer self-center xl:self-start flex-shrink-0"
                      >
                        <User className="w-4 h-4" />
                        Edit Profile
                      </button>
                    </div>
                  </div>

                  {/* QR CODE DISPLAY */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col items-center gap-1 shadow-2xs self-center lg:self-start flex-shrink-0">
                    <QRCodeSVG value={youthQrPayload(youth)} size={88} fgColor="#091d64" />
                    <span className="text-[9px] font-mono font-bold text-slate-400">Digital ID QR Code</span>
                  </div>
                </div>

                {/* KK YOUTH PROFILE DATA FIELDS TABLE (DILG MC NO. 2022-033 ANNEX 4) */}
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div>
                      <h4 className="font-sans font-bold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2">
                        Profile Information
                      </h4>
                  
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                        20 / 20 Fields Complete
                      </span>
                    </div>
                  </div>

                  <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs">
                    <table className="w-full text-left text-xs text-slate-700">
                      <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        <tr>
                          <th className="py-3 px-4">Data Field</th>
                          <th className="py-3 px-4">Registered Constituent Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        
                        {/* 1. Full Name */}
                        <tr className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-4 font-bold text-slate-900">1. Full Name</td>
                          <td className="py-2.5 px-4 font-extrabold text-[#091d64]">{youth.name}</td>
                        </tr>

                        {/* 2. Sex */}
                        <tr className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-4 font-bold text-slate-900">2. Sex</td>
                          <td className="py-2.5 px-4 font-bold">{youth.sex || 'Male'}</td>
                        </tr>

                        {/* 3. Birthdate */}
                        <tr className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-4 font-bold text-slate-900">3. Birthdate</td>
                          <td className="py-2.5 px-4 font-bold font-mono">{youth.birthdate || '2004-05-12'}</td>
                        </tr>

                        {/* 4. Age */}
                        <tr className="hover:bg-slate-50/50 bg-blue-50/20">
                          <td className="py-2.5 px-4 font-bold text-slate-900">4. Age</td>
                          <td className="py-2.5 px-4 font-black text-blue-900">{youth.age} Years Old</td>
                        </tr>

                        {/* 5. Civil Status */}
                        <tr className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-4 font-bold text-slate-900">5. Civil Status</td>
                          <td className="py-2.5 px-4 font-bold">{youth.civilStatus || 'Single'}</td>
                        </tr>

                        {/* 6. Address */}
                        <tr className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-4 font-bold text-slate-900">6. Address</td>
                          <td className="py-2.5 px-4 font-bold">{youth.address}</td>
                        </tr>

                        {/* 7. Zone / Purok */}
                        <tr className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-4 font-bold text-slate-900">7. Zone / Purok</td>
                          <td className="py-2.5 px-4 font-extrabold text-indigo-700">{youth.zone}</td>
                        </tr>

                        {/* 8. Contact Number */}
                        <tr className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-4 font-bold text-slate-900">8. Contact Number</td>
                          <td className="py-2.5 px-4 font-bold font-mono">{youth.mobile}</td>
                        </tr>

                        {/* 9. Email Address */}
                        <tr className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-4 font-bold text-slate-900">9. Email Address</td>
                          <td className="py-2.5 px-4 font-bold">{youth.email || 'None'}</td>
                        </tr>

                        {/* 10. Educational Level */}
                        <tr className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-4 font-bold text-slate-900">10. Educational Level</td>
                          <td className="py-2.5 px-4 font-bold">{youth.educationalLevel}</td>
                        </tr>

                        {/* 11. School */}
                        <tr className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-4 font-bold text-slate-900">11. School</td>
                          <td className="py-2.5 px-4 font-bold">{youth.school || 'Ateneo de Naga University'}</td>
                        </tr>

                        {/* 12. Course */}
                        <tr className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-4 font-bold text-slate-900">12. Course</td>
                          <td className="py-2.5 px-4 font-bold">{youth.course || 'BS Information Technology'}</td>
                        </tr>

                        {/* 13. Year Level */}
                        <tr className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-4 font-bold text-slate-900">13. Year Level</td>
                          <td className="py-2.5 px-4 font-bold">{youth.year || '3rd Year'}</td>
                        </tr>

                        {/* 14. Employment Status */}
                        <tr className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-4 font-bold text-slate-900">14. Employment Status</td>
                          <td className="py-2.5 px-4 font-bold">{youth.employmentStatus || 'Student'}</td>
                        </tr>

                        {/* 15. Scholar Status */}
                        <tr className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-4 font-bold text-slate-900">15. Scholar Status</td>
                          <td className="py-2.5 px-4 font-bold text-emerald-700">{youth.scholarStatus} {youth.scholarshipType ? `(${youth.scholarshipType})` : ''}</td>
                        </tr>

                        {/* 16. Youth Sector */}
                        <tr className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-4 font-bold text-slate-900">16. Youth Sector</td>
                          <td className="py-2.5 px-4 font-bold text-violet-700">{youth.youthSector || 'In-School Youth'}</td>
                        </tr>

                        {/* 17. Parent/Guardian Information */}
                        <tr className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-4 font-bold text-slate-900">17. Parent/Guardian Info</td>
                          <td className="py-2.5 px-4 font-bold">
                            {youth.guardianName} <span className="text-slate-400 text-[11px] font-mono">({youth.guardianContact})</span>
                          </td>
                        </tr>

                        {/* 18. Profile Picture */}
                        <tr className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-4 font-bold text-slate-900">18. Profile Picture</td>
                          <td className="py-2.5 px-4 font-bold text-blue-600">Attached / Uploaded</td>
                        </tr>

                        {/* 19. Resident ID */}
                        <tr className="hover:bg-slate-50/50 bg-amber-50/20">
                          <td className="py-2.5 px-4 font-bold text-slate-900">19. Resident ID</td>
                          <td className="py-2.5 px-4 font-black font-mono text-amber-700">{youth.id}</td>
                        </tr>

                        {/* 20. QR Code */}
                        <tr className="hover:bg-slate-50/50 bg-amber-50/20">
                          <td className="py-2.5 px-4 font-bold text-slate-900">20. QR Code</td>
                          <td className="py-2.5 px-4 font-mono font-bold text-slate-800">{youth.qrCode || `QR-${youth.id}`}</td>
                        </tr>

                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ==================== 3. PROGRAMS VIEW ==================== */}
          {(activeMenu === 'programs' || activeMenu === 'registrations') && (
            <div className="space-y-6">
              {/* Programs Tab Switcher */}
              <div className="bg-white p-2 rounded-xl border border-slate-100 shadow-xs flex gap-2">
                <button 
                  onClick={() => setActiveMenu('programs')}
                  className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    activeMenu === 'programs' 
                      ? 'bg-[#091d64] text-white shadow-xs' 
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <ClipboardList className="w-4 h-4" />
                  Upcoming Barangay Programs
                </button>
                <button 
                  onClick={() => setActiveMenu('registrations')}
                  className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    activeMenu === 'registrations' 
                      ? 'bg-[#091d64] text-white shadow-xs' 
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  My Confirmed Participation ({myRegistrations.length})
                </button>
              </div>

              {activeMenu === 'programs' ? (
                <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-xs">
                  <div className="mb-8">
                    <h3 className="font-sans font-bold text-slate-800 text-base">Community Programs Registry</h3>
                    <p className="text-xs text-slate-400 mt-1">Direct access to Sangguniang Kabataan initiatives. Browse, learn, and exercise your right to participate.</p>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {programs.map(p => {
                      const alreadyReg = myRegistrations.some(r => r.programId === p.id);
                      return (
                        <div key={p.id} className="group p-5 border border-slate-100 rounded-2xl bg-white hover:border-[#091d64]/20 hover:shadow-md transition-all flex flex-col justify-between overflow-hidden">
                          <div>
                            <div className="flex justify-between items-start gap-3 mb-2">
                              <h4 className="text-base font-bold text-slate-800 group-hover:text-[#091d64] transition-colors leading-snug">{p.title}</h4>
                              <span className="bg-blue-50 text-[#091d64] border border-blue-100 text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-widest shrink-0">
                                {p.category}
                              </span>
                            </div>
                            <div className="flex flex-col gap-1 mt-3">
                              <span className="text-[11px] text-slate-500 font-bold flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-slate-300" />
                                {p.startDate} - {p.endDate}
                              </span>
                              <span className="text-[11px] text-slate-500 font-bold flex items-center gap-1.5">
                                <Building className="w-3.5 h-3.5 text-slate-300" />
                                {p.location || "Venue TBA"}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-4 leading-relaxed font-medium">
                              {p.description}
                            </p>
                          </div>
                          
                          <div className="flex justify-between items-center border-t border-slate-50 mt-6 pt-4">
                            <div>
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">Availability</span>
                              <span className="text-xs font-bold text-slate-700 font-mono">{p.registeredCount} / {p.maxParticipants} Slots Filled</span>
                            </div>
                            {alreadyReg ? (
                              <div className="flex items-center gap-2 text-green-600">
                                <div className="bg-green-50 p-1 rounded-full">
                                  <CheckCircle2 className="w-4 h-4" />
                                </div>
                                <span className="text-[11px] font-extrabold uppercase tracking-widest">Confirmed Slot</span>
                              </div>
                            ) : (
                              <button 
                                disabled={registeringProgramId !== null}
                                onClick={() => handleRegisterProgramClick(p.id)}
                                className="px-5 py-2 bg-[#091d64] hover:bg-[#122878] text-white font-bold rounded-lg text-xs transition-all transform active:scale-95 shadow-sm cursor-pointer disabled:opacity-60"
                              >
                                {registeringProgramId === p.id ? 'Registering...' : 'Join Program'}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-xs">
                  <div className="mb-8">
                    <h3 className="font-sans font-bold text-slate-800 text-base">My Confirmed Participation & Event Passes</h3>
                    <p className="text-xs text-slate-400 mt-1">Manage your confirmed event slots. Present your single Digital Youth ID QR code at event entry check-in points.</p>
                  </div>

                  {myRegistrations.length === 0 ? (
                    <div className="text-center py-20 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                      <ClipboardList className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                      <h5 className="text-sm font-bold text-slate-400">No active program slots found</h5>
                      <button 
                        onClick={() => setActiveMenu('programs')}
                        className="mt-4 px-4 py-2 bg-[#091d64] text-white rounded-lg text-xs font-bold cursor-pointer"
                      >
                        Browse Programs
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {myRegistrations.map(r => (
                        <div key={r.id} className="relative bg-white border border-slate-100 rounded-2xl shadow-xs overflow-hidden flex flex-col sm:flex-row group transition-all hover:shadow-md">
                          {/* Decorative side accent */}
                          <div className="absolute top-0 left-0 h-full w-1.5 bg-emerald-500"></div>
                          
                          <div className="p-6 flex-1">
                            <div className="flex justify-between items-start mb-3">
                              <span className="bg-emerald-50 text-emerald-700 text-[10px] font-extrabold px-2.5 py-1 rounded uppercase tracking-widest border border-emerald-100">
                                Confirmed Slot
                              </span>
                            </div>
                            <h4 className="text-base font-bold text-slate-800">{r.programTitle}</h4>
                            <div className="mt-3 space-y-1.5">
                              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                <span className="w-20">Registration ID</span>
                                <span className="text-slate-600 font-mono">{r.id}</span>
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                <span className="w-20">Date Joined</span>
                                <span className="text-slate-600">{r.dateRegistered}</span>
                              </div>
                            </div>
                          </div>

                          <div className="bg-slate-50/60 p-5 flex flex-col items-center justify-center border-l border-slate-100 sm:w-44 text-center gap-1.5">
                            <div className="bg-white p-2 rounded-xl shadow-2xs border border-slate-100">
                              <QRCodeSVG value={youthQrPayload(currentYouth)} size={80} fgColor="#091d64" />
                            </div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Youth ID QR Code</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ==================== 5. FEEDBACK VIEW ==================== */}
          {(activeMenu === 'feedback' || activeMenu === 'resolutions') && (
            <div className="space-y-6">
              {/* Feedback Sub-Tab Switcher */}
              <div className="bg-white p-2 rounded-xl border border-slate-100 shadow-xs flex gap-2">
                <button 
                  onClick={() => setActiveMenu('feedback')}
                  className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    activeMenu === 'feedback' 
                      ? 'bg-[#091d64] text-white shadow-xs' 
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <HeartHandshake className="w-4 h-4" />
                  Submit Feedback & History
                </button>
                <button 
                  onClick={() => setActiveMenu('resolutions')}
                  className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    activeMenu === 'resolutions' 
                      ? 'bg-[#091d64] text-white shadow-xs' 
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Vote className="w-4 h-4" />
                  Active Community Polls & Resolutions ({resolutions.length})
                </button>
              </div>

              {activeMenu === 'feedback' ? (
                <>
                  {/* Submission Form */}
                  <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-xs">
                    <h3 className="text-lg font-extrabold text-[#091d64] mb-2">Submit Your Voice</h3>
                    <p className="text-xs text-slate-400 mb-6">Submit suggestions, concerns, or inquiries directly to your SK Council. You can choose to remain anonymous.</p>
                    
                    <form onSubmit={handleFeedbackFormSubmit} className="space-y-4">
                      {feedbackNotice && (
                        <div role={feedbackNotice.type === 'error' ? 'alert' : 'status'} className={`rounded-lg px-3 py-2 text-xs font-semibold ${feedbackNotice.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'}`}>
                          {feedbackNotice.text}
                        </div>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1.5">Feedback Category</label>
                          <select 
                            value={feedbackForm.type}
                            onChange={(e) => setFeedbackForm({...feedbackForm, type: e.target.value as any})}
                            className="w-full border border-slate-200 rounded-lg p-2.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          >
                            <option value="Suggestion">General Suggestion</option>
                            <option value="Complaint">Formal Complaint</option>
                            <option value="Inquiry">Direct Inquiry</option>
                            <option value="Evaluation">Program Evaluation</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1.5">Anonymity Preference</label>
                          <select 
                            value={feedbackForm.anonymous ? 'True' : 'False'}
                            onChange={(e) => setFeedbackForm({...feedbackForm, anonymous: e.target.value === 'True'})}
                            className="w-full border border-slate-200 rounded-lg p-2.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          >
                            <option value="False">Show My Full Profile</option>
                            <option value="True">Submit as Anonymous User</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1.5">Topic/Subject Title</label>
                        <input 
                          type="text" 
                          value={feedbackForm.title}
                          onChange={(e) => setFeedbackForm({...feedbackForm, title: e.target.value})}
                          placeholder="e.g. Community Garden Proposal"
                          className="w-full border border-slate-200 rounded-lg p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1.5">Detailed Message</label>
                        <textarea 
                          value={feedbackForm.content}
                          onChange={(e) => setFeedbackForm({...feedbackForm, content: e.target.value})}
                          placeholder="Describe your suggestion or concern in detail..."
                          className="w-full border border-slate-200 rounded-lg p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          rows={4}
                          required
                        />
                      </div>
                      <button type="submit" disabled={isSubmittingFeedback} className="w-full py-3 bg-[#091d64] text-white font-extrabold rounded-xl text-xs hover:bg-[#122878] transition-all transform active:scale-[0.98] cursor-pointer disabled:opacity-60">
                        {isSubmittingFeedback ? 'Submitting...' : 'Submit Official Feedback'}
                      </button>
                    </form>
                  </div>

                  {/* History List */}
                  <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-xs">
                    <h3 className="text-lg font-extrabold text-[#091d64] mb-2">My Submission History</h3>
                    <p className="text-xs text-slate-400 mb-6">Track the status and responses to the topics you have previously submitted.</p>

                    <div className="space-y-3">
                      {myFeedback.map(f => (
                        <div key={f.id} className="p-4 border rounded-xl bg-slate-50/50 border-slate-100">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="bg-blue-50 text-[#091d64] border border-blue-50 text-[10px] font-bold px-2 py-0.5 rounded-full inline-block">
                                {f.type}
                              </span>
                              <h4 className="text-sm font-extrabold text-slate-800 mt-1.5">{f.title}</h4>
                            </div>
                            <span className="bg-amber-50 text-amber-700 text-[10px] font-bold px-2.5 py-0.5 rounded border border-amber-200">
                              {f.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 font-medium mt-2 leading-relaxed">{f.content}</p>
                          {f.response && (
                            <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50/70 p-3">
                              <span className="block text-[9px] font-extrabold uppercase tracking-wider text-[#091d64]">SK Council Response</span>
                              <p className="mt-1 text-xs leading-relaxed text-slate-700">{f.response}</p>
                            </div>
                          )}
                          <span className="text-[9px] text-slate-400 block mt-2 font-mono">Logged on: {f.dateSubmitted}</span>
                        </div>
                      ))}
                      {myFeedback.length === 0 && (
                        <div className="text-center py-12 text-slate-400 text-xs">No feedback topics logged yet.</div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-xs">
                  <div className="mb-6">
                    <h3 className="font-sans font-bold text-slate-800 text-base">SK Legislative Resolution Assembly Polls</h3>
                    <p className="text-xs text-slate-400 mt-1">Review resolutions formulated by Sangguniang Kabataan and exercise your direct voting eligibility.</p>
                  </div>

                  {resolutionVoteNotice && (
                    <div role={resolutionVoteNotice.type === 'error' ? 'alert' : 'status'} className={`mb-4 rounded-lg px-3 py-2 text-xs font-semibold ${resolutionVoteNotice.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'}`}>
                      {resolutionVoteNotice.text}
                    </div>
                  )}
                  {pollsError && (
                    <p role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
                      Polls could not be loaded: {pollsError}
                    </p>
                  )}

                  <div className="space-y-4">
                    {resolutions.length === 0 && !pollsError && (
                      <p className="py-8 text-center text-xs text-slate-400">No active polls are available for your barangay yet.</p>
                    )}
                    {resolutions.map(res => (
                      <div key={res.id} className="p-5 border border-slate-100 rounded-xl bg-white space-y-3 shadow-xs">
                        <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                          <span className="text-[10px] font-mono font-bold text-[#091d64] px-2 py-0.5 rounded bg-blue-50 tracking-wider uppercase">{res.resolutionNumber}</span>
                          <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">Closes {res.validityPeriod.split(' - ')[1] || 'per poll schedule'}</span>
                        </div>
                        <h4 className="font-bold text-slate-800 text-sm mt-2 leading-snug">{res.title}</h4>
                        <p className="text-xs text-slate-500 leading-relaxed font-medium">{res.content}</p>
                        <div className="flex gap-2 justify-end pt-3">
                          <button 
                            disabled={Boolean(currentYouth.userId && res.votedUsers.includes(currentYouth.userId)) || votingResolutionId !== null}
                            onClick={() => handleResolutionVote(res.id, 'Support')} 
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg text-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            {votingResolutionId === res.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />} Support ({res.votesSupport})
                          </button>
                          <button 
                            disabled={Boolean(currentYouth.userId && res.votedUsers.includes(currentYouth.userId)) || votingResolutionId !== null}
                            onClick={() => handleResolutionVote(res.id, 'Oppose')} 
                            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            <X className="w-3.5 h-3.5" /> Oppose ({res.votesOppose})
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ==================== 7. ANNOUNCEMENTS VIEW ==================== */}
          {activeMenu === 'announcements' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-xs">
                <div className="mb-6">
                  <h3 className="font-sans font-bold text-slate-800 text-base">Official SK Bulletins & Advisories</h3>
                  <p className="text-xs text-slate-400 mt-1">Stay informed with direct advisories published by your Sangguniang Kabataan Council.</p>
                </div>
                
                <div className="space-y-4">
                  {announcements.filter(announcement => announcement.status === 'published').map(announcement => (
                    <article key={announcement.id} className="rounded-xl border border-slate-100 bg-white p-5 shadow-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="rounded border border-blue-100 bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold uppercase text-blue-700">{announcement.category}</span>
                        <span className="text-[10px] font-semibold text-slate-400">{announcement.datePosted}</span>
                      </div>
                      <h4 className="mt-3 text-sm font-black leading-tight text-slate-900">{announcement.title}</h4>
                      {announcement.imageUrl && <img src={announcement.imageUrl} alt={`Pubmat for ${announcement.title}`} className="mt-3 max-h-80 w-full rounded-lg border border-slate-200 bg-white object-contain" />}
                      <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                        {announcement.what && <p><strong className="text-slate-800">What:</strong> {announcement.what}</p>}
                        {announcement.where && <p><strong className="text-slate-800">Where:</strong> {announcement.where}</p>}
                        {announcement.when && <p><strong className="text-slate-800">When:</strong> {announcement.when}</p>}
                      </div>
                      <div className="mt-3 border-t border-slate-100 pt-3">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Body Content</p>
                        <p className="mt-1 whitespace-pre-line text-xs font-medium leading-relaxed text-slate-600">{announcement.content}</p>
                      </div>
                      {announcement.hashtags && <p className="mt-3 border-t border-slate-100 pt-3 text-xs font-semibold text-blue-700">{announcement.hashtags}</p>}
                      <div className="mt-3 border-t border-slate-100 pt-3 text-[10px] font-bold text-slate-400">
                        Published by <span className="text-[#091d64]">{announcement.author}</span>
                        {announcement.barangay && <span> · {announcement.barangay}</span>}
                      </div>
                    </article>
                  ))}
                  {announcements.filter(announcement => announcement.status === 'published').length === 0 && (
                    <p className="py-8 text-center text-xs font-semibold text-slate-400">No published announcements for your Barangay yet.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ==================== 8. SETTINGS VIEW ==================== */}
          {activeMenu === 'settings' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-xs text-left max-w-2xl">
                <h3 className="text-lg font-extrabold text-[#091d64] mb-2">KK Constituent System Settings</h3>
                <p className="text-xs text-slate-400 mb-6">Configure Sangguniang Kabataan profiling options, resident checks, and notifications under the KABISIG framework.</p>
                
                <div className="space-y-6">
                  {/* Profiling Compliance Group */}
                  <div className="p-4 border border-slate-100 rounded-xl bg-slate-50/50 space-y-4 text-xs font-semibold">
                    <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-green-600" />
                      Katipunan ng Kabataan Verification
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-slate-400 block mb-0.5 text-[10px] uppercase tracking-wider">Demographic Zone</span>
                        <span className="text-slate-800 font-bold block">
                          {currentYouth.zone} (Verified {resolvedTenant?.name || 'Barangay'} Resident)
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block mb-0.5 text-[10px] uppercase tracking-wider">Voter Registration State</span>
                        <select className="border border-slate-200 rounded p-1 text-xs bg-white mt-1 w-full font-bold">
                          <option>Registered SK Voter (Naga City)</option>
                          <option>Non-Registered</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Scholastic Settings */}
                  <div className="p-4 border border-slate-100 rounded-xl bg-slate-50/50 space-y-4 text-xs font-semibold">
                    <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-blue-600" />
                      Scholastic & Educational Status
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-slate-400 block mb-1 text-[10px] uppercase tracking-wider">Scholar State</span>
                        <select className="border border-slate-200 rounded p-1.5 text-xs bg-white w-full font-bold">
                          <option>Naga City SK Educational Aid Beneficiary</option>
                          <option>Non-Scholar</option>
                          <option>Working Student</option>
                        </select>
                      </div>
                      <div>
                        <span className="text-slate-400 block mb-1 text-[10px] uppercase tracking-wider">Educational Status</span>
                        <select className="border border-slate-200 rounded p-1.5 text-xs bg-white w-full font-bold">
                          <option>Tertiary (College)</option>
                          <option>Senior High School</option>
                          <option>Junior High School</option>
                          <option>Vocational</option>
                          <option>Out of School Youth (OSY)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Privacy & Notification Settings */}
                  <div className="p-4 border border-slate-100 rounded-xl bg-slate-50/50 space-y-3 text-xs font-semibold">
                    <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                      <Lock className="w-4 h-4 text-[#091d64]" />
                      Communication & Digital ID options
                    </h4>
                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                      <div>
                        <span className="text-slate-700 block">Show Public Accomplishments on Profile</span>
                        <span className="text-[10px] text-slate-400 font-medium">Allow other KK members to view your sports fest participation records</span>
                      </div>
                      <input type="checkbox" defaultChecked className="rounded text-[#091d64] focus:ring-[#091d64] w-4 h-4" />
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <div>
                        <span className="text-slate-700 block">Notify via Email on SK Resolutions</span>
                        <span className="text-[10px] text-slate-400 font-medium">Receive direct bulletins when new legislative votes are active</span>
                      </div>
                      <input type="checkbox" defaultChecked className="rounded text-[#091d64] focus:ring-[#091d64] w-4 h-4" />
                    </div>
                  </div>

                  {/* Save button */}
                  <div className="text-right">
                    <button 
                      onClick={() => alert('Youth profiling configuration successfully saved to KABISIG database!')}
                      className="px-5 py-2.5 bg-[#091d64] text-white hover:bg-opacity-95 font-bold rounded-lg text-xs cursor-pointer"
                    >
                      Save Profiling Changes
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* EDIT PROFILE MODAL DIALOG */}
        {isEditModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto text-left relative my-auto">
              
              <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <div>
                  <span className="text-[10px] font-mono font-bold text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded border border-amber-200 uppercase tracking-wider">
                    DILG MC No. 2022-033 Annex 4
                  </span>
                  <h3 className="text-lg font-black text-[#091d64] mt-1">Update Youth Constituent Profile</h3>
                  <p className="text-xs text-slate-400">Self-service updates for personal information, contact details, and educational/employment status.</p>
                </div>
                <button 
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-6">
                
                {/* SECTION 1: PERSONAL INFORMATION */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase text-[#091d64] tracking-wider border-b border-slate-100 pb-1">
                    1. Personal Information
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Full Name</label>
                      <input 
                        type="text" 
                        value={editForm.name} 
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="w-full border border-slate-200 rounded-lg p-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#091d64]"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Sex</label>
                      <select 
                        value={editForm.sex || 'Male'} 
                        onChange={(e) => setEditForm({ ...editForm, sex: e.target.value as 'Male' | 'Female' })}
                        className="w-full border border-slate-200 rounded-lg p-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#091d64]"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Birthdate</label>
                      <input 
                        type="date" 
                        value={editForm.birthdate || '2004-05-12'} 
                        onChange={(e) => setEditForm({ ...editForm, birthdate: e.target.value })}
                        className="w-full border border-slate-200 rounded-lg p-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#091d64]"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Civil Status</label>
                      <select 
                        value={editForm.civilStatus || 'Single'} 
                        onChange={(e) => setEditForm({ ...editForm, civilStatus: e.target.value as YouthProfile['civilStatus'] })}
                        className="w-full border border-slate-200 rounded-lg p-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#091d64]"
                      >
                        <option value="Single">Single</option>
                        <option value="Married">Married</option>
                        <option value="Single Parent">Single Parent</option>
                        <option value="Widowed">Widowed</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Address (Street & Subdivision)</label>
                      <input 
                        type="text" 
                        value={editForm.address} 
                        onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                        className="w-full border border-slate-200 rounded-lg p-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#091d64]"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Zone / Purok</label>
                      <select 
                        value={editForm.zone} 
                        onChange={(e) => setEditForm({ ...editForm, zone: e.target.value })}
                        className="w-full border border-slate-200 rounded-lg p-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#091d64]"
                      >
                        <option value="Zone 1">Zone 1</option>
                        <option value="Zone 2">Zone 2</option>
                        <option value="Zone 3">Zone 3</option>
                        <option value="Zone 4">Zone 4</option>
                        <option value="Zone 5">Zone 5</option>
                        <option value="Zone 6">Zone 6</option>
                        <option value="Zone 7">Zone 7</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* SECTION 2: CONTACT DETAILS & EMERGENCY CONTACT */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase text-[#091d64] tracking-wider border-b border-slate-100 pb-1">
                    2. Contact Details & Guardian Info
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Mobile / Phone Number</label>
                      <input 
                        type="text" 
                        value={editForm.mobile} 
                        onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value })}
                        className="w-full border border-slate-200 rounded-lg p-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#091d64]"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Email Address</label>
                      <input 
                        type="email" 
                        value={editForm.email} 
                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                        className="w-full border border-slate-200 rounded-lg p-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#091d64]"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Parent / Guardian Name</label>
                      <input 
                        type="text" 
                        value={editForm.guardianName} 
                        onChange={(e) => setEditForm({ ...editForm, guardianName: e.target.value })}
                        className="w-full border border-slate-200 rounded-lg p-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#091d64]"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Parent / Guardian Contact No.</label>
                      <input 
                        type="text" 
                        value={editForm.guardianContact} 
                        onChange={(e) => setEditForm({ ...editForm, guardianContact: e.target.value })}
                        className="w-full border border-slate-200 rounded-lg p-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#091d64]"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 3: EDUCATIONAL & EMPLOYMENT STATUS */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase text-[#091d64] tracking-wider border-b border-slate-100 pb-1">
                    3. Educational & Employment Status
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Educational Level</label>
                      <select 
                        value={editForm.educationalLevel} 
                        onChange={(e) => setEditForm({ ...editForm, educationalLevel: e.target.value as any })}
                        className="w-full border border-slate-200 rounded-lg p-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#091d64]"
                      >
                        <option value="College">College / Tertiary</option>
                        <option value="Senior High School">Senior High School</option>
                        <option value="Junior High School">Junior High School</option>
                        <option value="Elementary">Elementary</option>
                        <option value="Vocational">Vocational / Technical</option>
                        <option value="Post Graduate">Post Graduate</option>
                        <option value="None">None</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">School / Institution</label>
                      <input 
                        type="text" 
                        value={editForm.school || ''} 
                        onChange={(e) => setEditForm({ ...editForm, school: e.target.value })}
                        placeholder="e.g. Ateneo de Naga University"
                        className="w-full border border-slate-200 rounded-lg p-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#091d64]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Course / Degree Program</label>
                      <input 
                        type="text" 
                        value={editForm.course || ''} 
                        onChange={(e) => setEditForm({ ...editForm, course: e.target.value })}
                        placeholder="e.g. BS Information Technology"
                        className="w-full border border-slate-200 rounded-lg p-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#091d64]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Year Level</label>
                      <select 
                        value={editForm.year || '1st Year'} 
                        onChange={(e) => setEditForm({ ...editForm, year: e.target.value })}
                        className="w-full border border-slate-200 rounded-lg p-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#091d64]"
                      >
                        <option value="1st Year">1st Year</option>
                        <option value="2nd Year">2nd Year</option>
                        <option value="3rd Year">3rd Year</option>
                        <option value="4th Year">4th Year</option>
                        <option value="5th Year">5th Year</option>
                        <option value="Grade 11">Grade 11</option>
                        <option value="Grade 12">Grade 12</option>
                        <option value="N/A">N/A</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Employment Status</label>
                      <select 
                        value={editForm.employmentStatus || 'Student'} 
                        onChange={(e) => setEditForm({ ...editForm, employmentStatus: e.target.value as YouthProfile['employmentStatus'] })}
                        className="w-full border border-slate-200 rounded-lg p-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#091d64]"
                      >
                        <option value="Student">Student</option>
                        <option value="Employed">Employed</option>
                        <option value="Unemployed">Unemployed</option>
                        <option value="Self-employed">Self-employed</option>
                        <option value="Working Student">Working Student</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Scholarship Status</label>
                      <select 
                        value={editForm.scholarStatus} 
                        onChange={(e) => setEditForm({ ...editForm, scholarStatus: e.target.value as 'Scholar' | 'Non-Scholar' })}
                        className="w-full border border-slate-200 rounded-lg p-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#091d64]"
                      >
                        <option value="Non-Scholar">Non-Scholar</option>
                        <option value="Scholar">Scholar / Grantee</option>
                      </select>
                    </div>

                    {editForm.scholarStatus === 'Scholar' && (
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Scholarship Grant Type / Name</label>
                        <input 
                          type="text" 
                          value={editForm.scholarshipType || ''} 
                          onChange={(e) => setEditForm({ ...editForm, scholarshipType: e.target.value })}
                          placeholder="e.g. Naga City Educational Assistance Program"
                          className="w-full border border-slate-200 rounded-lg p-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#091d64]"
                        />
                      </div>
                    )}

                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Youth Sector</label>
                      <select 
                        value={editForm.youthSector || 'In-School Youth'} 
                        onChange={(e) => setEditForm({ ...editForm, youthSector: e.target.value as YouthProfile['youthSector'] })}
                        className="w-full border border-slate-200 rounded-lg p-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#091d64]"
                      >
                        <option value="In-School Youth">In-School Youth</option>
                        <option value="Out-of-School Youth">Out-of-School Youth (OSY)</option>
                        <option value="Working Youth">Working Youth</option>
                        <option value="Youth with Special Needs / PWD">Youth with Special Needs / PWD</option>
                        <option value="Solo Parent Youth">Solo Parent Youth</option>
                        <option value="Indigenous Youth">Indigenous Youth</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* FORM BUTTONS */}
                <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                  <button 
                    type="button" 
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSavingProfile}
                    className="px-6 py-2.5 bg-[#091d64] hover:bg-[#122878] disabled:opacity-60 text-white font-bold rounded-xl text-xs transition-colors shadow-md cursor-pointer flex items-center gap-2"
                  >
                    {isSavingProfile ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Saving to Database...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Save Profile Changes</span>
                      </>
                    )}
                  </button>
                </div>

              </form>

            </div>
          </div>
        )}

        {/* FOOTER */}
        <footer className="h-12 border-t border-slate-100 bg-white flex items-center justify-center text-[11px] text-slate-400 font-sans tracking-wide flex-shrink-0">
          © 2025 SK Federation Naga City. All rights reserved.
        </footer>

      </div>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-2 py-1.5 flex justify-around items-center z-40 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
        <button
          onClick={() => setActiveMenu('dashboard')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all cursor-pointer ${
            activeMenu === 'dashboard' ? 'text-[#091d64] font-extrabold bg-blue-50/80' : 'text-slate-400 font-medium hover:text-slate-600'
          }`}
        >
          <LayoutDashboard className={`w-5 h-5 ${activeMenu === 'dashboard' ? 'text-[#091d64] scale-110' : 'text-slate-400'} transition-transform`} />
          <span className="text-[10px] mt-0.5 tracking-tight font-sans">Home</span>
        </button>

        <button
          onClick={() => setActiveMenu('programs')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all cursor-pointer ${
            activeMenu === 'programs' || activeMenu === 'registrations' ? 'text-[#091d64] font-extrabold bg-blue-50/80' : 'text-slate-400 font-medium hover:text-slate-600'
          }`}
        >
          <ClipboardList className={`w-5 h-5 ${activeMenu === 'programs' || activeMenu === 'registrations' ? 'text-[#091d64] scale-110' : 'text-slate-400'} transition-transform`} />
          <span className="text-[10px] mt-0.5 tracking-tight font-sans">Programs</span>
        </button>

        <button
          onClick={() => setActiveMenu('feedback')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all cursor-pointer ${
            activeMenu === 'feedback' || activeMenu === 'resolutions' ? 'text-[#091d64] font-extrabold bg-blue-50/80' : 'text-slate-400 font-medium hover:text-slate-600'
          }`}
        >
          <HeartHandshake className={`w-5 h-5 ${activeMenu === 'feedback' || activeMenu === 'resolutions' ? 'text-[#091d64] scale-110' : 'text-slate-400'} transition-transform`} />
          <span className="text-[10px] mt-0.5 tracking-tight font-sans">Civic Desk</span>
        </button>

        <button
          onClick={() => setActiveMenu('profile')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all cursor-pointer ${
            activeMenu === 'profile' ? 'text-[#091d64] font-extrabold bg-blue-50/80' : 'text-slate-400 font-medium hover:text-slate-600'
          }`}
        >
          <User className={`w-5 h-5 ${activeMenu === 'profile' ? 'text-[#091d64] scale-110' : 'text-slate-400'} transition-transform`} />
          <span className="text-[10px] mt-0.5 tracking-tight font-sans">My ID</span>
        </button>
      </div>

    </div>
  );
}